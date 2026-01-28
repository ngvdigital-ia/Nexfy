import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { entitlements, products, courses, modules, lessons, studentProgress } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  const userEntitlements = await db
    .select({ productId: entitlements.productId, productName: products.name })
    .from(entitlements)
    .innerJoin(products, eq(entitlements.productId, products.id))
    .where(and(eq(entitlements.userId, userId), eq(entitlements.isActive, true)));

  const productIds = userEntitlements.map((e) => e.productId);
  if (productIds.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-2">Meu Progresso</h1>
        <p className="text-gray-400">Nenhum curso disponivel.</p>
      </div>
    );
  }

  const userCourses = await db
    .select()
    .from(courses)
    .where(and(inArray(courses.productId, productIds), eq(courses.isActive, true)));

  const courseIds = userCourses.map((c) => c.id);
  let stats: { courseId: number; total: number; completed: number }[] = [];

  if (courseIds.length > 0) {
    stats = await db
      .select({
        courseId: courses.id,
        total: sql<number>`count(distinct ${lessons.id})`,
        completed: sql<number>`count(distinct case when ${studentProgress.completed} = true then ${studentProgress.lessonId} end)`,
      })
      .from(courses)
      .innerJoin(modules, eq(modules.courseId, courses.id))
      .innerJoin(lessons, eq(lessons.moduleId, modules.id))
      .leftJoin(studentProgress, and(eq(studentProgress.lessonId, lessons.id), eq(studentProgress.userId, userId)))
      .where(inArray(courses.id, courseIds))
      .groupBy(courses.id);
  }

  const statsMap = new Map(stats.map((s) => [s.courseId, s]));
  const totalAll = stats.reduce((s, c) => s + Number(c.total), 0);
  const completedAll = stats.reduce((s, c) => s + Number(c.completed), 0);
  const overallPct = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Meu Progresso</h1>

      {/* Overall */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-6 text-center">
        <div className="relative w-24 h-24 mx-auto mb-3">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1f2937" strokeWidth="3" />
            <path
              d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray={`${overallPct}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{overallPct}%</span>
          </div>
        </div>
        <p className="text-gray-400 text-sm">{completedAll} de {totalAll} aulas concluidas</p>
      </div>

      {/* Per course */}
      <div className="space-y-3">
        {userCourses.map((course) => {
          const s = statsMap.get(course.id);
          const total = Number(s?.total || 0);
          const completed = Number(s?.completed || 0);
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const entitlement = userEntitlements.find((e) => e.productId === course.productId);

          return (
            <div key={course.id} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-emerald-400">{entitlement?.productName}</p>
                  <h3 className="text-white font-medium">{course.name}</h3>
                </div>
                <span className="text-sm font-bold text-white">{pct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{completed}/{total} aulas</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
