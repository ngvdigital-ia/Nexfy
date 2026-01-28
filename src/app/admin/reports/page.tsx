import { db } from "@/lib/db";
import { transactions, products, users } from "@/lib/db/schema";
import { sql, desc, eq, gte, lte, and } from "drizzle-orm";
import { ReportsClient } from "./ReportsClient";

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function ReportsPage({ searchParams }: Props) {
  const fromDate = searchParams.from
    ? new Date(searchParams.from)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate = searchParams.to
    ? new Date(searchParams.to + "T23:59:59")
    : new Date();

  // Convert dates to ISO strings for postgres.js
  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();

  // Revenue by gateway
  const byGateway = await db
    .select({
      gateway: transactions.gateway,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
      refunded: sql<number>`COUNT(CASE WHEN status = 'refunded' THEN 1 END)`,
    })
    .from(transactions)
    .where(and(gte(transactions.createdAt, fromISO), lte(transactions.createdAt, toISO)))
    .groupBy(transactions.gateway);

  // Revenue by payment method
  const byMethod = await db
    .select({
      method: transactions.paymentMethod,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
    })
    .from(transactions)
    .where(and(gte(transactions.createdAt, fromISO), lte(transactions.createdAt, toISO)))
    .groupBy(transactions.paymentMethod);

  // Revenue by product (top 20)
  const byProduct = await db
    .select({
      productName: products.name,
      producerName: users.name,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.status} = 'approved' THEN ${transactions.amount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN ${transactions.status} = 'approved' THEN 1 END)`,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .innerJoin(users, eq(products.userId, users.id))
    .where(and(gte(transactions.createdAt, fromISO), lte(transactions.createdAt, toISO)))
    .groupBy(products.name, users.name)
    .orderBy(sql`revenue DESC`)
    .limit(20);

  // Daily breakdown
  const daily = await db
    .select({
      date: sql<string>`TO_CHAR(${transactions.createdAt}, 'YYYY-MM-DD')`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      count: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(and(gte(transactions.createdAt, fromISO), lte(transactions.createdAt, toISO)))
    .groupBy(sql`TO_CHAR(${transactions.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${transactions.createdAt}, 'YYYY-MM-DD')`);

  return (
    <ReportsClient
      from={fromDate.toISOString().split("T")[0]}
      to={toDate.toISOString().split("T")[0]}
      byGateway={byGateway.map((g) => ({ ...g, revenue: Number(g.revenue), count: Number(g.count), refunded: Number(g.refunded) }))}
      byMethod={byMethod.map((m) => ({ method: m.method, revenue: Number(m.revenue), count: Number(m.count) }))}
      byProduct={byProduct.map((p) => ({ ...p, revenue: Number(p.revenue), count: Number(p.count) }))}
      daily={daily.map((d) => ({ ...d, revenue: Number(d.revenue), count: Number(d.count), total: Number(d.total) }))}
    />
  );
}
