import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, products, refunds, entitlements } from "@/lib/db/schema";
import { getGateway } from "@/lib/gateways";
import { auth } from "@/lib/auth/config";
import type { GatewayCredentials } from "@/lib/gateways/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { transactionId, reason, amount } = await req.json();

  if (!transactionId) {
    return NextResponse.json({ error: "ID da transacao obrigatorio" }, { status: 400 });
  }

  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!transaction || transaction.status !== "approved") {
    return NextResponse.json({ error: "Transacao nao encontrada ou nao aprovada" }, { status: 400 });
  }

  // Verificar permissao: admin ou dono do produto
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, transaction.productId))
    .limit(1);

  const userRole = (session.user as any).role;
  if (userRole !== "admin" && String(product.userId) !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  // Processar reembolso no gateway
  const credentials = (product.gatewayCredentials || {}) as GatewayCredentials;
  const gateway = getGateway(transaction.gateway, credentials);

  const refundAmount = amount || Number(transaction.amount);
  const result = await gateway.refund(transaction.gatewayPaymentId!, refundAmount);

  // Registrar reembolso
  await db.insert(refunds).values({
    transactionId: transaction.id,
    amount: String(refundAmount),
    reason: reason || null,
    status: result.success ? "approved" : "refused",
    gatewayRefundId: result.refundId,
    processedAt: result.success ? new Date() : null,
  });

  if (result.success) {
    // Atualizar transacao
    await db
      .update(transactions)
      .set({ status: "refunded", refundedAt: new Date(), updatedAt: new Date() })
      .where(eq(transactions.id, transaction.id));

    // Revogar entitlements
    await db
      .update(entitlements)
      .set({ isActive: false, revokedAt: new Date() })
      .where(eq(entitlements.transactionId, transaction.id));
  }

  return NextResponse.json({
    success: result.success,
    error: result.error,
  });
}
