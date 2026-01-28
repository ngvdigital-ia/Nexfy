import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { coupons, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CouponsClient } from "./CouponsClient";

export default async function CouponsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  const userCoupons = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      type: coupons.type,
      value: coupons.value,
      maxUses: coupons.maxUses,
      currentUses: coupons.currentUses,
      validFrom: coupons.validFrom,
      validUntil: coupons.validUntil,
      isActive: coupons.isActive,
      productId: coupons.productId,
      productName: products.name,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .leftJoin(products, eq(coupons.productId, products.id))
    .where(eq(coupons.userId, userId))
    .orderBy(coupons.createdAt);

  return <CouponsClient coupons={userCoupons.map((c) => ({
    ...c,
    value: Number(c.value),
    productName: c.productName || null,
  }))} />;
}
