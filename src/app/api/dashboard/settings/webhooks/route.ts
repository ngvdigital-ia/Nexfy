import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const userWebhooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, Number(session.user.id)));

  return NextResponse.json({
    webhooks: userWebhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events || [],
      isActive: w.isActive,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { url, events } = await req.json();
  if (!url) return NextResponse.json({ error: "URL obrigatoria" }, { status: 400 });

  const [webhook] = await db
    .insert(webhooks)
    .values({
      userId: Number(session.user.id),
      url,
      events: events || [],
      isActive: true,
    })
    .returning();

  return NextResponse.json({
    webhook: { id: webhook.id, url: webhook.url, events: webhook.events, isActive: webhook.isActive },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

  await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, parseInt(id)), eq(webhooks.userId, Number(session.user.id))));

  return NextResponse.json({ success: true });
}
