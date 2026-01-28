"use client";

import Link from "next/link";

interface CourseItem {
  id: number;
  name: string;
  description: string;
  thumbnail: string;
  productName: string;
  totalLessons: number;
  completedLessons: number;
}

export function MemberCoursesClient({ courses }: { courses: CourseItem[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Meus Cursos</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => {
          const pct = course.totalLessons > 0
            ? Math.round((course.completedLessons / course.totalLessons) * 100)
            : 0;

          return (
            <Link
              key={course.id}
              href={`/member/course/${course.id}`}
              className="bg-gray-900/80 border border-gray-800/50 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-colors group"
            >
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-emerald-900/40 to-gray-800 flex items-center justify-center">
                  <svg className="w-12 h-12 text-emerald-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-emerald-400 mb-1">{course.productName}</p>
                  <h3 className="text-white font-semibold group-hover:text-emerald-400 transition-colors">{course.name}</h3>
                  {course.description && (
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{course.description}</p>
                  )}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{course.completedLessons}/{course.totalLessons} aulas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
