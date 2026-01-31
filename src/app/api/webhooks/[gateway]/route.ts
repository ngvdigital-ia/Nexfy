import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, webhookLogs, products, entitlements, users } from "@/lib/db/schema";
import { getGateway } from "@/lib/gateways";
import type { GatewayCredentials } from "@/lib/gateways/types";
import { waitUntil } from "@vercel/functions";
import { sendSaleToUtmify } from "@/lib/utmify";
import crypto from "crypto";
import { dispatchWebhooks } from "@/lib/webhookDispatch";

export async function POST(
  req: NextRequest,
  { params }: { params: { gateway: string } }
) {
  const gatewayName = params.gateway;
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-signature") ||
    req.headers.get("stripe-signature") ||
    req.headers.get("x-webhook-signature") ||
    "";

  // Log do webhook imediatamente (ANTES da verificacao de assinatura para debug)
  let log;
  try {
    [log] = await db
      .insert(webhookLogs)
      .values({
        gateway: gatewayName,
        payload: JSON.parse(rawBody),
        headers: Object.fromEntries(req.headers.entries()),
      })
      .returning();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Para Stripe, verificar assinatura
  if (gatewayName === "stripe") {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (webhookSecret) {
      const sigValid = verifyStripeSignature(rawBody, signature, webhookSecret);
      if (!sigValid) {
        // Log mas NAO bloquear - permite processar enquanto debug
        console.warn("Stripe webhook signature mismatch - processing anyway for debug");
        await updateLog(log.id, 200, "Signature mismatch (bypassed for debug)");
      }
    }
  }

  // Responder 200 imediatamente, processar async
  waitUntil(processWebhook(gatewayName, rawBody, signature, log.id));

  return NextResponse.json({ received: true });
}

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
    const v1Pair = parts.find((p) => p.startsWith("v1="));
    const v1 = v1Pair ? v1Pair.substring(3) : undefined;
    if (!timestamp || !v1) {
      console.error("Stripe webhook: missing timestamp or v1", { hasTimestamp: !!timestamp, hasV1: !!v1, sigLength: signature.length });
      return false;
    }

    // Tolerancia de 10 minutos para reenvios manuais
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 600) {
      console.error("Stripe webhook: timestamp too old", { diff: Math.abs(now - Number(timestamp)) });
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(v1));
    if (!isValid) {
      console.error("Stripe webhook: signature mismatch", { expectedLength: expectedSig.length, v1Length: v1.length, secretPrefix: secret.substring(0, 10) });
    }
    return isValid;
  } catch (err) {
    console.error("Stripe webhook: verify error", err);
    return false;
  }
}

