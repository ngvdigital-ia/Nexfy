"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        phone: form.get("phone") || null,
        cpfCnpj: form.get("cpfCnpj") || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erro ao criar usuario");
      return;
    }

    router.push(`/admin/users/${data.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Novo Usuario</h1>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
        <Field name="name" label="Nome completo" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Senha" type="password" required minLength={6} />
        <div>
          <label className="block text-xs text-gray-400 mb-1">Tipo</label>
          <select
            name="role"
            required
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="producer">Produtor</option>
            <option value="customer">Cliente</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Field name="phone" label="Telefone" />
        <Field name="cpfCnpj" label="CPF/CNPJ" />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {loading ? "Criando..." : "Criar usuario"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
