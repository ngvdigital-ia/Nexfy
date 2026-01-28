"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";

interface Product {
  id: number;
  name: string;
  price: number;
  hash: string;
  isActive: boolean;
  gateway: string | null;
  pixEnabled: boolean;
  cardEnabled: boolean;
  createdAt: string;
}

export function ProductsList({ products }: { products: Product[] }) {
  const router = useRouter();

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden">
      <DataTable
        data={products}
        keyField="id"
        onRowClick={(p) => router.push(`/dashboard/products/${p.id}`)}
        emptyMessage="Nenhum produto criado"
        columns={[
          {
            key: "name",
            label: "Produto",
            render: (p) => (
              <div>
                <p className="text-white font-medium">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.hash}</p>
              </div>
            ),
          },
          {
            key: "price",
            label: "Preco",
            render: (p) => <span className="text-white">R$ {p.price.toFixed(2)}</span>,
          },
          {
            key: "gateway",
            label: "Gateway",
            render: (p) => <span className="text-gray-400 text-xs">{p.gateway || "—"}</span>,
          },
          {
            key: "methods",
            label: "Metodos",
            render: (p) => (
              <div className="flex gap-1">
                {p.pixEnabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">PIX</span>
                )}
                {p.cardEnabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Cartao</span>
                )}
              </div>
            ),
          },
          {
            key: "isActive",
            label: "Status",
            render: (p) => (
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                {p.isActive ? "Ativo" : "Inativo"}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
