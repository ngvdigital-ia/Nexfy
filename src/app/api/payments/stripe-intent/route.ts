import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, productOffers, orderBumps, coupons, transactions } from "@/lib/db/schema";
import type { GatewayCredentials } from "@/lib/gateways/types";
import { toStripeAmount, type CurrencyCode } from "@/lib/currencies";

// Moedas suportadas pelo Stripe
const VALID_CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'brl', 'mxn', 'jpy', 'chf', 'inr'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.hash, body.productHash), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.gateway !== "stripe") {
      return NextResponse.json({ error: "This product does not use Stripe" }, { status: 400 });
    }

    // Moeda do usuário (padrão: usd)
    const requestedCurrency = (body.currency || "usd").toLowerCase();
    const currency = VALID_CURRENCIES.includes(requestedCurrency) ? requestedCurrency : "usd";

    // Preço base do produto (assumindo USD)
    let basePrice = Number(product.price);

    if (body.offerHash) {
      const [offer] = await db
        .select()
        .from(productOffers)
        .where(and(eq(productOffers.hash, body.offerHash), eq(productOffers.isActive, true)))
        .limit(1);
      if (offer) basePrice = Number(offer.price);
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
          discount = coupon.type === "percentage" ? basePrice * (Number(coupon.value) / 100) : Number(coupon.value);
          couponId = coupon.id;
        }
      }
    }

    // Calcular total server-side (sempre baseado nos valores do banco)
    const exchangeRate = body.exchangeRate || 1;
    const usdTotal = Math.max(0, basePrice - discount + bumpTotal);
    const totalAmount = currency !== "usd" ? usdTotal * exchangeRate : usdTotal;

    // Converter para centavos do Stripe
    const stripeAmount = toStripeAmount(totalAmount, currency.toUpperCase() as CurrencyCode);

    const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
    const secretKey = credentials.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Buscar ou criar Stripe Customer para reuso (upsell one-click)
    let stripeCustomerId: string | undefined;
    if (body.customer?.email) {
      // Buscar customer existente
      const searchRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(body.customer.email)}'`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const searchData = await searchRes.json();
      if (searchData.data?.length > 0) {
        stripeCustomerId = searchData.data[0].id;
      } else {
        // Criar novo customer
        const createRes = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            email: body.customer.email,
            name: body.customer.name || "",
          }).toString(),
        });
        const newCustomer = await createRes.json();
        if (newCustomer.id) stripeCustomerId = newCustomer.id;
      }
    }

    // Create Payment Intent via Stripe API
    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams([
        ["amount", String(stripeAmount)],
        ["currency", currency],
        ["automatic_payment_methods[enabled]", "true"],
        ["automatic_payment_methods[allow_redirects]", "always"],
        ["description", product.name],
        ["metadata[product_id]", String(product.id)],
        ["metadata[customer_email]", body.customer?.email || ""],
        ["metadata[transaction_id]", ""],
        ["metadata[original_currency]", "usd"],
        ["metadata[display_currency]", currency],
        ["metadata[exchange_rate]", String(exchangeRate)],
        ["metadata[country]", body.country || "US"],
        ...(body.orderBumpIds?.length ? [["metadata[order_bump_ids]", body.orderBumpIds.join(",")]] : []),
        ...(stripeCustomerId ? [["customer", stripeCustomerId]] : []),
        ["setup_future_usage", "off_session"],
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
        metadata: body.orderBumpIds?.length ? { orderBumpIds: body.orderBumpIds } : null,
        stripeCustomerId: stripeCustomerId || null,
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
      currency,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Stripe intent error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentIntentId, productHash } = body;

    if (!paymentIntentId || !productHash) {
      return NextResponse.json({ error: "Missing paymentIntentId or productHash" }, { status: 400 });
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.hash, productHash), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const requestedCurrency = (body.currency || "usd").toLowerCase();
    const currency = VALID_CURRENCIES.includes(requestedCurrency) ? requestedCurrency : "usd";

    let basePrice = Number(product.price);

    if (body.offerHash) {
      const [offer] = await db
        .select()
        .from(productOffers)
        .where(and(eq(productOffers.hash, body.offerHash), eq(productOffers.isActive, true)))
        .limit(1);
      if (offer) basePrice = Number(offer.price);
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
          discount = coupon.type === "percentage" ? basePrice * (Number(coupon.value) / 100) : Number(coupon.value);
        }
      }
    }

    const exchangeRate = body.exchangeRate || 1;
    const usdTotal = Math.max(0, basePrice - discount + bumpTotal);
    const totalAmount = currency !== "usd" ? usdTotal * exchangeRate : usdTotal;

    const stripeAmount = toStripeAmount(totalAmount, currency.toUpperCase() as CurrencyCode);

    const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
    const secretKey = credentials.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Update Payment Intent amount
    const stripeRes = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams([
        ["amount", String(stripeAmount)],
        ...(body.orderBumpIds ? [["metadata[order_bump_ids]", body.orderBumpIds.join(",")]] : []),
      ]).toString(),
    });

    const intent = await stripeRes.json();

    if (intent.error) {
      return NextResponse.json({ error: intent.error.message }, { status: 400 });
    }

    // Update transaction amount
    if (intent.metadata?.transaction_id) {
      await db.update(transactions)
        .set({
          amount: String(totalAmount),
          ...(body.orderBumpIds?.length ? { metadata: { orderBumpIds: body.orderBumpIds } } : {}),
        })
        .where(eq(transactions.id, parseInt(intent.metadata.transaction_id)));
    }

    return NextResponse.json({ amount: totalAmount });
  } catch (error) {
    console.error("Stripe intent update error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT - Update customer data on transaction (called after Stripe confirms payment)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, customer } = body;

    if (!transactionId || !customer) {
      return NextResponse.json({ error: "Missing transactionId or customer" }, { status: 400 });
    }

    // Get transaction to find gatewayPaymentId and product
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const updateData: Record<string, string | null> = {
      customerName: customer.name || "",
      customerEmail: customer.email || "",
      customerPhone: (customer.phone || "").replace(/\D/g, ""),
      customerCpf: (customer.cpf || "").replace(/\D/g, ""),
    };

    // If no Stripe Customer yet and we have email, create one and attach to PI
    if (!tx.stripeCustomerId && customer.email) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, tx.productId))
        .limit(1);

      const credentials = (product?.gatewayCredentials || {}) as GatewayCredentials;
      const secretKey = credentials?.secretKey || process.env.STRIPE_SECRET_KEY;

      if (secretKey) {
        // Search or create Stripe Customer
        const searchRes = await fetch(
          `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(customer.email)}'`,
          { headers: { Authorization: `Bearer ${secretKey}` } }
        );
        const searchData = await searchRes.json();
        let stripeCustomerId = searchData.data?.[0]?.id;

        if (!stripeCustomerId) {
          const createRes = await fetch("https://api.stripe.com/v1/customers", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              email: customer.email,
              name: customer.name || "",
            }).toString(),
          });
          const newCustomer = await createRes.json();
          if (newCustomer.id) stripeCustomerId = newCustomer.id;
        }

        if (stripeCustomerId) {
          updateData.stripeCustomerId = stripeCustomerId;

          // Attach customer to existing Payment Intent
          if (tx.gatewayPaymentId) {
            await fetch(`https://api.stripe.com/v1/payment_intents/${tx.gatewayPaymentId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ customer: stripeCustomerId }).toString(),
            });
          }
        }
      }
    }

    await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, transactionId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Transaction customer update error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
