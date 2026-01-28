"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface Coupon {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  maxUses: number | null;
  currentUses: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean | null;
  productId: number | null;
  productName: string | null;
  createdAt: Date;
}

export function CouponsClient({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();

  async function toggleActive(id: number, active: boolean) {
    await fetch(`/api/dashboard/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !active }),
    });
    router.refresh();
  }

  async function deleteCoupon(id: number) {
    if (!confirm("Excluir cupom?")) return;
    await fetch(`/api/dashboard/coupons/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Cupons</h1>
        <Link
          href="/dashboard/coupons/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Novo cupom
        </Link>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400">Nenhum cupom criado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => {
            const isExpired = c.validUntil && new Date(c.validUntil) < new Date();
            const usesExhausted = c.maxUses && (c.currentUses ?? 0) >= c.maxUses;

            return (
              <div key={c.id} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="text-white font-mono font-bold bg-gray-800 px-3 py-1 rounded-lg text-sm">
                      {c.code}
                    </code>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">
                          {c.type === "percentage" ? `${c.value}%` : `R$ ${c.value.toFixed(2)}`}
                        </span>
                        {c.productName && (
                          <span className="text-xs text-gray-500">({c.productName})</span>
                        )}
                        {!c.productName && c.productId === null && (
                          <span className="text-xs text-blue-400">Todos os produtos</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{c.currentUses ?? 0}{c.maxUses ? `/${c.maxUses}` : ""} usos</span>
                        {c.validFrom && (
                          <span>De {new Date(c.validFrom).toLocaleDateString("pt-BR")}</span>
                        )}
                        {c.validUntil && (
                          <span>Ate {new Date(c.validUntil).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isExpired && (
                      <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">Expirado</span>
                    )}
                    {usesExhausted && (
                      <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Esgotado</span>
                    )}
                    <button
                      onClick={() => toggleActive(c.id, !!c.isActive)}
                      className={`text-xs px-2 py-1 rounded-lg ${
                        c.isActive
                          ? "bg-green-500/10 text-green-400"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {c.isActive ? "Ativo" : "Inativo"}
                    </button>
                    <button
                      onClick={() => deleteCoupon(c.id)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
