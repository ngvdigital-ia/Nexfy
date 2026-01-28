import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { transactions, products, refunds } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RefundAction } from "./RefundAction";

const statusLabels: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  refused: "Recusado",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  refused: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  chargeback: "bg-red-600/20 text-red-500 border-red-600/30",
};

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = Number(session!.user.id);
  const txId = parseInt(params.id);

  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, txId))
    .limit(1);

  if (!tx) notFound();

  // Verificar que o produto pertence ao usuario
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, tx.productId), eq(products.userId, userId)))
    .limit(1);

  if (!product) notFound();

  // Buscar reembolsos
  const txRefunds = await db
    .select()
    .from(refunds)
    .where(eq(refunds.transactionId, txId));

  const rows: { label: string; value: string }[] = [
    { label: "ID", value: `#${tx.id}` },
    { label: "Produto", value: product.name },
    { label: "Cliente", value: tx.customerName || "—" },
    { label: "Email", value: tx.customerEmail || "—" },
    { label: "CPF", value: tx.customerCpf || "—" },
    { label: "Telefone", value: tx.customerPhone || "—" },
    { label: "Valor", value: `R$ ${Number(tx.amount).toFixed(2)}` },
    { label: "Desconto", value: `R$ ${Number(tx.discount).toFixed(2)}` },
    { label: "Gateway", value: tx.gateway },
    { label: "ID Gateway", value: tx.gatewayPaymentId || "—" },
    { label: "Metodo", value: tx.paymentMethod === "pix" ? "PIX" : tx.paymentMethod === "credit_card" ? "Cartao" : "Boleto" },
    { label: "Parcelas", value: String(tx.installments || 1) },
    { label: "Cartao", value: tx.cardLastFour ? `**** ${tx.cardLastFour} (${tx.cardBrand})` : "—" },
    { label: "Criado em", value: tx.createdAt.toLocaleString("pt-BR") },
    { label: "Pago em", value: tx.paidAt ? tx.paidAt.toLocaleString("pt-BR") : "—" },
  ];

  // UTMs
  const utms = [
    { label: "Source", value: tx.utmSource },
    { label: "Medium", value: tx.utmMedium },
    { label: "Campaign", value: tx.utmCampaign },
    { label: "Content", value: tx.utmContent },
    { label: "Term", value: tx.utmTerm },
  ].filter((u) => u.value);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Venda #{tx.id}</h1>
        <span className={`text-sm px-3 py-1 rounded-full border ${statusColors[tx.status] || "bg-gray-700 text-gray-400 border-gray-600"}`}>
          {statusLabels[tx.status] || tx.status}
        </span>
      </div>

      {/* Detalhes */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-gray-400">{r.label}</span>
              <span className="text-white">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* UTMs */}
      {utms.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">UTM Tracking</h3>
          <div className="space-y-2">
            {utms.map((u) => (
              <div key={u.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{u.label}</span>
                <span className="text-white">{u.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reembolsos */}
      {txRefunds.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Reembolsos</h3>
          <div className="space-y-2">
            {txRefunds.map((r) => (
              <div key={r.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-white">R$ {Number(r.amount).toFixed(2)}</span>
                  {r.reason && <span className="text-gray-500 ml-2">- {r.reason}</span>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {r.status === "approved" ? "Aprovado" : r.status === "refused" ? "Recusado" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acao de reembolso */}
      {tx.status === "approved" && (
        <RefundAction transactionId={tx.id} amount={Number(tx.amount)} />
      )}
    </div>
  );
}
