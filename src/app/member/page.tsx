import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { entitlements, products, courses, studentProgress, lessons, modules } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { MemberCoursesClient } from "./MemberCoursesClient";

export default async function MemberPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  // Get active entitlements with product info
  const userEntitlements = await db
    .select({
      productId: entitlements.productId,
      productName: products.name,
      productImage: products.checkoutImage,
      grantedAt: entitlements.grantedAt,
    })
    .from(entitlements)
    .innerJoin(products, eq(entitlements.productId, products.id))
    .where(and(eq(entitlements.userId, userId), eq(entitlements.isActive, true)));

  if (userEntitlements.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Nenhum curso encontrado</h2>
        <p className="text-gray-400">Voce ainda nao tem acesso a nenhum curso.</p>
      </div>
    );
  }

  const productIds = userEntitlements.map((e) => e.productId);

  // Get courses for these products
  const userCourses = await db
    .select()
    .from(courses)
    .where(and(inArray(courses.productId, productIds), eq(courses.isActive, true)));

  // Get progress for each course
  const courseIds = userCourses.map((c) => c.id);
  let progressData: { courseId: number; total: number; completed: number }[] = [];

  if (courseIds.length > 0) {
    progressData = await db
      .select({
        courseId: courses.id,
        total: sql<number>`count(distinct ${lessons.id})`,
        completed: sql<number>`count(distinct case when ${studentProgress.completed} = true then ${studentProgress.lessonId} end)`,
      })
      .from(courses)
      .innerJoin(modules, eq(modules.courseId, courses.id))
      .innerJoin(lessons, eq(lessons.moduleId, modules.id))
      .leftJoin(
        studentProgress,
        and(eq(studentProgress.lessonId, lessons.id), eq(studentProgress.userId, userId))
      )
      .where(inArray(courses.id, courseIds))
      .groupBy(courses.id);
  }

  const progressMap = new Map(progressData.map((p) => [p.courseId, p]));

  const coursesWithProgress = userCourses.map((course) => {
    const progress = progressMap.get(course.id);
    const entitlement = userEntitlements.find((e) => e.productId === course.productId);
    return {
      id: course.id,
      name: course.name,
      description: course.description || "",
      thumbnail: course.thumbnail || "",
      productName: entitlement?.productName || "",
      totalLessons: Number(progress?.total || 0),
      completedLessons: Number(progress?.completed || 0),
    };
  });

  return <MemberCoursesClient courses={coursesWithProgress} />;
}
