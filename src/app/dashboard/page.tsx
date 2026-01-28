import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { transactions, products } from "@/lib/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { KPICards } from "@/components/dashboard/KPICards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { RecentSales } from "@/components/dashboard/RecentSales";

export default async function DashboardPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // Datas
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Buscar IDs dos produtos do usuario
  const userProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.userId, userId));

  const productIds = userProducts.map((p) => p.id);

  if (productIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <KPICards
          kpis={[
            { label: "Receita", value: "R$ 0,00", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "Vendas", value: "0", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" },
            { label: "Produtos", value: "0", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            { label: "Ticket Medio", value: "R$ 0,00", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
          ]}
        />
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-8 text-center">
          <p className="text-gray-400 mb-4">Voce ainda nao tem produtos. Crie seu primeiro!</p>
          <a href="/dashboard/products/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            Criar produto
          </a>
        </div>
      </div>
    );
  }

  // KPIs do mes atual
  const [monthStats] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(
      and(
        sql`${transactions.productId} = ANY(${productIds})`,
        gte(transactions.createdAt, startOfMonth)
      )
    );

  // KPIs mes anterior (para comparacao)
  const [lastMonthStats] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
    })
    .from(transactions)
    .where(
      and(
        sql`${transactions.productId} = ANY(${productIds})`,
        gte(transactions.createdAt, startOfLastMonth),
        sql`${transactions.createdAt} < ${startOfMonth}`
      )
    );

  const revenue = Number(monthStats.revenue);
  const salesCount = Number(monthStats.count);
  const lastRevenue = Number(lastMonthStats.revenue);
  const lastCount = Number(lastMonthStats.count);
  const avgTicket = salesCount > 0 ? revenue / salesCount : 0;

  const revenueChange = lastRevenue > 0 ? (((revenue - lastRevenue) / lastRevenue) * 100).toFixed(0) + "%" : "";
  const countChange = lastCount > 0 ? (((salesCount - lastCount) / lastCount) * 100).toFixed(0) + "%" : "";

  // Dados do grafico (ultimos 30 dias)
  const chartData = await db
    .select({
      date: sql<string>`TO_CHAR(${transactions.createdAt}, 'DD/MM')`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
    })
    .from(transactions)
    .where(
      and(
        sql`${transactions.productId} = ANY(${productIds})`,
        gte(transactions.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`TO_CHAR(${transactions.createdAt}, 'DD/MM'), DATE(${transactions.createdAt})`)
    .orderBy(sql`DATE(${transactions.createdAt})`);

  // Vendas recentes
  const recentSalesData = await db
    .select({
      id: transactions.id,
      customerName: transactions.customerName,
      customerEmail: transactions.customerEmail,
      amount: transactions.amount,
      status: transactions.status,
      paymentMethod: transactions.paymentMethod,
      createdAt: transactions.createdAt,
      productName: products.name,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(sql`${transactions.productId} = ANY(${productIds})`)
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <KPICards
        kpis={[
          {
            label: "Receita do mes",
            value: `R$ ${revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            change: revenueChange,
            positive: revenue >= lastRevenue,
            icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
          },
          {
            label: "Vendas aprovadas",
            value: String(salesCount),
            change: countChange,
            positive: salesCount >= lastCount,
            icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z",
          },
          {
            label: "Produtos ativos",
            value: String(productIds.length),
            icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
          },
          {
            label: "Ticket medio",
            value: `R$ ${avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
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
        <div>
          <RecentSales
            sales={recentSalesData.map((s) => ({
              id: s.id,
              customerName: s.customerName,
              customerEmail: s.customerEmail,
              amount: Number(s.amount),
              status: s.status,
              paymentMethod: s.paymentMethod,
              createdAt: s.createdAt.toISOString(),
              productName: s.productName,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
