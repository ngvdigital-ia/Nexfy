"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      price: form.get("price"),
      gateway: form.get("gateway"),
      pixEnabled: form.get("pixEnabled") === "on",
      cardEnabled: form.get("cardEnabled") === "on",
      boletoEnabled: form.get("boletoEnabled") === "on",
      maxInstallments: Number(form.get("maxInstallments")) || 12,
      deliveryType: form.get("deliveryType"),
      deliveryUrl: form.get("deliveryUrl"),
    };

    const res = await fetch("/api/dashboard/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error || "Erro ao criar produto");
      return;
    }

    router.push(`/dashboard/products/${result.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Novo Produto</h1>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informacoes basicas */}
        <Section title="Informacoes basicas">
          <Input name="name" label="Nome do produto" required />
          <Textarea name="description" label="Descricao" />
          <Input name="price" label="Preco (R$)" type="number" step="0.01" min="0.01" required />
        </Section>

        {/* Pagamento */}
        <Section title="Pagamento">
          <Select
            name="gateway"
            label="Gateway"
            options={[
              { value: "mercadopago", label: "Mercado Pago" },
              { value: "efi", label: "Efi (Gerencianet)" },
              { value: "pushinpay", label: "PushinPay" },
              { value: "beehive", label: "Beehive" },
              { value: "hypercash", label: "Hypercash" },
              { value: "stripe", label: "Stripe" },
            ]}
          />
          <div className="grid grid-cols-3 gap-3">
            <Checkbox name="pixEnabled" label="PIX" defaultChecked />
            <Checkbox name="cardEnabled" label="Cartao" defaultChecked />
            <Checkbox name="boletoEnabled" label="Boleto" />
          </div>
          <Select
            name="maxInstallments"
            label="Parcelas maximas"
            options={Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1}x`,
            }))}
            defaultValue="12"
          />
        </Section>

        {/* Entrega */}
        <Section title="Entrega">
          <Select
            name="deliveryType"
            label="Tipo de entrega"
            options={[
              { value: "url", label: "Link externo" },
              { value: "member_area", label: "Area de membros" },
              { value: "email", label: "Email" },
              { value: "none", label: "Sem entrega automatica" },
            ]}
          />
          <Input name="deliveryUrl" label="URL de entrega (opcional)" />
        </Section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {loading ? "Criando..." : "Criar produto"}
        </button>
      </form>
    </div>
  );
}

// --- Helper components ---
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <textarea
        {...props}
        rows={3}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
      />
    </div>
  );
}

function Select({ label, options, ...props }: { label: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select
        {...props}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" {...props} className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}
