"use client";

import { useState, useEffect } from "react";

interface GatewayConfig {
  name: string;
  label: string;
  fields: { key: string; label: string; type?: string }[];
}

const gateways: GatewayConfig[] = [
  {
    name: "mercadopago",
    label: "Mercado Pago",
    fields: [{ key: "accessToken", label: "Access Token" }],
  },
  {
    name: "efi",
    label: "Efi (Gerencianet)",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password" },
      { key: "certificatePath", label: "Caminho do Certificado P12" },
      { key: "sandbox", label: "Sandbox (true/false)" },
    ],
  },
  {
    name: "pushinpay",
    label: "PushinPay",
    fields: [{ key: "apiKey", label: "API Key", type: "password" }],
  },
  {
    name: "beehive",
    label: "Beehive",
    fields: [{ key: "apiKey", label: "API Key", type: "password" }],
  },
  {
    name: "hypercash",
    label: "Hypercash",
    fields: [{ key: "apiKey", label: "API Key", type: "password" }],
  },
  {
    name: "stripe",
    label: "Stripe",
    fields: [
      { key: "secretKey", label: "Secret Key", type: "password" },
      { key: "publicKey", label: "Publishable Key" },
      { key: "webhookSecret", label: "Webhook Secret", type: "password" },
    ],
  },
];

export default function GatewaysSettingsPage() {
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/settings/gateways")
      .then((r) => r.json())
      .then((data) => setCredentials(data.credentials || {}))
      .catch(() => {});
  }, []);

  async function saveGateway(gatewayName: string) {
    setSaving(gatewayName);
    await fetch("/api/dashboard/settings/gateways", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gateway: gatewayName, credentials: credentials[gatewayName] || {} }),
    });
    setSaving(null);
    setSaved(gatewayName);
    setTimeout(() => setSaved(null), 2000);
  }

  function updateField(gateway: string, key: string, value: string) {
    setCredentials((prev) => ({
      ...prev,
      [gateway]: { ...prev[gateway], [key]: value },
    }));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Gateways de Pagamento</h1>

      {gateways.map((gw) => (
        <div key={gw.name} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">{gw.label}</h3>

          {gw.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
              <input
                type={field.type || "text"}
                value={credentials[gw.name]?.[field.key] || ""}
                onChange={(e) => updateField(gw.name, field.key, e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder={`Insira ${field.label.toLowerCase()}`}
              />
            </div>
          ))}

          <button
            onClick={() => saveGateway(gw.name)}
            disabled={saving === gw.name}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
          >
            {saving === gw.name ? "Salvando..." : saved === gw.name ? "Salvo!" : "Salvar"}
          </button>
        </div>
      ))}
    </div>
  );
}
