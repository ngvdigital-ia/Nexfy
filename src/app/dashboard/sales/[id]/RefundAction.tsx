"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  transactionId: number;
  amount: number;
}

export function RefundAction({ transactionId, amount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRefund() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/payments/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, reason }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      router.refresh();
      setOpen(false);
    } else {
      setError(data.error || "Erro ao processar reembolso");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors"
      >
        Reembolsar (R$ {amount.toFixed(2)})
      </button>
    );
  }

  return (
    <div className="bg-gray-900/80 border border-red-500/30 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-red-400">Confirmar reembolso</h3>
      <p className="text-xs text-gray-400">
        O valor de <strong className="text-white">R$ {amount.toFixed(2)}</strong> sera devolvido ao cliente.
      </p>
      <textarea
        placeholder="Motivo do reembolso (opcional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleRefund}
          disabled={loading}
          className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {loading ? "Processando..." : "Confirmar reembolso"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
