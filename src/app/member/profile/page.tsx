"use client";

import { useState, useEffect } from "react";

interface Profile {
  name: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/member/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile((p) => ({ ...p, name: data.user.name || "", email: data.user.email || "", phone: data.user.phone || "" }));
        }
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        currentPassword: profile.currentPassword || undefined,
        newPassword: profile.newPassword || undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setMessage({ type: "success", text: "Perfil atualizado!" });
      setProfile((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    } else {
      setMessage({ type: "error", text: data.error || "Erro ao salvar" });
    }
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm border ${
          message.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>{message.text}</div>
      )}

      <form onSubmit={save} className="space-y-4">
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Dados pessoais</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              autoComplete="name"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              autoComplete="email"
              className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Telefone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              autoComplete="tel"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Alterar senha</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Senha atual</label>
            <input
              type="password"
              value={profile.currentPassword}
              onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
              autoComplete="current-password"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nova senha</label>
            <input
              type="password"
              value={profile.newPassword}
              onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </form>
    </div>
  );
}
