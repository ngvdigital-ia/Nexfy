import Link from "next/link";

export const metadata = { title: "Politica de Privacidade - NexFy" };

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">N</div>
          <span className="font-bold text-lg">NexFy</span>
        </Link>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <h1>Politica de Privacidade</h1>
        <p><strong>Ultima atualizacao:</strong> {new Date().toLocaleDateString("pt-BR")}</p>

        <h2>1. Dados Coletados</h2>
        <p>Coletamos nome, email, CPF, telefone e dados de pagamento necessarios para processar compras. Dados de cartao sao processados diretamente pelo Stripe e nunca armazenados em nossos servidores.</p>

        <h2>2. Uso dos Dados</h2>
        <p>Seus dados sao utilizados para: processar pagamentos, entregar produtos adquiridos, enviar comunicacoes sobre compras e melhorar a plataforma.</p>

        <h2>3. Compartilhamento</h2>
        <p>Compartilhamos dados apenas com processadores de pagamento (Stripe) e servicos essenciais para operacao da plataforma. Nao vendemos dados pessoais.</p>

        <h2>4. Cookies e Rastreamento</h2>
        <p>Utilizamos cookies para autenticacao, preferencias e analytics (Facebook Pixel, Google Analytics, UTMify) quando configurados pelo vendedor.</p>

        <h2>5. Seguranca</h2>
        <p>Utilizamos criptografia TLS/SSL, hashing bcrypt para senhas e processamento PCI-DSS compliant via Stripe.</p>

        <h2>6. Seus Direitos (LGPD)</h2>
        <p>Voce tem direito a acessar, corrigir, excluir seus dados e revogar consentimento. Entre em contato pelo suporte para exercer seus direitos.</p>

        <h2>7. Retencao de Dados</h2>
        <p>Dados de transacao sao mantidos pelo periodo legal obrigatorio. Dados de conta podem ser excluidos mediante solicitacao.</p>

        <h2>8. Contato</h2>
        <p>Para questoes sobre privacidade, entre em contato pelo suporte da plataforma.</p>
      </main>
    </div>
  );
}
