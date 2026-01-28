import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartRecovery, products } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { cartRecoveryEmailTemplate } from "@/lib/email/templates/cart-recovery";

// Cron job: enviar emails de recuperacao de carrinho
// Chamar via Vercel Cron ou endpoint externo
// Processa carrinhos abandonados ha mais de 30 minutos e menos de 24h
export async function GET(req: NextRequest) {
  // Verificar secret para proteger o cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // Convert dates to ISO strings for postgres.js
  const thirtyMinAgoISO = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const twentyFourHoursAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const pendingCarts = await db
    .select({
      id: cartRecovery.id,
      email: cartRecovery.email,
      name: cartRecovery.name,
      productId: cartRecovery.productId,
      productName: products.name,
      productPrice: products.price,
      productHash: products.hash,
    })
    .from(cartRecovery)
    .innerJoin(products, eq(cartRecovery.productId, products.id))
    .where(
      and(
        eq(cartRecovery.emailSent, false),
        eq(cartRecovery.recovered, false),
        sql`${cartRecovery.createdAt} < ${thirtyMinAgoISO}::timestamp`,
        sql`${cartRecovery.createdAt} > ${twentyFourHoursAgoISO}::timestamp`
      )
    )
    .limit(50);

  let sent = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const cart of pendingCarts) {
    if (!cart.email) continue;

    const html = cartRecoveryEmailTemplate({
      customerName: cart.name || "",
      productName: cart.productName,
      productPrice: Number(cart.productPrice),
      checkoutUrl: `${appUrl}/checkout/${cart.productHash}`,
    });

    const result = await sendEmail({
      to: cart.email,
      subject: `Voce esqueceu algo - ${cart.productName}`,
      html,
    });

    if (result.success) {
      await db.update(cartRecovery).set({ emailSent: true }).where(eq(cartRecovery.id, cart.id));
      sent++;
    }
  }

  return NextResponse.json({ sent, total: pendingCarts.length });
}
