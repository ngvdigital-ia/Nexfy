"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import BumpsTab from "./BumpsTab";
import UpsellsTab from "./UpsellsTab";
import CheckoutPreview from "./CheckoutPreview";

type Tab = "general" | "checkout" | "payment" | "tracking" | "bumps" | "upsells" | "preview";

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/dashboard/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar produto");
        setLoading(false);
      });
  }, [id]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    form.forEach((v, k) => {
      if (k.endsWith("Enabled")) data[k] = v === "on";
      else data[k] = v;
    });

    const res = await fetch(`/api/dashboard/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setSaving(false);
    if (res.ok) {
      setSuccess("Salvo com sucesso!");
      const updated = await res.json();
      setProduct(updated);
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const err = await res.json();
      setError(err.error || "Erro ao salvar");
    }
  }

  if (loading) {
    return <div className="text-gray-400 py-8 text-center">Carregando...</div>;
  }

  if (!product) {
    return <div className="text-red-400 py-8 text-center">Produto nao encontrado</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: "Geral" },
    { key: "checkout", label: "Checkout" },
    { key: "payment", label: "Pagamento" },
    { key: "tracking", label: "Tracking" },
    { key: "bumps", label: "Order Bumps" },
    { key: "upsells", label: "Upsells" },
    { key: "preview", label: "Preview" },
  ];

  const checkoutUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/${product.hash}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{product.name}</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">
          Voltar
        </button>
      </div>

      {/* Link de checkout */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-3 flex items-center gap-2">
        <span className="text-xs text-gray-400 flex-shrink-0">Link:</span>
        <code className="text-xs text-blue-400 truncate flex-1">{checkoutUrl}</code>
        <button
          onClick={() => navigator.clipboard.writeText(checkoutUrl)}
          className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 flex-shrink-0"
        >
          Copiar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex-shrink-0 ${
              tab === t.key ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">{success}</div>}

      <form onSubmit={save} className="space-y-4">
        {tab === "general" && (
          <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
            <Field label="Nome" name="name" defaultValue={product.name} required />
            <FieldTextarea label="Descricao" name="description" defaultValue={product.description || ""} />
            <Field label="Preco (R$)" name="price" type="number" step="0.01" defaultValue={product.price} required />
            <SelectField
              label="Tipo de entrega"
              name="deliveryType"
              defaultValue={product.deliveryType || "none"}
              options={[
                { value: "url", label: "Link externo" },
                { value: "member_area", label: "Area de membros" },
                { value: "email", label: "Email" },
                { value: "none", label: "Sem entrega" },
              ]}
            />
            <Field label="URL de entrega" name="deliveryUrl" defaultValue={product.deliveryUrl || ""} />
            <Field label="URL pagina obrigado (custom)" name="thankYouPageUrl" defaultValue={product.thankYouPageUrl || ""} />
            <CheckboxField label="Produto ativo" name="isActive" defaultChecked={product.isActive} />
          </div>
        )}

        {tab === "checkout" && (
          <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
            <Field label="Titulo do checkout" name="checkoutTitle" defaultValue={product.checkoutTitle || ""} />
            <FieldTextarea label="Descricao do checkout" name="checkoutDescription" defaultValue={product.checkoutDescription || ""} />
            <Field label="URL da imagem" name="checkoutImage" defaultValue={product.checkoutImage || ""} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cor de fundo" name="checkoutBgColor" type="color" defaultValue={product.checkoutBgColor || "#0a0a0a"} />
              <Field label="Cor do botao" name="checkoutButtonColor" type="color" defaultValue={product.checkoutButtonColor || "#3b82f6"} />
            </div>
            <Field label="Texto do botao" name="checkoutButtonText" defaultValue={product.checkoutButtonText || "Finalizar compra"} />
          </div>
        )}

        {tab === "payment" && (
          <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
            <SelectField
              label="Gateway"
              name="gateway"
              defaultValue={product.gateway || "mercadopago"}
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
              <CheckboxField label="PIX" name="pixEnabled" defaultChecked={product.pixEnabled} />
              <CheckboxField label="Cartao" name="cardEnabled" defaultChecked={product.cardEnabled} />
              <CheckboxField label="Boleto" name="boletoEnabled" defaultChecked={product.boletoEnabled} />
            </div>
            <SelectField
              label="Parcelas maximas"
              name="maxInstallments"
              defaultValue={String(product.maxInstallments || 12)}
              options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}x` }))}
            />
          </div>
        )}

        {tab === "tracking" && (
          <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
            <Field label="Facebook Pixel ID" name="facebookPixelId" defaultValue={product.facebookPixelId || ""} />
            <Field label="Facebook Access Token (CAPI)" name="facebookAccessToken" defaultValue={product.facebookAccessToken || ""} />
            <Field label="Google Analytics ID" name="googleAnalyticsId" defaultValue={product.googleAnalyticsId || ""} />
            <CheckboxField label="Starfy habilitado" name="starfyEnabled" defaultChecked={product.starfyEnabled} />
          </div>
        )}

        {tab === "bumps" && <BumpsTab productId={String(id)} />}

        {tab === "upsells" && <UpsellsTab productId={String(id)} />}

        {tab === "preview" && <CheckoutPreview product={product} />}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {saving ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input {...props} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none" />
    </div>
  );
}

function FieldTextarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <textarea {...props} rows={3} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none resize-none" />
    </div>
  );
}

function SelectField({ label, options, ...props }: { label: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select {...props} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" {...props} className="rounded border-gray-600 bg-gray-800 text-blue-600" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}
