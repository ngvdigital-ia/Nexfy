import Link from "next/link";

export const metadata = { title: "Termos de Uso - NexFy" };

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">N</div>
          <span className="font-bold text-lg">NexFy</span>
        </Link>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <h1>Termos de Uso</h1>
        <p><strong>Ultima atualizacao:</strong> {new Date().toLocaleDateString("pt-BR")}</p>

        <h2>1. Aceitacao dos Termos</h2>
        <p>Ao acessar e utilizar a plataforma NexFy, voce concorda com estes termos de uso. Se nao concordar, nao utilize a plataforma.</p>

        <h2>2. Servicos Oferecidos</h2>
        <p>A NexFy e uma plataforma de venda de produtos digitais e fisicos que oferece checkout otimizado, area de membros, gestao de cupons e processamento de pagamentos via Stripe.</p>

        <h2>3. Pagamentos</h2>
        <p>Os pagamentos sao processados via Stripe. A NexFy nao armazena dados de cartao de credito. Metodos aceitos: cartao de credito/debito, Apple Pay, Google Pay e PIX.</p>

        <h2>4. Politica de Reembolso</h2>
        <p>Reembolsos seguem as regras do Codigo de Defesa do Consumidor (7 dias para produtos digitais). Produtos fisicos seguem politica especifica do vendedor.</p>

        <h2>5. Propriedade Intelectual</h2>
        <p>Todo o conteudo da plataforma, incluindo marca, design e codigo, e propriedade da NexFy ou de seus licenciadores.</p>

        <h2>6. Limitacao de Responsabilidade</h2>
        <p>A NexFy nao se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso da plataforma.</p>

        <h2>7. Alteracoes</h2>
        <p>Estes termos podem ser alterados a qualquer momento. A continuidade do uso apos alteracoes constitui aceitacao dos novos termos.</p>

        <h2>8. Contato</h2>
        <p>Para duvidas sobre estes termos, entre em contato pelo suporte da plataforma.</p>
      </main>
    </div>
  );
}
