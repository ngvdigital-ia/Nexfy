import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users, entitlements, products, transactions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Membros",
};

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = Number((session.user as any).id);
  const userRole = (session.user as any).role;

  // Buscar produtos do usuario (para filtrar membros)
  let productIds: number[] = [];
  if (userRole === "producer") {
    const userProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.userId, userId));
    productIds = userProducts.map((p) => p.id);
  }

  // Buscar membros
  let members: any[] = [];

  if (userRole === "admin") {
    // Admin ve todos os membros
    members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        productCount: sql<number>`(SELECT COUNT(DISTINCT product_id) FROM entitlements WHERE user_id = ${users.id})`,
        totalSpent: sql<number>`COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = ${users.id} AND status = 'approved'), 0)`,
      })
      .from(users)
      .where(eq(users.role, "customer"))
      .orderBy(desc(users.createdAt));
  } else if (productIds.length > 0) {
    // Producer ve apenas membros dos seus produtos
    const productIdsArray = `{${productIds.join(",")}}`;
    members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        productCount: sql<number>`(SELECT COUNT(DISTINCT product_id) FROM entitlements WHERE user_id = ${users.id} AND product_id = ANY(${productIdsArray}::int[]))`,
        totalSpent: sql<number>`COALESCE((SELECT SUM(t.amount) FROM transactions t JOIN products p ON t.product_id = p.id WHERE t.user_id = ${users.id} AND t.status = 'approved' AND p.user_id = ${userId}), 0)`,
      })
      .from(users)
      .innerJoin(entitlements, eq(users.id, entitlements.userId))
      .where(sql`${users.role} = 'customer' AND ${entitlements.productId} = ANY(${productIdsArray}::int[])`)
      .groupBy(users.id, users.name, users.email, users.createdAt)
      .orderBy(desc(users.createdAt));
  }

  // Se producer sem produtos
  if (userRole === "producer" && productIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Membros</h1>
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-gray-400">Voce ainda nao tem produtos cadastrados.</p>
          <Link
            href="/dashboard/products/new"
            className="inline-block mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Criar primeiro produto
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Membros</h1>
        <div className="text-sm text-gray-400">
          {members.length} membro{members.length !== 1 ? "s" : ""}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-gray-400">Nenhum membro encontrado.</p>
          <p className="text-gray-500 text-sm mt-2">
            Quando alguem comprar seus produtos, aparecera aqui.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Membro
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Produtos
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total Gasto
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Cadastro
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{member.name || "Sem nome"}</p>
                        <p className="text-gray-500 text-sm">{member.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                        {Number(member.productCount)} produto{Number(member.productCount) !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white">
                      R$ {Number(member.totalSpent || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {member.createdAt
                        ? new Date(member.createdAt).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/members/${member.id}`}
                        className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-800/30">
            {members.map((member) => (
              <div key={member.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-medium">{member.name || "Sem nome"}</p>
                    <p className="text-gray-500 text-sm">{member.email}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                    {Number(member.productCount)} produto{Number(member.productCount) !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-gray-400 text-sm">
                    R$ {Number(member.totalSpent || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <Link
                    href={`/dashboard/members/${member.id}`}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
