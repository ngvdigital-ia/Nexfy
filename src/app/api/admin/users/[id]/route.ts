import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, parseInt(params.id))).limit(1);
  if (!user) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const { password, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.role) updateData.role = body.role;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.cpfCnpj !== undefined) updateData.cpfCnpj = body.cpfCnpj;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.password) updateData.password = await hash(body.password, 10);

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, parseInt(params.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const { password, ...safe } = updated;
  return NextResponse.json(safe);
}
