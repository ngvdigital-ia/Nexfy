import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { orderBumps, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function verifyProductOwnership(productId: number, userId: string) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, Number(userId))))
    .limit(1);
  return product;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; bumpId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const product = await verifyProductOwnership(parseInt(params.id), session.user.id!);
  if (!product) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json();
  const updateData: Record<string, any> = {};
  for (const key of ["title", "description", "price", "isActive", "bumpProductId"]) {
    if (body[key] !== undefined) updateData[key] = key === "price" ? String(body[key]) : body[key];
  }

  const [updated] = await db
    .update(orderBumps)
    .set(updateData)
    .where(and(eq(orderBumps.id, parseInt(params.bumpId)), eq(orderBumps.productId, parseInt(params.id))))
    .returning();

  if (!updated) return NextResponse.json({ error: "Bump nao encontrado" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; bumpId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const product = await verifyProductOwnership(parseInt(params.id), session.user.id!);
  if (!product) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const [deleted] = await db
    .delete(orderBumps)
    .where(and(eq(orderBumps.id, parseInt(params.bumpId)), eq(orderBumps.productId, parseInt(params.id))))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Bump nao encontrado" }, { status: 404 });

  return NextResponse.json({ success: true });
}
