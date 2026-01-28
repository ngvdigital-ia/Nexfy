"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  pixCode: string;
  pixQrCode?: string;
  transactionId: number;
  amount: number;
  onApproved: () => void;
}

export function PixPayment({ pixCode, pixQrCode, transactionId, amount, onApproved }: Props) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"pending" | "approved" | "expired">("pending");
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);

  useEffect(() => {
    if (status !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?id=${transactionId}`);
        const data = await res.json();
        if (data.status === "approved") {
          setStatus("approved");
          clearInterval(interval);
          onApproved();
        } else if (data.status === "expired" || data.status === "cancelled") {
          setStatus("expired");
          clearInterval(interval);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [transactionId, status, onApproved]);

  useEffect(() => {
    if (status !== "pending") return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  }, [pixCode]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  if (status === "expired") {
    return (
      <div className="card-glow p-6 text-center">
        <div className="text-4xl mb-3">⏰</div>
        <h2 className="text-lg font-bold text-white mb-2">PIX expirado</h2>
        <p className="text-gray-400 text-sm mb-4">O tempo para pagamento esgotou.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-light)] transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="card-glow p-6 space-y-5">
      <div className="flex items-center justify-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
        </span>
        <span className="text-yellow-400 text-sm font-medium">Aguardando pagamento</span>
      </div>

      <div className="text-center">
        <p className="text-gray-400 text-xs mb-1">Pague em ate</p>
        <p className="text-2xl font-bold text-white font-mono">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 text-xs">Valor</p>
        <p className="text-xl font-bold text-white">R$ {amount.toFixed(2)}</p>
      </div>

      {pixQrCode && (
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-xl">
            <img
              src={pixQrCode.startsWith("data:") ? pixQrCode : `data:image/png;base64,${pixQrCode}`}
              alt="QR Code PIX"
              className="w-48 h-48"
            />
          </div>
        </div>
      )}

      <div>
        <p className="text-gray-400 text-xs mb-2 text-center">Ou copie o codigo PIX</p>
        <div className="relative">
          <input
            type="text"
            readOnly
            value={pixCode}
            className="w-full px-3 py-2.5 pr-20 input-glow text-xs font-mono truncate"
          />
          <button
            type="button"
            onClick={copyCode}
            className={`absolute right-1 top-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              copied
                ? "bg-[var(--cta-green)] text-white"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-light)]"
            }`}
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 font-medium">Como pagar:</p>
        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
          <li>Abra o app do seu banco</li>
          <li>Escaneie o QR Code ou cole o codigo PIX</li>
          <li>Confirme o pagamento</li>
          <li>A aprovacao e instantanea</li>
        </ol>
      </div>
    </div>
  );
}
