import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, webhookLogs, products, entitlements, users } from "@/lib/db/schema";
import { getGateway } from "@/lib/gateways";
import type { GatewayCredentials } from "@/lib/gateways/types";
import { waitUntil } from "@vercel/functions";
import { sendSaleToUtmify } from "@/lib/utmify";
import crypto from "crypto";

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

  // Para Stripe, verificar assinatura ANTES de responder 200
  if (gatewayName === "stripe") {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (!webhookSecret || !verifyStripeSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // Log do webhook imediatamente
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

  // Responder 200 imediatamente, processar async
  waitUntil(processWebhook(gatewayName, rawBody, signature, log.id));

  return NextResponse.json({ received: true });
}

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
    const v1 = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
    if (!timestamp || !v1) return false;

    // Rejeitar timestamps com mais de 5 minutos de diferença (replay attack)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(v1));
  } catch {
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
      await grantAccess(transaction);

      // Enviar para UTMify
      sendSaleToUtmify({
        orderId: String(transaction.id),
        platform: "NexFy",
        paymentMethod: transaction.paymentMethod as "pix" | "credit_card" | "boleto",
        status: "approved",
        customerEmail: transaction.customerEmail,
        customerPhone: transaction.customerPhone || undefined,
        customerDocument: transaction.customerCpf || undefined,
        amount: Number(transaction.amount),
        approvedAt: new Date(),
        utm: {
          utm_source: transaction.utmSource || undefined,
          utm_medium: transaction.utmMedium || undefined,
          utm_campaign: transaction.utmCampaign || undefined,
          utm_content: transaction.utmContent || undefined,
          utm_term: transaction.utmTerm || undefined,
        },
      }, { userId: product.userId }).catch((err) => console.error("UTMify sync error:", err));
    }

    // Se reembolsado, revogar acesso
    if (status.status === "refunded" && transaction.status !== "refunded") {
      await db
        .update(entitlements)
        .set({ isActive: false, revokedAt: new Date() })
        .where(eq(entitlements.transactionId, transaction.id));

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
