"use client";

import { useRouter } from "next/navigation";

interface Props {
  from: string;
  to: string;
  byGateway: { gateway: string; revenue: number; count: number; refunded: number }[];
  byMethod: { method: string; revenue: number; count: number }[];
  byProduct: { productName: string; producerName: string; revenue: number; count: number }[];
  daily: { date: string; revenue: number; count: number; total: number }[];
}

const methodLabels: Record<string, string> = { pix: "PIX", credit_card: "Cartao", boleto: "Boleto" };

export function ReportsClient({ from, to, byGateway, byMethod, byProduct, daily }: Props) {
  const router = useRouter();

  const totalRevenue = byGateway.reduce((s, g) => s + g.revenue, 0);
  const totalSales = byGateway.reduce((s, g) => s + g.count, 0);

  function setRange(f: string, t: string) {
    router.push(`/admin/reports?from=${f}&to=${t}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Relatorios</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setRange(e.target.value, to)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none"
          />
          <span className="text-gray-500">ate</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setRange(from, e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">Receita no periodo</p>
        </div>
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalSales}</p>
          <p className="text-xs text-gray-400 mt-1">Vendas aprovadas</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* By gateway */}
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Por gateway</h3>
          <div className="space-y-2">
            {byGateway.map((g) => (
              <div key={g.gateway} className="flex justify-between text-sm">
                <span className="text-gray-400 capitalize">{g.gateway}</span>
                <div className="text-right">
                  <span className="text-white font-medium">R$ {g.revenue.toFixed(2)}</span>
                  <span className="text-gray-500 ml-2 text-xs">({g.count} vendas, {g.refunded} reemb.)</span>
                </div>
              </div>
            ))}
            {byGateway.length === 0 && <p className="text-gray-500 text-sm">Sem dados</p>}
          </div>
        </div>

        {/* By method */}
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Por metodo</h3>
          <div className="space-y-2">
            {byMethod.map((m) => (
              <div key={m.method} className="flex justify-between text-sm">
                <span className="text-gray-400">{methodLabels[m.method] || m.method}</span>
                <div className="text-right">
                  <span className="text-white font-medium">R$ {m.revenue.toFixed(2)}</span>
                  <span className="text-gray-500 ml-2 text-xs">({m.count})</span>
                </div>
              </div>
            ))}
            {byMethod.length === 0 && <p className="text-gray-500 text-sm">Sem dados</p>}
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Top produtos</h3>
        <div className="space-y-2">
          {byProduct.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="text-white truncate">{p.productName}</p>
                  <p className="text-xs text-gray-500">{p.producerName}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-white font-medium">R$ {p.revenue.toFixed(2)}</span>
                <span className="text-gray-500 ml-2 text-xs">({p.count})</span>
              </div>
            </div>
          ))}
          {byProduct.length === 0 && <p className="text-gray-500 text-sm">Sem dados</p>}
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Diario</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-400 py-2">Data</th>
                <th className="text-right text-xs text-gray-400 py-2">Receita</th>
                <th className="text-right text-xs text-gray-400 py-2">Aprovadas</th>
                <th className="text-right text-xs text-gray-400 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-b border-gray-800/50">
                  <td className="py-2 text-gray-300">{new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                  <td className="py-2 text-right text-white font-medium">R$ {d.revenue.toFixed(2)}</td>
                  <td className="py-2 text-right text-green-400">{d.count}</td>
                  <td className="py-2 text-right text-gray-400">{d.total}</td>
                </tr>
              ))}
              {daily.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-gray-500">Sem dados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
