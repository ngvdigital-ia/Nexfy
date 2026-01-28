import { db } from "@/lib/db";
import { users, transactions, products } from "@/lib/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { UsersClient } from "./UsersClient";

export default async function AdminUsersPage() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      productCount: sql<number>`(SELECT COUNT(*) FROM products WHERE products.user_id = "users"."id")`,
      revenue: sql<number>`COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = "users"."id" AND t.status = 'approved'
      ), 0)`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Novo usuario
        </Link>
      </div>

      <UsersClient
        users={allUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive ?? true,
          createdAt: u.createdAt.toISOString(),
          productCount: Number(u.productCount),
          revenue: Number(u.revenue),
        }))}
      />
    </div>
  );
}
