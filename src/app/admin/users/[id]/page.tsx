"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((data) => { setUser(data); setLoading(false); })
      .catch(() => { setError("Erro ao carregar"); setLoading(false); });
  }, [id]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const body: Record<string, any> = {
      name: form.get("name"),
      email: form.get("email"),
      role: form.get("role"),
      phone: form.get("phone") || null,
      cpfCnpj: form.get("cpfCnpj") || null,
      isActive: form.get("isActive") === "on",
    };

    const newPassword = form.get("password") as string;
    if (newPassword) body.password = newPassword;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setUser(updated);
      setSuccess("Salvo com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao salvar");
    }
  }

  if (loading) return <div className="text-gray-400 py-8 text-center">Carregando...</div>;
  if (!user) return <div className="text-red-400 py-8 text-center">Usuario nao encontrado</div>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Editar: {user.name}</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">Voltar</button>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">{success}</div>}

      <form onSubmit={handleSave} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
        <Field name="name" label="Nome" defaultValue={user.name} required />
        <Field name="email" label="Email" type="email" defaultValue={user.email} required />
        <Field name="password" label="Nova senha (deixe vazio para manter)" type="password" />
        <div>
          <label className="block text-xs text-gray-400 mb-1">Tipo</label>
          <select
            name="role"
            defaultValue={user.role}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="producer">Produtor</option>
            <option value="customer">Cliente</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Field name="phone" label="Telefone" defaultValue={user.phone || ""} />
        <Field name="cpfCnpj" label="CPF/CNPJ" defaultValue={user.cpfCnpj || ""} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="rounded border-gray-600 bg-gray-800 text-blue-600" />
          <span className="text-sm text-gray-300">Usuario ativo</span>
        </label>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
          <span>ID: {user.id}</span>
          <span>Criado: {new Date(user.createdAt).toLocaleDateString("pt-BR")}</span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
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