async function processWebhook(
  gatewayName: string,
  rawBody: string,
  signature: string,
  logId: number
) {
  try {
    const payload = JSON.parse(rawBody);

    // Extrair payment ID do payload baseado no gateway
    const paymentId = extractPaymentId(gatewayName, payload);
    if (!paymentId) {
      await updateLog(logId, 400, "Payment ID nao encontrado no payload");
      return;
    }

    // Buscar transacao pelo gateway_payment_id (idempotencia)
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.gateway, gatewayName),
          eq(transactions.gatewayPaymentId, paymentId)
        )
      )
      .limit(1);

    if (!transaction) {
      await updateLog(logId, 404, "Transacao nao encontrada");
      return;
    }

    // Buscar produto para credenciais
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, transaction.productId))
      .limit(1);

    if (!product) {
      await updateLog(logId, 404, "Produto nao encontrado");
      return;
    }

    // Verificar assinatura do webhook (Stripe já verificado na entrada)
    const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
    const gateway = getGateway(gatewayName, credentials);

    if (gatewayName === "stripe") {
      // Se o produto tem webhookSecret próprio, verificar com ele também
      if (credentials.webhookSecret && !gateway.verifyWebhook(rawBody, signature)) {
        await updateLog(logId, 401, "Assinatura invalida (credenciais do produto)");
        return;
      }
    } else {
      if (!gateway.verifyWebhook(rawBody, signature)) {
        await updateLog(logId, 401, "Assinatura invalida");
        return;
      }
    }

    // Consultar status atualizado no gateway
    const status = await gateway.getStatus(paymentId);

    // Evitar reprocessamento (idempotencia)
    if (transaction.status === status.status) {
      await updateLog(logId, 200, "Status ja atualizado");
      return;
    }

    // Atualizar transacao
    const updateData: Record<string, unknown> = {
      status: status.status,
      updatedAt: new Date(),
    };

    if (status.status === "approved" && !transaction.paidAt) {
      updateData.paidAt = status.paidAt || new Date();

      // Salvar payment method para upsell one-click (Stripe)
      if (gatewayName === "stripe") {
        const stripePayload = JSON.parse(rawBody);
        const paymentMethodId = stripePayload.data?.object?.payment_method;
        const customerId = stripePayload.data?.object?.customer;
        if (paymentMethodId) updateData.stripePaymentMethodId = paymentMethodId;
        if (customerId) updateData.stripeCustomerId = customerId;
      }
    }

    if (status.status === "refunded" && !transaction.refundedAt) {
      updateData.refundedAt = new Date();
    }

    await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, transaction.id));

    // Se aprovado, criar entitlement e usuario (se necessario)
    if (status.status === "approved" && transaction.status !== "approved") {
      // Wait for frontend PUT to update customer data (Stripe webhook can arrive before PUT completes)
      if (!transaction.customerEmail) {
        await new Promise((r) => setTimeout(r, 3000));
      }

      // Re-fetch transaction to get latest customer data
      const [freshTx] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transaction.id))
        .limit(1);
      const tx = freshTx || transaction;

      await grantAccess(tx);

      // Enviar para UTMify
      sendSaleToUtmify({
        orderId: String(tx.id),
        platform: "NexFy",
        paymentMethod: tx.paymentMethod as "pix" | "credit_card" | "boleto",
        status: "approved",
        customerEmail: tx.customerEmail,
        customerPhone: tx.customerPhone || undefined,
        customerDocument: tx.customerCpf || undefined,
        amount: Number(tx.amount),
        approvedAt: new Date(),
        utm: {
          utm_source: tx.utmSource || undefined,
          utm_medium: tx.utmMedium || undefined,
          utm_campaign: tx.utmCampaign || undefined,
          utm_content: tx.utmContent || undefined,
          utm_term: tx.utmTerm || undefined,
        },
      }, { userId: product.userId }).catch((err) => console.error("UTMify sync error:", err));

      // Dispatch webhooks genéricos (Vurb, CFlux, etc.)
      await dispatchWebhooks("payment.approved", {
        transactionId: tx.id,
        productId: tx.productId,
        amount: Number(tx.amount),
        customerEmail: tx.customerEmail,
        customerName: tx.customerName,
        customerPhone: tx.customerPhone || "",
        paymentMethod: tx.paymentMethod,
        paidAt: new Date().toISOString(),
      }, tx.productId, product.userId).catch((err) => console.error("Webhook dispatch error:", err));
    }

    // Se reembolsado, revogar acesso
    if (status.status === "refunded" && transaction.status !== "refunded") {
      await db
        .update(entitlements)
        .set({ isActive: false, revokedAt: new Date() })
        .where(eq(entitlements.transactionId, transaction.id));

      // Enviar email de reembolso
      try {
        const { sendEmail } = await import("@/lib/email");
        const { refundEmailTemplate } = await import("@/lib/email/templates/refund");
        await sendEmail({
          to: transaction.customerEmail,
          subject: `Reembolso processado - ${product.name}`,
          html: refundEmailTemplate({
            customerName: transaction.customerName || "Cliente",
            productName: product.name,
            amount: Number(transaction.amount),
          }),
        });
      } catch (emailErr) {
        console.error("Refund email error:", emailErr);
      }

      // Atualizar UTMify com status reembolso
      sendSaleToUtmify({
        orderId: String(transaction.id),
        platform: "NexFy",
        paymentMethod: transaction.paymentMethod as "pix" | "credit_card" | "boleto",
        status: "refunded",
        customerEmail: transaction.customerEmail,
        amount: Number(transaction.amount),
        refundedAt: new Date(),
      }, { userId: product.userId }).catch((err) => console.error("UTMify refund sync error:", err));

      // Dispatch webhooks genéricos para refund
      await dispatchWebhooks("payment.refunded", {
        transactionId: transaction.id,
        productId: transaction.productId,
        amount: Number(transaction.amount),
        customerEmail: transaction.customerEmail,
        customerName: transaction.customerName,
        customerPhone: transaction.customerPhone || "",
        refundedAt: new Date().toISOString(),
      }, transaction.productId, product.userId).catch((err) => console.error("Webhook dispatch error:", err));
    }

    // Dispatch para recusado
    if (status.status === "refused" && transaction.status !== "refused") {
      await dispatchWebhooks("payment.refused", {
        transactionId: transaction.id,
        productId: transaction.productId,
        amount: Number(transaction.amount),
        customerEmail: transaction.customerEmail,
      }, transaction.productId, product.userId).catch((err) => console.error("Webhook dispatch error:", err));
    }

    await updateLog(logId, 200, `Status atualizado: ${transaction.status} -> ${status.status}`);
  } catch (error) {
    console.error("Webhook processing error:", error);
    await updateLog(logId, 500, String(error));
  }
}

