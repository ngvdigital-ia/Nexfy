"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable } from "@/components/ui/DataTable";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  productCount: number;
  revenue: number;
}

const roleLabels: Record<string, string> = { admin: "Admin", producer: "Produtor", customer: "Cliente" };
const roleColors: Record<string, string> = {
  admin: "bg-red-500/20 text-red-400",
  producer: "bg-blue-500/20 text-blue-400",
  customer: "bg-gray-700 text-gray-400",
};

export function UsersClient({ users }: { users: User[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? users.filter((u) => u.role === filter)
    : users;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="admin">Admin</option>
          <option value="producer">Produtor</option>
          <option value="customer">Cliente</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length} usuarios</span>
      </div>

      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl overflow-hidden">
        <DataTable
          data={filtered}
          onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
          columns={[
            {
              key: "name",
              label: "Nome",
              render: (u) => (
                <div>
                  <p className="text-white font-medium">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              ),
            },
            {
              key: "role",
              label: "Tipo",
              render: (u) => (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role] || "bg-gray-700 text-gray-400"}`}>
                  {roleLabels[u.role] || u.role}
                </span>
              ),
            },
            {
              key: "productCount",
              label: "Produtos",
              render: (u) => <span className="text-gray-300">{u.productCount}</span>,
            },
            {
              key: "revenue",
              label: "Receita",
              render: (u) => (
                <span className="text-white font-medium">
                  R$ {u.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              ),
            },
            {
              key: "isActive",
              label: "Status",
              render: (u) => (
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {u.isActive ? "Ativo" : "Inativo"}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "Criado em",
              render: (u) => <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
}
