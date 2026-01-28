import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { MemberSidebar } from "@/components/member/MemberSidebar";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  if (!["admin", "customer"].includes(user.role)) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950">
      <MemberSidebar />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
