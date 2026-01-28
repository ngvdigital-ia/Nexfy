import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons, products } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const { code, productHash } = await req.json();

  if (!code || !productHash) {
    return NextResponse.json({ valid: false, error: "Dados incompletos" }, { status: 400 });
  }

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.hash, productHash))
    .limit(1);

  if (!product) {
    return NextResponse.json({ valid: false, error: "Produto nao encontrado" }, { status: 404 });
  }

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, code), eq(coupons.isActive, true), eq(coupons.userId, product.userId)))
    .limit(1);

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Cupom invalido" });
  }

  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return NextResponse.json({ valid: false, error: "Cupom ainda nao esta ativo" });
  }
  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return NextResponse.json({ valid: false, error: "Cupom expirado" });
  }
  if (coupon.maxUses && (coupon.currentUses ?? 0) >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: "Cupom esgotado" });
  }
  if (coupon.productId && coupon.productId !== product.id) {
    return NextResponse.json({ valid: false, error: "Cupom nao valido para este produto" });
  }

  const price = Number(product.price);
  let discount: number;
  if (coupon.type === "percentage") {
    discount = price * (Number(coupon.value) / 100);
  } else {
    discount = Math.min(Number(coupon.value), price);
  }

  return NextResponse.json({ valid: true, discount, type: coupon.type, value: Number(coupon.value) });
}
