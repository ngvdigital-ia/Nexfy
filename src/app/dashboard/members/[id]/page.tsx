import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users, entitlements, products, transactions } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Detalhes do Membro",
};

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const memberId = parseInt(params.id);
  if (isNaN(memberId)) notFound();

  // Buscar membro
  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.role, "customer")))
    .limit(1);

  if (!member) notFound();

  // Buscar produtos adquiridos
  const purchasedProducts = await db
    .select({
      id: products.id,
      name: products.name,
      grantedAt: entitlements.grantedAt,
      isActive: entitlements.isActive,
    })
    .from(entitlements)
    .innerJoin(products, eq(entitlements.productId, products.id))
    .where(eq(entitlements.userId, memberId))
    .orderBy(desc(entitlements.grantedAt));

  // Buscar transacoes
  const memberTransactions = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      status: transactions.status,
      paymentMethod: transactions.paymentMethod,
      createdAt: transactions.createdAt,
      productName: products.name,
    })
    .from(transactions)
    .leftJoin(products, eq(transactions.productId, products.id))
    .where(eq(transactions.userId, memberId))
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  // Calcular totais
  const totalSpent = memberTransactions
    .filter((t) => t.status === "approved")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const statusColors: Record<string, string> = {
    approved: "bg-green-500/20 text-green-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    refused: "bg-red-500/20 text-red-400",
    refunded: "bg-gray-500/20 text-gray-400",
  };

  const statusLabels: Record<string, string> = {
    approved: "Aprovado",
    pending: "Pendente",
    refused: "Recusado",
    refunded: "Reembolsado",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/members"
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-white">Detalhes do Membro</h1>
      </div>

      {/* Info do Membro */}
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl font-bold text-purple-400">
            {(member.name || member.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{member.name || "Sem nome"}</h2>
            <p className="text-gray-400">{member.email}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Total gasto</p>
            <p className="text-2xl font-bold text-green-400">
              R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800/50">
          <div>
            <p className="text-gray-400 text-sm">Produtos</p>
            <p className="text-xl font-bold text-white">{purchasedProducts.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Transacoes</p>
            <p className="text-xl font-bold text-white">{memberTransactions.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Membro desde</p>
            <p className="text-xl font-bold text-white">
              {member.createdAt
                ? new Date(member.createdAt).toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric",
                  })
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Produtos Adquiridos */}
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Produtos Adquiridos</h3>
        {purchasedProducts.length === 0 ? (
          <p className="text-gray-400">Nenhum produto adquirido.</p>
        ) : (
          <div className="space-y-3">
            {purchasedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30"
              >
                <div>
                  <p className="text-white font-medium">{product.name}</p>
                  <p className="text-gray-500 text-sm">
                    Adquirido em{" "}
                    {product.grantedAt
                      ? new Date(product.grantedAt).toLocaleDateString("pt-BR")
                      : "-"}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {product.isActive ? "Ativo" : "Revogado"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ultimas Transacoes */}
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ultimas Transacoes</h3>
        {memberTransactions.length === 0 ? (
          <p className="text-gray-400">Nenhuma transacao encontrada.</p>
        ) : (
          <div className="space-y-3">
            {memberTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/30"
              >
                <div>
                  <p className="text-white font-medium">{tx.productName || "Produto"}</p>
                  <p className="text-gray-500 text-sm">
                    {tx.createdAt
                      ? new Date(tx.createdAt).toLocaleDateString("pt-BR")
                      : "-"}{" "}
                    • {tx.paymentMethod === "credit_card" ? "Cartao" : tx.paymentMethod?.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">
                    R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[tx.status || "pending"]
                    }`}
                  >
                    {statusLabels[tx.status || "pending"]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
