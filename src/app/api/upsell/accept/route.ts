import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  transactions,
  upsells,
  upsellTokens,
  upsellPurchases,
  products,
  entitlements,
  users,
} from "@/lib/db/schema";
import type { GatewayCredentials } from "@/lib/gateways/types";
import { toStripeAmount, type CurrencyCode } from "@/lib/currencies";
import { dispatchWebhooks } from "@/lib/webhookDispatch";
import { waitUntil } from "@vercel/functions";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/erro?msg=token_missing", req.url));
  }

  try {
    // Buscar token pendente
    const [upsellToken] = await db
      .select()
      .from(upsellTokens)
      .where(and(eq(upsellTokens.token, token), eq(upsellTokens.status, "pending")))
      .limit(1);

    if (!upsellToken) {
      return NextResponse.redirect(new URL("/erro?msg=token_invalid", req.url));
    }

    // Verificar expiração
    if (new Date() > upsellToken.expiresAt) {
      await db
        .update(upsellTokens)
        .set({ status: "expired" })
        .where(eq(upsellTokens.id, upsellToken.id));
      return NextResponse.redirect(new URL("/erro?msg=token_expired", req.url));
    }

    // Buscar transaction original (pode estar pending se webhook nao processou ainda)
    const [originalTx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, upsellToken.transactionId))
      .limit(1);

    if (!originalTx) {
      return NextResponse.redirect(new URL("/erro?msg=transaction_invalid", req.url));
    }

    // Buscar produto (usado para credentials e validacao)
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, originalTx.productId))
      .limit(1);

    if (!product) {
      return NextResponse.redirect(new URL("/erro?msg=upsell_invalid", req.url));
    }

    const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
    const secretKey = credentials.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      console.error("Upsell accept: no secretKey found for product", product.id);
      return NextResponse.redirect(new URL("/erro?msg=payment_failed", req.url));
    }

    // Se nao tem PaymentMethod salvo, pode ser que o webhook ainda nao processou.
    // Tentar buscar direto do Stripe via Payment Intent.
    let stripeCustomerId = originalTx.stripeCustomerId;
    let stripePaymentMethodId = originalTx.stripePaymentMethodId;

    if ((!stripeCustomerId || !stripePaymentMethodId) && originalTx.gatewayPaymentId) {
      const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${originalTx.gatewayPaymentId}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const pi = await piRes.json();
      if (pi.customer) stripeCustomerId = pi.customer;
      if (pi.payment_method) stripePaymentMethodId = pi.payment_method;
      // Salvar para futuras chamadas
      if (stripeCustomerId || stripePaymentMethodId) {
        await db.update(transactions).set({
          ...(stripeCustomerId && { stripeCustomerId }),
          ...(stripePaymentMethodId && { stripePaymentMethodId }),
        }).where(eq(transactions.id, originalTx.id));
      }
    }

    // Se temos PaymentMethod mas nao temos Customer, criar um e vincular
    if (!stripeCustomerId && stripePaymentMethodId) {
      const email = originalTx.customerEmail || "unknown@checkout.com";
      const createRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email,
          name: originalTx.customerName || "Cliente",
          payment_method: stripePaymentMethodId,
        }).toString(),
      });
      const newCustomer = await createRes.json();
      if (newCustomer.id) {
        stripeCustomerId = newCustomer.id;
        await db.update(transactions).set({ stripeCustomerId }).where(eq(transactions.id, originalTx.id));
      }
    }

    if (!stripeCustomerId || !stripePaymentMethodId) {
      return NextResponse.redirect(new URL("/erro?msg=no_payment_method", req.url));
    }

    // Garantir que o PaymentMethod está attached ao Customer
    try {
      await fetch(`https://api.stripe.com/v1/payment_methods/${stripePaymentMethodId}/attach`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ customer: stripeCustomerId }).toString(),
      });
    } catch {
      // Ignore - pode já estar attached
    }

    // Buscar upsell ativo
    const [upsell] = await db
      .select()
      .from(upsells)
      .where(and(eq(upsells.id, upsellToken.upsellId), eq(upsells.isActive, true)))
      .limit(1);

    if (!upsell) {
      return NextResponse.redirect(new URL("/erro?msg=upsell_invalid", req.url));
    }

    // Verificar compra duplicada
    const [existingPurchase] = await db
      .select()
      .from(upsellPurchases)
      .where(and(
        eq(upsellPurchases.transactionId, upsellToken.transactionId),
        eq(upsellPurchases.upsellId, upsellToken.upsellId),
      ))
      .limit(1);

    // Criar Payment Intent off-session
    const currency = (originalTx.currency || "usd").toLowerCase();
    const amount = Number(upsell.price);
    const stripeAmount = toStripeAmount(amount, currency.toUpperCase() as CurrencyCode);

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams([
        ["amount", String(stripeAmount)],
        ["currency", currency],
        ["customer", stripeCustomerId],
        ["payment_method", stripePaymentMethodId],
        ["confirm", "true"],
        ["off_session", "true"],
        ["description", `Upsell: ${upsell.title}`],
        ["metadata[upsell_id]", String(upsell.id)],
        ["metadata[original_transaction_id]", String(originalTx.id)],
      ]).toString(),
    });

    const intent = await stripeRes.json();

    if (intent.error) {
      console.error("Upsell Stripe error:", JSON.stringify(intent.error));
      return NextResponse.redirect(new URL("/erro?msg=payment_failed", req.url));
    }

    if (intent.status === "requires_action" || intent.status === "requires_source_action") {
      return NextResponse.redirect(new URL("/erro?msg=requires_authentication", req.url));
    }

    if (intent.status !== "succeeded") {
      return NextResponse.redirect(new URL("/erro?msg=payment_not_approved", req.url));
    }

    // Criar nova transaction
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        productId: upsell.upsellProductId,
        gateway: "stripe",
        gatewayPaymentId: intent.id,
        paymentMethod: "credit_card",
        status: "approved",
        amount: String(amount),
        discount: "0",
        currency,
        customerName: originalTx.customerName,
        customerEmail: originalTx.customerEmail,
        customerPhone: originalTx.customerPhone,
        customerCpf: originalTx.customerCpf,
        stripeCustomerId,
        stripePaymentMethodId,
        parentTransactionId: originalTx.id,
        installments: 1,
        paidAt: new Date(),
      })
      .returning();

    // Registrar upsell purchase
    await db.insert(upsellPurchases).values({
      transactionId: originalTx.id,
      upsellId: upsell.id,
      upsellTransactionId: newTransaction.id,
    });

    // Atualizar token
    await db
      .update(upsellTokens)
      .set({ status: "accepted" })
      .where(eq(upsellTokens.id, upsellToken.id));

    // Criar entitlement
    try {
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, originalTx.customerEmail))
        .limit(1);

      if (!user) {
        const { hash } = await import("bcryptjs");
        const tempPassword = await hash(Math.random().toString(36).slice(2), 10);
        [user] = await db
          .insert(users)
          .values({
            name: originalTx.customerName || "Cliente",
            email: originalTx.customerEmail,
            password: tempPassword,
            role: "customer",
            phone: originalTx.customerPhone,
            cpfCnpj: originalTx.customerCpf,
          })
          .returning();
      }

      await db.insert(entitlements).values({
        userId: user.id,
        productId: upsell.upsellProductId,
        transactionId: newTransaction.id,
        isActive: true,
      });

      await db
        .update(transactions)
        .set({ userId: user.id })
        .where(eq(transactions.id, newTransaction.id));
    } catch (entitlementErr) {
      console.error("Upsell entitlement error (non-blocking):", entitlementErr);
    }

    // Dispatch webhook para plataforma de cursos
    waitUntil(
      dispatchWebhooks("payment.approved", {
        transactionId: newTransaction.id,
        productId: upsell.upsellProductId,
        amount: Number(newTransaction.amount),
        customerEmail: originalTx.customerEmail,
        customerName: originalTx.customerName,
        customerPhone: originalTx.customerPhone || "",
        paymentMethod: "credit_card",
        paidAt: new Date().toISOString(),
        isUpsell: true,
        parentTransactionId: originalTx.id,
      }, upsell.upsellProductId, product.userId).catch((err) => console.error("Upsell accept webhook error:", err))
    );

    const redirectUrl = upsell.acceptRedirectUrl || `/obrigado/${newTransaction.id}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Upsell accept error:", errMsg, error);
    return NextResponse.redirect(new URL(`/erro?msg=payment_failed&detail=${encodeURIComponent(errMsg)}`, req.url));
  }
}
