import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (!["admin", "producer"].includes(role)) redirect("/login");

  return (
    <div className="min-h-screen bg-black">
      <Sidebar />
      <main className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 hidden lg:flex items-center justify-between px-6 bg-black/80 backdrop-blur-xl border-b border-[rgba(139,92,246,0.1)]">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{session.user.name}</span>
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 border border-[rgba(139,92,246,0.3)] flex items-center justify-center text-xs font-bold text-[var(--accent-light)]">
              {(session.user.name || "U")[0].toUpperCase()}
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-6 mt-14 lg:mt-0">{children}</div>
      </main>
    </div>
  );
}
