"use client";

import { useState, useEffect } from "react";

export default function IntegrationsPage() {
  const [utmfyToken, setUtmfyToken] = useState("");
  const [utmfyActive, setUtmfyActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/settings/integrations")
      .then((r) => r.json())
      .then((data) => {
        if (data.utmfy) {
          setUtmfyToken(data.utmfy.apiToken || "");
          setUtmfyActive(data.utmfy.isActive ?? false);
        }
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utmfyToken, utmfyActive }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Integracoes salvas!" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Erro ao salvar" });
      }
    } catch {
      setMessage({ type: "error", text: "Erro de conexao" });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Integracoes</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm border ${
          message.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>{message.text}</div>
      )}

      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">UTMify</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-400">{utmfyActive ? "Ativo" : "Inativo"}</span>
            <input
              type="checkbox"
              checked={utmfyActive}
              onChange={(e) => setUtmfyActive(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">Envie dados de vendas automaticamente para o UTMify.</p>
        <div>
          <label className="block text-xs text-gray-400 mb-1">API Token</label>
          <input
            type="password"
            value={utmfyToken}
            onChange={(e) => setUtmfyToken(e.target.value)}
            autoComplete="off"
            placeholder="Insira seu token UTMify"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Starfy</h3>
        <p className="text-xs text-gray-500">Rastreamento de vendas via Starfy. Configure o Starfy Tracking ID diretamente no produto.</p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
      >
        {saving ? "Salvando..." : "Salvar integracoes"}
      </button>
    </div>
  );
}
