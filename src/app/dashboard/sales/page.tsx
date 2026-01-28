import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { transactions, products } from "@/lib/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { SalesClient } from "./SalesClient";

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function SalesPage({ searchParams }: Props) {
  const session = await auth();
  const userId = Number(session!.user.id);

  const userProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.userId, userId));

  const productIds = userProducts.map((p) => p.id);

  if (productIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Vendas</h1>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-8 text-center">
          <p className="text-gray-400">Nenhuma venda ainda.</p>
        </div>
      </div>
    );
  }

  // Filtros
  const statusFilter = searchParams.status;
  const methodFilter = searchParams.method;
  const dateFrom = searchParams.from;
  const dateTo = searchParams.to;

  // Convert array to postgres array literal for ANY()
  const productIdsArray = `{${productIds.join(",")}}`;
  const conditions = [sql`${transactions.productId} = ANY(${productIdsArray}::int[])`];
  if (statusFilter) conditions.push(eq(transactions.status, statusFilter as any));
  if (methodFilter) conditions.push(eq(transactions.paymentMethod, methodFilter as any));
  // Convert Date to ISO string for postgres.js
  if (dateFrom) conditions.push(gte(transactions.createdAt, new Date(dateFrom).toISOString()));
  if (dateTo) conditions.push(lte(transactions.createdAt, new Date(dateTo + "T23:59:59").toISOString()));

  const sales = await db
    .select({
      id: transactions.id,
      customerName: transactions.customerName,
      customerEmail: transactions.customerEmail,
      amount: transactions.amount,
      discount: transactions.discount,
      status: transactions.status,
      paymentMethod: transactions.paymentMethod,
      gateway: transactions.gateway,
      installments: transactions.installments,
      createdAt: transactions.createdAt,
      paidAt: transactions.paidAt,
      productName: products.name,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Vendas</h1>
      <SalesClient
        sales={sales.map((s) => ({
          ...s,
          amount: Number(s.amount),
          discount: Number(s.discount),
          createdAt: s.createdAt.toISOString(),
          paidAt: s.paidAt?.toISOString() || null,
        }))}
        filters={{
          status: statusFilter || "",
          method: methodFilter || "",
          from: dateFrom || "",
          to: dateTo || "",
        }}
      />
    </div>
  );
}
