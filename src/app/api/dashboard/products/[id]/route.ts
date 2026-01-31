import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, parseInt(params.id)), eq(products.userId, Number(session.user.id))))
    .limit(1);

  if (!product) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const body = await req.json();
  const allowedFields = [
    "name", "description", "price", "gateway", "pixEnabled", "cardEnabled",
    "boletoEnabled", "maxInstallments", "deliveryType", "deliveryUrl",
    "deliveryEmail", "thankYouPageUrl", "checkoutTitle", "checkoutDescription",
    "checkoutImage", "checkoutBgColor", "checkoutButtonColor", "checkoutButtonText",
    "facebookPixelId", "facebookAccessToken", "googleAnalyticsId", "starfyEnabled", "isActive",
  ];

  const updateData: Record<string, any> = { updatedAt: new Date() };
  for (const key of allowedFields) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const [updated] = await db
    .update(products)
    .set(updateData)
    .where(and(eq(products.id, parseInt(params.id)), eq(products.userId, Number(session.user.id))))
    .returning();

  if (!updated) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  return NextResponse.json(updated);
}
