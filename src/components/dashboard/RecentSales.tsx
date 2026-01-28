"use client";

interface Sale {
  id: number;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  productName: string;
}

interface Props {
  sales: Sale[];
}

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  refused: "bg-red-500/20 text-red-400",
  refunded: "bg-purple-500/20 text-purple-400",
  chargeback: "bg-red-500/20 text-red-400",
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

const methodLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartao",
  boleto: "Boleto",
};

export function RecentSales({ sales }: Props) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Vendas recentes</h3>
      <div className="space-y-3">
        {sales.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Nenhuma venda ainda</p>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                  {(sale.customerName || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {sale.customerName || sale.customerEmail || "—"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{sale.productName}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-white">R$ {sale.amount.toFixed(2)}</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[sale.status] || "bg-gray-700 text-gray-400"}`}>
                    {statusLabels[sale.status] || sale.status}
                  </span>
                  <span className="text-[10px] text-gray-500">{methodLabels[sale.paymentMethod] || sale.paymentMethod}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
