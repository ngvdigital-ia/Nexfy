"use client";

import { useState, useEffect } from "react";

interface PlatformConfig {
  platformName: string;
  platformLogo: string;
  supportEmail: string;
  defaultGateway: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  resendApiKey: string;
  maintenanceMode: boolean;
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<PlatformConfig>({
    platformName: "NexFy",
    platformLogo: "",
    supportEmail: "",
    defaultGateway: "mercadopago",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
    resendApiKey: "",
    maintenanceMode: false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => { if (data.config) setConfig((prev) => ({ ...prev, ...data.config })); })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSuccess("Salvo!");
    setTimeout(() => setSuccess(""), 3000);
  }

  function update(key: keyof PlatformConfig, value: string | boolean) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Configuracoes da Plataforma</h1>

      {success && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">{success}</div>}

      <form onSubmit={save} className="space-y-4">
        {/* Geral */}
        <Section title="Geral">
          <Field label="Nome da plataforma" value={config.platformName} onChange={(v) => update("platformName", v)} />
          <Field label="URL do logo" value={config.platformLogo} onChange={(v) => update("platformLogo", v)} />
          <Field label="Email de suporte" value={config.supportEmail} onChange={(v) => update("supportEmail", v)} type="email" />
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gateway padrao</label>
            <select
              value={config.defaultGateway}
              onChange={(e) => update("defaultGateway", e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none"
            >
              <option value="mercadopago">Mercado Pago</option>
              <option value="efi">Efi</option>
              <option value="pushinpay">PushinPay</option>
              <option value="beehive">Beehive</option>
              <option value="hypercash">Hypercash</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.maintenanceMode}
              onChange={(e) => update("maintenanceMode", e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-red-600"
            />
            <span className="text-sm text-red-400">Modo manutencao</span>
          </label>
        </Section>

        {/* Email */}
        <Section title="Email (Resend)">
          <Field label="Resend API Key" value={config.resendApiKey} onChange={(v) => update("resendApiKey", v)} type="password" />
          <Field label="Email remetente" value={config.smtpFrom} onChange={(v) => update("smtpFrom", v)} />
        </Section>

        {/* SMTP Custom */}
        <Section title="SMTP Customizado (opcional)">
          <Field label="Host" value={config.smtpHost} onChange={(v) => update("smtpHost", v)} placeholder="smtp.gmail.com" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Porta" value={config.smtpPort} onChange={(v) => update("smtpPort", v)} />
            <Field label="Usuario" value={config.smtpUser} onChange={(v) => update("smtpUser", v)} />
          </div>
          <Field label="Senha SMTP" value={config.smtpPassword} onChange={(v) => update("smtpPassword", v)} type="password" />
        </Section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {saving ? "Salvando..." : "Salvar configuracoes"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
