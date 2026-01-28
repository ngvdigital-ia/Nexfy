import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { courses, modules, lessons, lessonFiles, studentProgress, entitlements } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { CourseViewer } from "./CourseViewer";

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;
  const courseId = parseInt(params.courseId);

  // Get course
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) notFound();

  // Verify entitlement
  const [entitlement] = await db
    .select()
    .from(entitlements)
    .where(and(
      eq(entitlements.userId, userId),
      eq(entitlements.productId, course.productId),
      eq(entitlements.isActive, true)
    ))
    .limit(1);

  if (!entitlement) redirect("/member");

  // Get modules with lessons
  const courseModules = await db
    .select()
    .from(modules)
    .where(and(eq(modules.courseId, courseId), eq(modules.isActive, true)))
    .orderBy(asc(modules.sortOrder));

  const moduleIds = courseModules.map((m) => m.id);
  if (moduleIds.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-white mb-2">{course.name}</h2>
        <p className="text-gray-400">Este curso ainda nao possui conteudo.</p>
      </div>
    );
  }

  // Get all lessons for all modules
  const allLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.isActive, true))
    .orderBy(asc(lessons.sortOrder));

  const moduleLessons = allLessons.filter((l) => moduleIds.includes(l.moduleId));

  // Get files for all lessons
  const lessonIds = moduleLessons.map((l) => l.id);
  let allFiles: (typeof lessonFiles.$inferSelect)[] = [];
  if (lessonIds.length > 0) {
    allFiles = await db.select().from(lessonFiles);
    allFiles = allFiles.filter((f) => lessonIds.includes(f.lessonId));
  }

  // Get student progress
  const progress = await db
    .select()
    .from(studentProgress)
    .where(eq(studentProgress.userId, userId));

  const completedSet = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId)
  );

  // Build structured data
  const modulesData = courseModules.map((mod) => ({
    id: mod.id,
    name: mod.name,
    description: mod.description || "",
    lessons: moduleLessons
      .filter((l) => l.moduleId === mod.id)
      .map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description || "",
        videoUrl: l.videoUrl || "",
        content: l.content || "",
        duration: l.duration || 0,
        completed: completedSet.has(l.id),
        files: allFiles
          .filter((f) => f.lessonId === l.id)
          .map((f) => ({ id: f.id, name: f.name, url: f.url, size: f.size })),
      })),
  }));

  const totalLessons = moduleLessons.length;
  const completedLessons = moduleLessons.filter((l) => completedSet.has(l.id)).length;

  return (
    <CourseViewer
      course={{ id: course.id, name: course.name, description: course.description || "" }}
      modules={modulesData}
      totalLessons={totalLessons}
      completedLessons={completedLessons}
    />
  );
}
