import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="card-glow p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Bem-vindo, {user.name}!</h2>
        <p className="text-gray-400">Email: {user.email}</p>
        <p className="text-gray-400">Role: {user.role}</p>
        <p className="text-gray-400">ID: {user.id}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <a href="/dashboard/products" className="card-glow p-6 hover:border-[var(--accent)] transition-colors">
          <h3 className="text-white font-medium">Produtos</h3>
          <p className="text-gray-500 text-sm">Gerenciar seus produtos</p>
        </a>
        <a href="/dashboard/sales" className="card-glow p-6 hover:border-[var(--accent)] transition-colors">
          <h3 className="text-white font-medium">Vendas</h3>
          <p className="text-gray-500 text-sm">Ver todas as vendas</p>
        </a>
        <a href="/dashboard/coupons" className="card-glow p-6 hover:border-[var(--accent)] transition-colors">
          <h3 className="text-white font-medium">Cupons</h3>
          <p className="text-gray-500 text-sm">Gerenciar cupons</p>
        </a>
      </div>
    </div>
  );
}
