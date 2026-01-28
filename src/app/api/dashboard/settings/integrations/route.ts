import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { utmfyIntegrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const [utmfy] = await db
    .select()
    .from(utmfyIntegrations)
    .where(eq(utmfyIntegrations.userId, userId))
    .limit(1);

  return NextResponse.json({ utmfy: utmfy || null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const body = await req.json();

  const [existing] = await db
    .select()
    .from(utmfyIntegrations)
    .where(eq(utmfyIntegrations.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(utmfyIntegrations)
      .set({
        apiToken: body.utmfyToken || "",
        isActive: body.utmfyActive ?? false,
      })
      .where(eq(utmfyIntegrations.id, existing.id));
  } else if (body.utmfyToken) {
    await db.insert(utmfyIntegrations).values({
      userId,
      apiToken: body.utmfyToken,
      isActive: body.utmfyActive ?? true,
    });
  }

  return NextResponse.json({ success: true });
}
