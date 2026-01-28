import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const updateData: Record<string, any> = {};

  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.code) updateData.code = body.code.toUpperCase().trim();
  if (body.type) updateData.type = body.type;
  if (body.value !== undefined) updateData.value = String(body.value);
  if (body.maxUses !== undefined) updateData.maxUses = body.maxUses;
  if (body.productId !== undefined) updateData.productId = body.productId;
  if (body.validFrom !== undefined) updateData.validFrom = body.validFrom ? new Date(body.validFrom) : null;
  if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;

  const [updated] = await db
    .update(coupons)
    .set(updateData)
    .where(and(eq(coupons.id, parseInt(params.id)), eq(coupons.userId, userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  const userId = (session.user as any).id;

  await db.delete(coupons).where(and(eq(coupons.id, parseInt(params.id)), eq(coupons.userId, userId)));
  return NextResponse.json({ success: true });
}
