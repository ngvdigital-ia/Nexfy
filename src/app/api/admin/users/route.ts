import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: "Nome, email e senha obrigatorios" }, { status: 400 });
  }

  const hashedPassword = await hash(body.password, 10);

  try {
    const [user] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || "producer",
        phone: body.phone || null,
        cpfCnpj: body.cpfCnpj || null,
      })
      .returning();

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "Email ja cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar usuario" }, { status: 500 });
  }
}
