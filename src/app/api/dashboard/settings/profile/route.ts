import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  return NextResponse.json({
    user: { name: user.name, email: user.email, phone: user.phone },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const body = await req.json();
  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (body.name) updateData.name = body.name;
  if (body.phone !== undefined) updateData.phone = body.phone;

  if (body.currentPassword && body.newPassword) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

    const valid = await compare(body.currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }
    updateData.password = await hash(body.newPassword, 10);
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
