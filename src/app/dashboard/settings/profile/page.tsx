"use client";

import { useState, useEffect } from "react";

export default function ProfileSettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setPhone(data.user.phone || "");
        }
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/dashboard/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setMessage({ type: "success", text: "Perfil atualizado!" });
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setMessage({ type: "error", text: data.error || "Erro ao salvar" });
    }
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Perfil</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm border ${
          message.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>{message.text}</div>
      )}

      <form onSubmit={save} autoComplete="off" className="space-y-4">
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Dados pessoais</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome</label>
            <input
              type="text"
              name="profile_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="text"
              name="profile_email_readonly"
              value={email}
              disabled
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Telefone</label>
            <input
              type="text"
              name="profile_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Alterar senha</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Senha atual</label>
            <input
              type="password"
              name="profile_current_pw"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nova senha</label>
            <input
              type="password"
              name="profile_new_pw"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </form>
    </div>
  );
}