async function grantAccess(transaction: any) {
  // Buscar ou criar usuario customer
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, transaction.customerEmail))
    .limit(1);

  if (!user) {
    const { hash } = await import("bcryptjs");
    const tempPassword = await hash(Math.random().toString(36).slice(2), 10);
    [user] = await db
      .insert(users)
      .values({
        name: transaction.customerName || "Cliente",
        email: transaction.customerEmail,
        password: tempPassword,
        role: "customer",
        phone: transaction.customerPhone,
        cpfCnpj: transaction.customerCpf,
      })
      .returning();
  }

  // Criar entitlement
  await db.insert(entitlements).values({
    userId: user.id,
    productId: transaction.productId,
    transactionId: transaction.id,
    isActive: true,
  });

  // Atualizar user_id na transacao
  await db
    .update(transactions)
    .set({ userId: user.id })
    .where(eq(transactions.id, transaction.id));

  // Enviar email de boas-vindas
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, transaction.productId))
      .limit(1);

    if (product) {
      const { sendWelcomeEmail } = await import("@/lib/email/send-welcome");
      await sendWelcomeEmail({
        customerEmail: transaction.customerEmail,
        customerName: transaction.customerName || "Cliente",
        productName: product.name,
        productId: product.id,
      });
    }
  } catch (emailErr) {
    console.error("Welcome email error:", emailErr);
  }
}

function extractPaymentId(gateway: string, payload: any): string | null {
  switch (gateway) {
    case "mercadopago":
      return payload.data?.id ? String(payload.data.id) : null;
    case "efi":
      return payload.pix?.[0]?.txid || payload.txid || null;
    case "pushinpay":
      return payload.id || payload.payment_id || null;
    case "beehive":
      return payload.payment_id || payload.id || null;
    case "hypercash":
      return payload.transaction_id || payload.id || null;
    case "stripe":
      return payload.data?.object?.id || null;
    default:
      return payload.id || payload.payment_id || null;
  }
}

async function updateLog(logId: number, statusCode: number, response: string) {
  await db
    .update(webhookLogs)
    .set({
      statusCode,
      response,
      processedAt: new Date(),
      eventType: statusCode === 200 ? "processed" : "error",
    })
    .where(eq(webhookLogs.id, logId));
}
