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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const productId = parseInt(params.id);
  const product = await verifyProductOwnership(productId, session.user.id!);
  if (!product) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const bumps = await db
    .select()
    .from(orderBumps)
    .where(eq(orderBumps.productId, productId));

  return NextResponse.json(bumps);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const productId = parseInt(params.id);
  const product = await verifyProductOwnership(productId, session.user.id!);
  if (!product) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json();
  const { title, description, price, bumpProductId, isActive } = body;

  if (!title || !price) {
    return NextResponse.json({ error: "Titulo e preco sao obrigatorios" }, { status: 400 });
  }

  const [bump] = await db
    .insert(orderBumps)
    .values({
      productId,
      bumpProductId: bumpProductId || productId,
      title,
      description: description || null,
      price: String(price),
      isActive: isActive !== false,
    })
    .returning();

  return NextResponse.json(bump, { status: 201 });
}
