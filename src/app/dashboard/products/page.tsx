import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ProductsList } from "./ProductsList";

export default async function ProductsPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  const userProducts = await db
    .select()
    .from(products)
    .where(eq(products.userId, userId))
    .orderBy(desc(products.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Produtos</h1>
        <Link
          href="/dashboard/products/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Novo produto
        </Link>
      </div>

      <ProductsList
        products={userProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          hash: p.hash,
          isActive: p.isActive ?? true,
          gateway: p.gateway,
          pixEnabled: p.pixEnabled ?? true,
          cardEnabled: p.cardEnabled ?? true,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
