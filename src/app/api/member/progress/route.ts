import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studentProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const { lessonId, completed } = await req.json();
  if (!lessonId || typeof completed !== "boolean") {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(studentProgress)
    .where(and(eq(studentProgress.userId, userId), eq(studentProgress.lessonId, lessonId)))
    .limit(1);

  if (existing) {
    await db
      .update(studentProgress)
      .set({ completed, completedAt: completed ? new Date() : null })
      .where(eq(studentProgress.id, existing.id));
  } else {
    await db.insert(studentProgress).values({
      userId,
      lessonId,
      completed,
      completedAt: completed ? new Date() : null,
    });
  }

  return NextResponse.json({ success: true });
}
