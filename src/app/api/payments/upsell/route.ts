import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, upsells, upsellPurchases, products, entitlements, users } from "@/lib/db/schema";
import type { GatewayCredentials } from "@/lib/gateways/types";
import { toStripeAmount, type CurrencyCode } from "@/lib/currencies";
import { dispatchWebhooks } from "@/lib/webhookDispatch";
import { sendSaleToUtmify } from "@/lib/utmify";
import { waitUntil } from "@vercel/functions";

export async function POST(req: NextRequest) {
  try {
    const { transactionId, upsellId } = await req.json();

    if (!transactionId || !upsellId) {
      return NextResponse.json({ error: "Missing transactionId or upsellId" }, { status: 400 });
    }

    // Buscar transaction original
    const [originalTx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!originalTx || originalTx.status !== "approved") {
      return NextResponse.json({ error: "Transaction not found or not approved" }, { status: 404 });
    }

    if (!originalTx.stripeCustomerId || !originalTx.stripePaymentMethodId) {
      return NextResponse.json({ error: "No saved payment method" }, { status: 400 });
    }

    // CORREÇÃO 2: Verificar compra duplicada
    const [existingPurchase] = await db
      .select()
      .from(upsellPurchases)
      .where(and(
        eq(upsellPurchases.transactionId, transactionId),
        eq(upsellPurchases.upsellId, upsellId)
      ))
      .limit(1);

    if (existingPurchase) {
      return NextResponse.json({
        error: "Você já adquiriu esta oferta.",
        code: "ALREADY_PURCHASED",
        redirectTo: `/obrigado/${existingPurchase.upsellTransactionId}`,
      }, { status: 400 });
    }

    // Buscar upsell
    const [upsell] = await db
      .select()
      .from(upsells)
      .where(eq(upsells.id, upsellId))
      .limit(1);

    if (!upsell || !upsell.isActive) {
      return NextResponse.json({ error: "Upsell not found" }, { status: 404 });
    }

    // CORREÇÃO 3: Validar que upsell pertence ao produto da transaction
    if (upsell.productId !== originalTx.productId) {
      return NextResponse.json({
        error: "Oferta inválida para esta compra.",
        code: "INVALID_UPSELL",
      }, { status: 400 });
    }

    // Buscar produto para credentials
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, originalTx.productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
    const secretKey = credentials.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const currency = (originalTx.currency || "usd").toLowerCase();
    const amount = Number(upsell.price);
    const stripeAmount = toStripeAmount(amount, currency.toUpperCase() as CurrencyCode);

    // Criar Payment Intent off-session (one-click)
    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams([
        ["amount", String(stripeAmount)],
        ["currency", currency],
        ["customer", originalTx.stripeCustomerId],
        ["payment_method", originalTx.stripePaymentMethodId],
        ["confirm", "true"],
        ["off_session", "true"],
        ["description", `Upsell: ${upsell.title}`],
        ["metadata[upsell_id]", String(upsell.id)],
        ["metadata[original_transaction_id]", String(originalTx.id)],
      ]).toString(),
    });

    const intent = await stripeRes.json();

    if (intent.error) {
      return NextResponse.json({ error: intent.error.message }, { status: 400 });
    }

    // CORREÇÃO 1: Tratar 3D Secure e outros status
    if (intent.status === "requires_action" || intent.status === "requires_source_action") {
      return NextResponse.json({
        error: "Seu banco requer autenticação adicional. Por favor, faça a compra manualmente.",
        code: "REQUIRES_ACTION",
      }, { status: 402 });
    }

    if (intent.status === "requires_payment_method") {
      return NextResponse.json({
        error: "O método de pagamento salvo não está mais disponível.",
        code: "PAYMENT_METHOD_INVALID",
      }, { status: 402 });
    }

    if (intent.status !== "succeeded") {
      return NextResponse.json({
        error: "Pagamento não foi aprovado. Tente novamente.",
        code: "PAYMENT_FAILED",
      }, { status: 400 });
    }

    // Criar nova transaction para o upsell
    const [upsellTx] = await db
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
        stripeCustomerId: originalTx.stripeCustomerId,
        stripePaymentMethodId: originalTx.stripePaymentMethodId,
        parentTransactionId: originalTx.id,
        installments: 1,
        paidAt: new Date(),
      })
      .returning();

    // Registrar upsell purchase
    await db.insert(upsellPurchases).values({
      transactionId: originalTx.id,
      upsellId: upsell.id,
      upsellTransactionId: upsellTx.id,
    });

    // CORREÇÃO 4: Criar entitlement imediatamente
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
        transactionId: upsellTx.id,
        isActive: true,
      });

      await db
        .update(transactions)
        .set({ userId: user.id })
        .where(eq(transactions.id, upsellTx.id));
    } catch (entitlementErr) {
      console.error("Upsell entitlement error (non-blocking):", entitlementErr);
    }

    // Enviar upsell aprovado para UTMify
    sendSaleToUtmify({
      orderId: String(upsellTx.id),
      platform: "NexFy",
      paymentMethod: "credit_card",
      status: "approved",
      customerEmail: originalTx.customerEmail,
      customerPhone: originalTx.customerPhone || undefined,
      customerDocument: originalTx.customerCpf || undefined,
      amount: Number(upsellTx.amount),
      approvedAt: new Date(),
    }, { userId: product.userId }).catch((err) => console.error("UTMify upsell sync error:", err));

    // Dispatch webhook para plataforma de cursos (usar waitUntil para não perder na Vercel)
    const webhookPromise = dispatchWebhooks("payment.approved", {
      transactionId: upsellTx.id,
      productId: upsell.upsellProductId,
      amount: Number(upsellTx.amount),
      customerEmail: originalTx.customerEmail,
      customerName: originalTx.customerName,
      customerPhone: originalTx.customerPhone || "",
      paymentMethod: "credit_card",
      paidAt: new Date().toISOString(),
      isUpsell: true,
      parentTransactionId: originalTx.id,
    }, upsell.upsellProductId, product.userId);

    waitUntil(webhookPromise.catch((err) => console.error("Upsell webhook dispatch error:", err)));

    return NextResponse.json({
      success: true,
      transactionId: upsellTx.id,
      status: "succeeded",
    });
  } catch (error) {
    console.error("Upsell payment error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
