import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const body = await req.json();
  const hash = crypto.randomBytes(16).toString("hex");

  const [product] = await db
    .insert(products)
    .values({
      userId: Number(session.user.id),
      name: body.name,
      description: body.description || null,
      price: body.price,
      hash,
      gateway: body.gateway || "mercadopago",
      pixEnabled: body.pixEnabled ?? true,
      cardEnabled: body.cardEnabled ?? true,
      boletoEnabled: body.boletoEnabled ?? false,
      maxInstallments: body.maxInstallments || 12,
      deliveryType: body.deliveryType || "none",
      deliveryUrl: body.deliveryUrl || null,
    })
    .returning();

  return NextResponse.json(product);
}
