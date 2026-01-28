import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, cartRecovery } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { productHash, email, name, phone } = await req.json();

    if (!productHash || !email) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.hash, productHash))
      .limit(1);

    if (!product) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    await db.insert(cartRecovery).values({
      productId: product.id,
      email,
      name: name || null,
      phone: phone || null,
      data: { productHash, timestamp: new Date().toISOString() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
