import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const transactionId = req.nextUrl.searchParams.get("id");

  if (!transactionId) {
    return NextResponse.json({ error: "ID da transacao obrigatorio" }, { status: 400 });
  }

  const [transaction] = await db
    .select({
      id: transactions.id,
      status: transactions.status,
      paymentMethod: transactions.paymentMethod,
      pixCode: transactions.pixCode,
      pixQrCode: transactions.pixQrCode,
      boletoUrl: transactions.boletoUrl,
      paidAt: transactions.paidAt,
    })
    .from(transactions)
    .where(eq(transactions.id, parseInt(transactionId)))
    .limit(1);

  if (!transaction) {
    return NextResponse.json({ error: "Transacao nao encontrada" }, { status: 404 });
  }

  return NextResponse.json(transaction);
}
