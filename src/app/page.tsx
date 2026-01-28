import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black" />
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold">
              N
            </div>
            <span className="font-bold text-xl">NexFy</span>
          </div>
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-sm font-medium transition-colors"
          >
            Entrar
          </Link>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 py-24">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Venda seus produtos{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)]">
              digitais e fisicos
            </span>{" "}
            para o mundo
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Checkout otimizado com Apple Pay, Google Pay e PIX.
            Dashboard completo com analytics, cupons e area de membros.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3.5 btn-cta text-base inline-block text-center"
            >
              Comecar agora
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Tudo que voce precisa para vender online
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Checkout Global",
              desc: "Apple Pay, Google Pay, cartao e PIX. Aceite pagamentos do mundo inteiro via Stripe.",
              icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
            },
            {
              title: "Area de Membros",
              desc: "Entregue cursos, modulos e aulas automaticamente apos a compra.",
              icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
            },
            {
              title: "Dashboard Completo",
              desc: "Vendas, relatorios, cupons de desconto e order bumps em um so lugar.",
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
            },
            {
              title: "Cupons de Desconto",
              desc: "Crie cupons percentuais ou de valor fixo com limites de uso e validade.",
              icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
            },
            {
              title: "Order Bumps",
              desc: "Aumente o ticket medio com ofertas adicionais no checkout.",
              icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              title: "Rastreamento UTMify",
              desc: "Integracao automatica com UTMify para rastrear todas as suas vendas.",
              icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
            },
          ].map((f) => (
            <div key={f.title} className="card-glow p-6">
              <svg className="w-8 h-8 text-[var(--accent)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
              </svg>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(139,92,246,0.2)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs">
              N
            </div>
            <span className="font-bold">NexFy</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/termos" className="hover:text-gray-300 transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-gray-300 transition-colors">
              Privacidade
            </Link>
          </div>
          <p className="text-xs text-gray-600">
            NexFy {new Date().getFullYear()}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
