import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Gateway credentials stored as metadata on user (or a separate table)
// For simplicity, using a saas_config-like approach per user
// In production, encrypt credentials at rest

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, Number(session.user.id))).limit(1);
  if (!user) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  // Stored in user's remember_token field as JSON (temporary; should be separate table)
  // TODO: Move to dedicated gateway_credentials table
  let credentials = {};
  try {
    if (user.rememberToken) {
      const parsed = JSON.parse(user.rememberToken);
      if (parsed.gatewayCredentials) credentials = parsed.gatewayCredentials;
    }
  } catch {}

  return NextResponse.json({ credentials });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { gateway, credentials } = await req.json();
  if (!gateway) return NextResponse.json({ error: "Gateway obrigatorio" }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.id, Number(session.user.id))).limit(1);
  if (!user) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  let stored: any = {};
  try {
    if (user.rememberToken) stored = JSON.parse(user.rememberToken);
  } catch {}

  if (!stored.gatewayCredentials) stored.gatewayCredentials = {};
  stored.gatewayCredentials[gateway] = credentials;

  await db
    .update(users)
    .set({ rememberToken: JSON.stringify(stored) })
    .where(eq(users.id, Number(session.user.id)));

  return NextResponse.json({ success: true });
}
