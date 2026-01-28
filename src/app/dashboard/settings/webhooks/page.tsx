"use client";

import { useState, useEffect } from "react";

interface Webhook {
  id: number;
  url: string;
  events: string[];
  isActive: boolean;
}

export default function WebhooksSettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["payment.approved"]);
  const [loading, setLoading] = useState(false);

  const allEvents = [
    "payment.approved",
    "payment.refused",
    "payment.refunded",
    "payment.chargeback",
    "payment.pending",
  ];

  useEffect(() => {
    fetch("/api/dashboard/settings/webhooks")
      .then((r) => r.json())
      .then((data) => setWebhooks(data.webhooks || []))
      .catch(() => {});
  }, []);

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);

    const res = await fetch("/api/dashboard/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });

    if (res.ok) {
      const data = await res.json();
      setWebhooks((prev) => [...prev, data.webhook]);
      setUrl("");
    }
    setLoading(false);
  }

  async function deleteWebhook(id: number) {
    await fetch(`/api/dashboard/settings/webhooks?id=${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Webhooks Customizados</h1>

      {/* Lista */}
      {webhooks.length > 0 && (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(wh.events || []).map((ev) => (
                    <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => deleteWebhook(wh.id)}
                className="text-red-400 hover:text-red-300 text-xs flex-shrink-0"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Novo webhook */}
      <form onSubmit={addWebhook} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Novo webhook</h3>

        <div>
          <label className="block text-xs text-gray-400 mb-1">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://seu-site.com/webhook"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Eventos</label>
          <div className="flex flex-wrap gap-2">
            {allEvents.map((ev) => (
              <label key={ev} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={events.includes(ev)}
                  onChange={(e) => {
                    if (e.target.checked) setEvents((p) => [...p, ev]);
                    else setEvents((p) => p.filter((x) => x !== ev));
                  }}
                  className="rounded border-gray-600 bg-gray-800 text-blue-600"
                />
                <span className="text-xs text-gray-300">{ev}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium"
        >
          {loading ? "Adicionando..." : "Adicionar webhook"}
        </button>
      </form>
    </div>
  );
}
