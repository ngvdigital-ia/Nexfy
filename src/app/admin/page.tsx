import { db } from "@/lib/db";
import { users, transactions, products } from "@/lib/db/schema";
import { sql, desc, eq, gte } from "drizzle-orm";
import { KPICards } from "@/components/dashboard/KPICards";
import { SalesChart } from "@/components/dashboard/SalesChart";

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Convert dates to ISO strings for postgres.js
  const startOfMonthISO = startOfMonth.toISOString();
  const startOfLastMonthISO = startOfLastMonth.toISOString();
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  // Global KPIs
  const [stats] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      monthRevenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' AND created_at >= ${startOfMonthISO}::timestamp THEN amount ELSE 0 END), 0)`,
      lastMonthRevenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' AND created_at >= ${startOfLastMonthISO}::timestamp AND created_at < ${startOfMonthISO}::timestamp THEN amount ELSE 0 END), 0)`,
      totalSales: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
      monthSales: sql<number>`COUNT(CASE WHEN status = 'approved' AND created_at >= ${startOfMonthISO}::timestamp THEN 1 END)`,
      pendingCount: sql<number>`COUNT(CASE WHEN status = 'pending' THEN 1 END)`,
      refundedCount: sql<number>`COUNT(CASE WHEN status = 'refunded' THEN 1 END)`,
    })
    .from(transactions);

  const [userStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      producers: sql<number>`COUNT(CASE WHEN role = 'producer' THEN 1 END)`,
      customers: sql<number>`COUNT(CASE WHEN role = 'customer' THEN 1 END)`,
      admins: sql<number>`COUNT(CASE WHEN role = 'admin' THEN 1 END)`,
    })
    .from(users);

  const [productStats] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(products);

  const monthRevenue = Number(stats.monthRevenue);
  const lastMonthRevenue = Number(stats.lastMonthRevenue);
  const revenueChange = lastMonthRevenue > 0
    ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(0) + "%"
    : "";

  // Top sellers
  const topSellers = await db
    .select({
      userId: products.userId,
      userName: users.name,
      userEmail: users.email,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.status} = 'approved' THEN ${transactions.amount} ELSE 0 END), 0)`,
      sales: sql<number>`COUNT(CASE WHEN ${transactions.status} = 'approved' THEN 1 END)`,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .innerJoin(users, eq(products.userId, users.id))
    .where(gte(transactions.createdAt, startOfMonthISO))
    .groupBy(products.userId, users.name, users.email)
    .orderBy(sql`revenue DESC`)
    .limit(10);

  // Chart data
  const chartData = await db
    .select({
      date: sql<string>`TO_CHAR(${transactions.createdAt}, 'DD/MM')`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
    })
    .from(transactions)
    .where(gte(transactions.createdAt, thirtyDaysAgoISO))
    .groupBy(sql`TO_CHAR(${transactions.createdAt}, 'DD/MM'), DATE(${transactions.createdAt})`)
    .orderBy(sql`DATE(${transactions.createdAt})`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>

      <KPICards
        kpis={[
          {
            label: "Receita do mes",
            value: `R$ ${monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            change: revenueChange,
            positive: monthRevenue >= lastMonthRevenue,
            icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
          },
          {
            label: "Receita total",
            value: `R$ ${Number(stats.totalRevenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
          },
          {
            label: "Usuarios",
            value: `${Number(userStats.total)} (${Number(userStats.producers)} prod.)`,
            icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
          },
          {
            label: "Produtos",
            value: String(Number(productStats.total)),
            icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
          },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart
            data={chartData.map((d) => ({
              date: d.date,
              revenue: Number(d.revenue),
              count: Number(d.count),
            }))}
          />
        </div>

        {/* Top sellers */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Top vendedores (mes)</h3>
          <div className="space-y-3">
            {topSellers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nenhuma venda este mes</p>
            ) : (
              topSellers.map((seller, i) => (
                <div key={seller.userId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{seller.userName}</p>
                      <p className="text-xs text-gray-500 truncate">{seller.userEmail}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">
                      R$ {Number(seller.revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">{Number(seller.sales)} vendas</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{Number(stats.totalSales)}</p>
          <p className="text-xs text-gray-400 mt-1">Vendas aprovadas</p>
        </div>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{Number(stats.pendingCount)}</p>
          <p className="text-xs text-gray-400 mt-1">Pendentes</p>
        </div>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{Number(stats.refundedCount)}</p>
          <p className="text-xs text-gray-400 mt-1">Reembolsados</p>
        </div>
      </div>
    </div>
  );
}
