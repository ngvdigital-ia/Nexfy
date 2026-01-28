import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { saasConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const rows = await db.select().from(saasConfig);
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value || "";
  }

  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    const strValue = String(value);
    const [existing] = await db.select().from(saasConfig).where(eq(saasConfig.key, key)).limit(1);

    if (existing) {
      await db.update(saasConfig).set({ value: strValue, updatedAt: new Date() }).where(eq(saasConfig.key, key));
    } else {
      await db.insert(saasConfig).values({ key, value: strValue });
    }
  }

  return NextResponse.json({ success: true });
}
