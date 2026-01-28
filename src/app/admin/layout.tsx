import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "admin") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="lg:pl-64">
        <header className="sticky top-0 z-30 h-16 hidden lg:flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-medium">Admin</span>
            <span className="text-sm text-gray-400">{session.user.name}</span>
          </div>
        </header>
        <div className="p-4 lg:p-6 mt-14 lg:mt-0">{children}</div>
      </main>
    </div>
  );
}
