import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, productOffers, orderBumps, coupons, transactions } from "@/lib/db/schema";
import type { GatewayCredentials } from "@/lib/gateways/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.hash, body.productHash), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Produto nao encontrado" }, { status: 404 });
    }

    if (product.gateway !== "stripe") {
      return NextResponse.json({ error: "Este produto nao usa Stripe" }, { status: 400 });
    }

    let finalPrice = Number(product.price);

    if (body.offerHash) {
      const [offer] = await db
        .select()
        .from(productOffers)
        .where(and(eq(productOffers.hash, body.offerHash), eq(productOffers.isActive, true)))
        .limit(1);
      if (offer) finalPrice = Number(offer.price);
    }

    let bumpTotal = 0;
    if (body.orderBumpIds?.length) {
      const bumps = await db
        .select()
        .from(orderBumps)
        .where(and(eq(orderBumps.productId, product.id), eq(orderBumps.isActive, true)));
      for (const bump of bumps) {
        if (body.orderBumpIds.includes(bump.id)) bumpTotal += Number(bump.price);
      }
    }

    let discount = 0;
    let couponId: number | null = null;
    if (body.couponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, body.couponCode), eq(coupons.isActive, true), eq(coupons.userId, product.userId)))
        .limit(1);
      if (coupon) {
        const now = new Date();
        const valid = (!coupon.validFrom || new Date(coupon.validFrom) <= now) &&
          (!coupon.validUntil || new Date(coupon.validUntil) >= now) &&
          (!coupon.maxUses || (coupon.currentUses ?? 0) < coupon.maxUses) &&
          (!coupon.productId || coupon.productId === product.id);
        if (valid) {
          discount = coupon.type === "percentage" ? finalPrice * (Number(coupon.value) / 100) : Number(coupon.value);
          couponId = coupon.id;
        }
      }
    }

    const totalAmount = Math.max(0, finalPrice - discount + bumpTotal);
    const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
    const secretKey = credentials.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: "Stripe nao configurado" }, { status: 500 });
    }

    // Create Payment Intent via Stripe API
    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams([
        ["amount", String(Math.round(totalAmount * 100))],
        ["currency", (product.currency || "brl").toLowerCase()],
        ["payment_method_types[]", "card"],
        ["description", product.name],
        ["metadata[product_id]", String(product.id)],
        ["metadata[customer_email]", body.customer?.email || ""],
        ["metadata[transaction_id]", ""],
      ]).toString(),
    });

    const intent = await stripeRes.json();

    if (intent.error) {
      return NextResponse.json({ error: intent.error.message }, { status: 400 });
    }

    // Create pending transaction
    const [transaction] = await db
      .insert(transactions)
      .values({
        productId: product.id,
        couponId,
        gateway: "stripe",
        gatewayPaymentId: intent.id,
        paymentMethod: "credit_card",
        status: "pending",
        amount: String(totalAmount),
        discount: String(discount),
        customerName: body.customer?.name || "",
        customerEmail: body.customer?.email || "",
        customerPhone: body.customer?.phone || "",
        customerCpf: (body.customer?.cpf || "").replace(/\D/g, ""),
        installments: 1,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        utmContent: body.utmContent,
        utmTerm: body.utmTerm,
      })
      .returning();

    if (couponId) {
      await db.update(coupons).set({ currentUses: sql`${coupons.currentUses} + 1` }).where(eq(coupons.id, couponId));
    }

    // Atualizar metadata do PaymentIntent com transaction ID
    await fetch(`https://api.stripe.com/v1/payment_intents/${intent.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "metadata[transaction_id]": String(transaction.id),
      }).toString(),
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      transactionId: transaction.id,
      paymentIntentId: intent.id,
    });
  } catch (error) {
    console.error("Stripe intent error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
