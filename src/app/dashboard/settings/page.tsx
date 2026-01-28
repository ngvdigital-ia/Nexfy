"use client";

import Link from "next/link";

const sections = [
  {
    href: "/dashboard/settings/gateways",
    title: "Gateways de Pagamento",
    desc: "Configure suas credenciais de Mercado Pago, Efi, Stripe, etc.",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
  {
    href: "/dashboard/settings/webhooks",
    title: "Webhooks Customizados",
    desc: "Envie notificacoes de vendas para URLs externas.",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    href: "/dashboard/settings/integrations",
    title: "Integracoes",
    desc: "UTMfy, Starfy e outras integracoes.",
    icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z",
  },
  {
    href: "/dashboard/settings/profile",
    title: "Perfil",
    desc: "Altere seu nome, email e senha.",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Configuracoes</h1>

      <div className="grid gap-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium text-sm">{s.title}</p>
              <p className="text-gray-500 text-xs">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
