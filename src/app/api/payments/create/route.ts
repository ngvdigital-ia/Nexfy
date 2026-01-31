import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, productOffers, orderBumps, coupons, transactions } from "@/lib/db/schema";
import { getGateway } from "@/lib/gateways";
import { createPaymentSchema } from "@/lib/validators/payment";
import type { GatewayCredentials } from "@/lib/gateways/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Buscar produto
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.hash, data.productHash), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Produto nao encontrado" }, { status: 404 });
    }

    // Verificar metodo de pagamento habilitado
    if (data.paymentMethod === "pix" && !product.pixEnabled) {
      return NextResponse.json({ error: "PIX nao habilitado para este produto" }, { status: 400 });
    }
    if (data.paymentMethod === "credit_card" && !product.cardEnabled) {
      return NextResponse.json({ error: "Cartao nao habilitado para este produto" }, { status: 400 });
    }
    if (data.paymentMethod === "boleto" && !product.boletoEnabled) {
      return NextResponse.json({ error: "Boleto nao habilitado para este produto" }, { status: 400 });
    }

    // Buscar oferta (se houver)
    let finalPrice = Number(product.price);
    let offerId: number | null = null;

    if (data.offerHash) {
      const [offer] = await db
        .select()
        .from(productOffers)
        .where(and(eq(productOffers.hash, data.offerHash), eq(productOffers.isActive, true)))
        .limit(1);

      if (offer) {
        finalPrice = Number(offer.price);
        offerId = offer.id;
      }
    }

    // Calcular order bumps
    let bumpTotal = 0;
    if (data.orderBumpIds?.length) {
      const bumps = await db
        .select()
        .from(orderBumps)
        .where(and(eq(orderBumps.productId, product.id), eq(orderBumps.isActive, true)));

      for (const bump of bumps) {
        if (data.orderBumpIds.includes(bump.id)) {
          bumpTotal += Number(bump.price);
        }
      }
    }

    // Aplicar cupom
    let discount = 0;
    let couponId: number | null = null;

    if (data.couponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.code, data.couponCode),
            eq(coupons.isActive, true),
            eq(coupons.userId, product.userId)
          )
        )
        .limit(1);

      if (coupon) {
        const now = new Date();
        const validFrom = coupon.validFrom ? new Date(coupon.validFrom) <= now : true;
        const validUntil = coupon.validUntil ? new Date(coupon.validUntil) >= now : true;
        const withinLimit = coupon.maxUses ? (coupon.currentUses ?? 0) < coupon.maxUses : true;
        const matchesProduct = coupon.productId ? coupon.productId === product.id : true;

        if (validFrom && validUntil && withinLimit && matchesProduct) {
          if (coupon.type === "percentage") {
            discount = finalPrice * (Number(coupon.value) / 100);
          } else {
            discount = Number(coupon.value);
          }
          couponId = coupon.id;
        }
      }
    }

    const totalAmount = Math.max(0, finalPrice - discount + bumpTotal);

    // Verificacao anti-fraude
    const { checkFraud } = await import("@/lib/anti-chargeback");
    const fraudCheck = await checkFraud({
      customerEmail: data.customer.email,
      customerCpf: data.customer.cpf,
      customerPhone: data.customer.phone || "",
      amount: totalAmount,
      paymentMethod: data.paymentMethod,
      gateway: product.gateway || "mercadopago",
    });

    if (!fraudCheck.approved) {
      return NextResponse.json(
        { error: "Pagamento nao autorizado. Verifique seus dados." },
        { status: 400 }
      );
    }

    // Criar transacao
    const [transaction] = await db
      .insert(transactions)
      .values({
        productId: product.id,
        offerId,
        couponId,
        gateway: product.gateway || "mercadopago",
        paymentMethod: data.paymentMethod,
        status: "pending",
        amount: String(totalAmount),
        discount: String(discount),
        customerName: data.customer.name,
        customerEmail: data.customer.email,
        customerPhone: data.customer.phone,
        customerCpf: (data.customer.cpf || "").replace(/\D/g, ""),
        installments: data.installments || 1,
        metadata: data.orderBumpIds?.length ? { orderBumpIds: data.orderBumpIds } : undefined,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmContent: data.utmContent,
        utmTerm: data.utmTerm,
      })
      .returning();

    // Processar pagamento no gateway
    const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
    const gateway = getGateway(product.gateway || "mercadopago", credentials);

    const result = await gateway.createPayment({
      amount: totalAmount,
      currency: product.currency || "BRL",
      paymentMethod: data.paymentMethod,
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        cpf: data.customer.cpf || "",
        phone: data.customer.phone,
      },
      card: data.card,
      cardToken: data.cardToken,
      installments: data.installments,
      description: product.name,
      externalRef: String(transaction.id),
    });

    // Atualizar transacao com resultado
    const updateData: Record<string, unknown> = {
      gatewayPaymentId: result.gatewayPaymentId,
      status: result.status === "approved" ? "approved" : result.status === "refused" ? "refused" : "pending",
      pixCode: result.pixCode,
      pixQrCode: result.pixQrCode,
      boletoUrl: result.boletoUrl,
      boletoBarcode: result.boletoBarcode,
      cardLastFour: result.cardLastFour,
      cardBrand: result.cardBrand,
      updatedAt: new Date(),
    };

    if (result.status === "approved") {
      updateData.paidAt = new Date();
    }

    await db.update(transactions).set(updateData).where(eq(transactions.id, transaction.id));

    // Incrementar uso do cupom
    if (couponId && result.status !== "refused") {
      await db
        .update(coupons)
        .set({ currentUses: sql`${coupons.currentUses} + 1` })
        .where(eq(coupons.id, couponId));
    }

    return NextResponse.json({
      transactionId: transaction.id,
      status: result.status,
      pixCode: result.pixCode,
      pixQrCode: result.pixQrCode,
      boletoUrl: result.boletoUrl,
      boletoBarcode: result.boletoBarcode,
      error: result.error,
    });
  } catch (error) {
    console.error("Payment error:", error);

    // Mensagens amigáveis para erros de credenciais
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("accessToken obrigatorio")) {
      return NextResponse.json(
        { error: "Gateway Mercado Pago nao configurado. Contate o vendedor." },
        { status: 500 }
      );
    }
    if (errorMessage.includes("secretKey obrigatoria")) {
      return NextResponse.json(
        { error: "Gateway Stripe nao configurado. Contate o vendedor." },
        { status: 500 }
      );
    }
    if (errorMessage.includes("clientId") || errorMessage.includes("clientSecret") || errorMessage.includes("certificate")) {
      return NextResponse.json(
        { error: "Gateway Efi nao configurado corretamente. Contate o vendedor." },
        { status: 500 }
      );
    }
    if (errorMessage.includes("apiKey obrigatoria") || errorMessage.includes("apiKey obrigatorio")) {
      return NextResponse.json(
        { error: "Gateway de pagamento nao configurado. Contate o vendedor." },
        { status: 500 }
      );
    }
    if (errorMessage.includes("nao suportado")) {
      return NextResponse.json(
        { error: "Gateway de pagamento nao disponivel." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Erro interno ao processar pagamento" }, { status: 500 });
  }
}
