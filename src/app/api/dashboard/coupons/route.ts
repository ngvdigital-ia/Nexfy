import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  const userId = (session.user as any).id;

  const rows = await db.select().from(coupons).where(eq(coupons.userId, userId));
  return NextResponse.json({ coupons: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  if (!body.code || !body.type || body.value === undefined) {
    return NextResponse.json({ error: "Codigo, tipo e valor obrigatorios" }, { status: 400 });
  }

  try {
    const [coupon] = await db
      .insert(coupons)
      .values({
        userId,
        code: body.code.toUpperCase().trim(),
        type: body.type,
        value: String(body.value),
        maxUses: body.maxUses || null,
        productId: body.productId || null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      })
      .returning();

    return NextResponse.json(coupon);
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "Cupom ja existe com este codigo" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar cupom" }, { status: 500 });
  }
}
