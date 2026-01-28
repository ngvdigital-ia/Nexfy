"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";

interface Sale {
  id: number;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  discount: number;
  status: string;
  paymentMethod: string;
  gateway: string;
  installments: number | null;
  createdAt: string;
  paidAt: string | null;
  productName: string;
}

interface Props {
  sales: Sale[];
  filters: { status: string; method: string; from: string; to: string };
}

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  refused: "bg-red-500/20 text-red-400",
  refunded: "bg-purple-500/20 text-purple-400",
  chargeback: "bg-red-600/20 text-red-500",
  cancelled: "bg-gray-700 text-gray-400",
  expired: "bg-gray-700 text-gray-400",
};

const statusLabels: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  refused: "Recusado",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export function SalesClient({ sales, filters }: Props) {
  const router = useRouter();

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams();
    const newFilters = { ...filters, [key]: value };
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`/dashboard/sales?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.status}
          onChange={(e) => applyFilter("status", e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">Todos status</option>
          <option value="approved">Aprovado</option>
          <option value="pending">Pendente</option>
          <option value="refused">Recusado</option>
          <option value="refunded">Reembolsado</option>
          <option value="chargeback">Chargeback</option>
        </select>

        <select
          value={filters.method}
          onChange={(e) => applyFilter("method", e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">Todos metodos</option>
          <option value="pix">PIX</option>
          <option value="credit_card">Cartao</option>
          <option value="boleto">Boleto</option>
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(e) => applyFilter("from", e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => applyFilter("to", e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none"
        />

        {(filters.status || filters.method || filters.from || filters.to) && (
          <button
            onClick={() => router.push("/dashboard/sales")}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-lg p-3">
          <p className="text-xs text-gray-400">Total aprovado</p>
          <p className="text-lg font-bold text-green-400">
            R$ {sales.filter((s) => s.status === "approved").reduce((sum, s) => sum + s.amount, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-lg p-3">
          <p className="text-xs text-gray-400">Vendas</p>
          <p className="text-lg font-bold text-white">{sales.filter((s) => s.status === "approved").length}</p>
        </div>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-lg p-3">
          <p className="text-xs text-gray-400">Pendentes</p>
          <p className="text-lg font-bold text-yellow-400">{sales.filter((s) => s.status === "pending").length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl overflow-hidden">
        <DataTable
          data={sales}
          onRowClick={(s) => router.push(`/dashboard/sales/${s.id}`)}
          columns={[
            {
              key: "customer",
              label: "Cliente",
              render: (s) => (
                <div>
                  <p className="text-white text-sm">{s.customerName || "—"}</p>
                  <p className="text-xs text-gray-500">{s.customerEmail}</p>
                </div>
              ),
            },
            {
              key: "productName",
              label: "Produto",
              render: (s) => <span className="text-gray-300 text-sm">{s.productName}</span>,
            },
            {
              key: "amount",
              label: "Valor",
              render: (s) => <span className="text-white font-medium">R$ {s.amount.toFixed(2)}</span>,
            },
            {
              key: "paymentMethod",
              label: "Metodo",
              render: (s) => (
                <span className="text-xs text-gray-400">
                  {s.paymentMethod === "pix" ? "PIX" : s.paymentMethod === "credit_card" ? `Cartao ${s.installments}x` : "Boleto"}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (s) => (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[s.status] || "bg-gray-700 text-gray-400"}`}>
                  {statusLabels[s.status] || s.status}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "Data",
              render: (s) => (
                <span className="text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
