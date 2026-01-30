"use client";

import { useState, useEffect } from "react";

interface Bump {
  id: number;
  title: string;
  description: string | null;
  price: string;
  bumpProductId: number;
  isActive: boolean;
}

export default function BumpsTab({ productId }: { productId: string }) {
  const [bumps, setBumps] = useState<Bump[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const api = `/api/dashboard/products/${productId}/bumps`;

  async function loadBumps() {
    const res = await fetch(api);
    if (res.ok) setBumps(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadBumps(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!title || !price) return;
    setSaving(true);
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || null, price: parseFloat(price) }),
    });
    if (res.ok) {
      const bump = await res.json();
      setBumps((prev) => [...prev, bump]);
      setTitle("");
      setDescription("");
      setPrice("");
    }
    setSaving(false);
  }

  async function toggle(bump: Bump) {
    const res = await fetch(`${api}/${bump.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !bump.isActive }),
    });
    if (res.ok) {
      setBumps((prev) => prev.map((b) => (b.id === bump.id ? { ...b, isActive: !b.isActive } : b)));
    }
  }

  async function remove(id: number) {
    const res = await fetch(`${api}/${id}`, { method: "DELETE" });
    if (res.ok) setBumps((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) return <p className="text-gray-400 text-sm">Carregando bumps...</p>;

  return (
    <div className="space-y-4">
      {/* Form de criacao */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-white">Novo Order Bump</h3>
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulo do bump"
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descricao (opcional)"
            rows={2}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Preco (ex: 9.90)"
            type="number"
            step="0.01"
            min="0"
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={create}
            disabled={saving || !title || !price}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Adicionando..." : "Adicionar Bump"}
          </button>
        </div>
      </div>

      {/* Lista */}
      {bumps.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum order bump configurado</p>
      ) : (
        <div className="space-y-2">
          {bumps.map((bump) => (
            <div key={bump.id} className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{bump.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${bump.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                    {bump.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                {bump.description && <p className="text-xs text-gray-400 truncate mt-0.5">{bump.description}</p>}
                <p className="text-xs text-blue-400 mt-0.5">R$ {Number(bump.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggle(bump)}
                  className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
                >
                  {bump.isActive ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(bump.id)}
                  className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
