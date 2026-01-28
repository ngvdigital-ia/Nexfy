"use client";

import { useState } from "react";

interface Props {
  productHash: string;
  onApplied: (code: string, discount: number) => void;
}

export function CouponInput({ productHash, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [message, setMessage] = useState("");

  async function validate() {
    if (!code.trim()) return;
    setLoading(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), productHash }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setStatus("valid");
        setMessage(`Cupom aplicado: -R$ ${data.discount.toFixed(2)}`);
        onApplied(code.trim(), data.discount);
      } else {
        setStatus("invalid");
        setMessage(data.error || "Cupom invalido");
      }
    } catch {
      setStatus("invalid");
      setMessage("Erro ao validar cupom");
    }

    setLoading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-[var(--accent-light)] hover:text-[var(--accent)] transition-colors"
      >
        Tem cupom de desconto?
      </button>
    );
  }

  return (
    <div className="card-glow p-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Codigo do cupom"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setStatus("idle");
          }}
          disabled={status === "valid"}
          className="flex-1 px-3 py-2 input-glow text-sm uppercase"
        />
        {status !== "valid" ? (
          <button
            type="button"
            onClick={validate}
            disabled={loading || !code.trim()}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
          >
            {loading ? "..." : "Aplicar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCode("");
              setStatus("idle");
              setMessage("");
              onApplied("", 0);
            }}
            className="px-4 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg font-medium"
          >
            Remover
          </button>
        )}
      </div>
      {message && (
        <p className={`text-xs mt-2 ${status === "valid" ? "text-[var(--cta-green)]" : "text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
