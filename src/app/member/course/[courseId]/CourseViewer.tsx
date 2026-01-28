"use client";

import { useState } from "react";
import Link from "next/link";

interface LessonFile {
  id: number;
  name: string;
  url: string;
  size: number | null;
}

interface Lesson {
  id: number;
  name: string;
  description: string;
  videoUrl: string;
  content: string;
  duration: number;
  completed: boolean;
  files: LessonFile[];
}

interface Module {
  id: number;
  name: string;
  description: string;
  lessons: Lesson[];
}

interface Props {
  course: { id: number; name: string; description: string };
  modules: Module[];
  totalLessons: number;
  completedLessons: number;
}

export function CourseViewer({ course, modules, totalLessons, completedLessons }: Props) {
  const allLessons = modules.flatMap((m) => m.lessons);
  const [selectedLessonId, setSelectedLessonId] = useState<number>(allLessons[0]?.id || 0);
  const [completedIds, setCompletedIds] = useState<Set<number>>(
    new Set(allLessons.filter((l) => l.completed).map((l) => l.id))
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentLesson = allLessons.find((l) => l.id === selectedLessonId);
  const currentIndex = allLessons.findIndex((l) => l.id === selectedLessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const pct = totalLessons > 0 ? Math.round((completedIds.size / totalLessons) * 100) : 0;

  async function toggleComplete(lessonId: number) {
    const completed = !completedIds.has(lessonId);
    const newSet = new Set(completedIds);
    if (completed) newSet.add(lessonId);
    else newSet.delete(lessonId);
    setCompletedIds(newSet);

    await fetch("/api/member/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed }),
    });
  }

  function formatDuration(seconds: number) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-6 min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 bg-gray-900/50">
          <Link href="/member" className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{course.name}</h1>
            <p className="text-xs text-gray-400">{pct}% concluido - {completedIds.size}/{totalLessons} aulas</p>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Video / Content */}
        {currentLesson && (
          <div className="flex-1 overflow-y-auto">
            {currentLesson.videoUrl && (
              <div className="aspect-video bg-black">
                <iframe
                  src={currentLesson.videoUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            )}

            <div className="p-4 lg:p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{currentLesson.name}</h2>
                  {currentLesson.duration > 0 && (
                    <p className="text-sm text-gray-400 mt-1">{formatDuration(currentLesson.duration)}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleComplete(currentLesson.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                    completedIds.has(currentLesson.id)
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-emerald-500/30"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {completedIds.has(currentLesson.id) ? "Concluida" : "Marcar como concluida"}
                </button>
              </div>

              {currentLesson.description && (
                <p className="text-gray-300 text-sm">{currentLesson.description}</p>
              )}

              {currentLesson.content && (
                <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
              )}

              {/* Files */}
              {currentLesson.files.length > 0 && (
                <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Materiais</h3>
                  <div className="space-y-2">
                    {currentLesson.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{file.name}</p>
                          {file.size && <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t border-gray-800/50">
                {prevLesson ? (
                  <button
                    onClick={() => setSelectedLessonId(prevLesson.id)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {prevLesson.name}
                  </button>
                ) : <div />}
                {nextLesson ? (
                  <button
                    onClick={() => { setSelectedLessonId(nextLesson.id); }}
                    className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    {nextLesson.name}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : <div />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Module list */}
      <div
        className={`${
          sidebarOpen ? "fixed inset-0 z-50 lg:relative lg:inset-auto" : "hidden lg:block"
        } lg:w-80 lg:border-l border-gray-800/50 bg-gray-900/95 lg:bg-gray-900/50 overflow-y-auto`}
      >
        {sidebarOpen && (
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800/50">
            <span className="text-sm font-semibold text-white">Conteudo</span>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Progress bar */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progresso</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Modules & lessons */}
        <div className="divide-y divide-gray-800/50">
          {modules.map((mod) => (
            <div key={mod.id}>
              <div className="px-4 py-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{mod.name}</h4>
              </div>
              <div className="space-y-0.5 pb-2">
                {mod.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => { setSelectedLessonId(lesson.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      selectedLessonId === lesson.id
                        ? "bg-emerald-600/10 text-emerald-400"
                        : "text-gray-300 hover:bg-gray-800/50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      completedIds.has(lesson.id)
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-gray-600"
                    }`}>
                      {completedIds.has(lesson.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{lesson.name}</p>
                      {lesson.duration > 0 && (
                        <p className="text-xs text-gray-500">{formatDuration(lesson.duration)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
