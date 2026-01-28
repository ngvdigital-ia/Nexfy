"use client";

import { useState, useEffect } from "react";

interface Props {
  transaction: {
    id: number;
    status: string;
    amount: number;
    paymentMethod: string;
    pixCode: string | null;
    pixQrCode: string | null;
    boletoUrl: string | null;
    customerName: string | null;
    customerEmail: string | null;
  };
  product: {
    name: string;
    deliveryType: string | null;
    deliveryUrl: string | null;
    thankYouPageUrl: string | null;
  };
}

export function ThankYouClient({ transaction, product }: Props) {
  const [status, setStatus] = useState(transaction.status);

  // Polling para PIX/Boleto pendentes
  useEffect(() => {
    if (status === "approved" || status === "refused" || status === "expired") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?id=${transaction.id}`);
        const data = await res.json();
        if (data.status !== status) {
          setStatus(data.status);
          if (data.status === "approved") clearInterval(interval);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [transaction.id, status]);

  // Redirecionar para pagina custom se aprovado e configurado
  useEffect(() => {
    if (status === "approved" && product.thankYouPageUrl) {
      const timer = setTimeout(() => {
        window.location.href = product.thankYouPageUrl!;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, product.thankYouPageUrl]);

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
        {status === "approved" ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Pagamento aprovado!</h1>
            <p className="text-gray-400 text-sm">
              Obrigado, {transaction.customerName?.split(" ")[0] || ""}!
            </p>
          </>
        ) : status === "pending" ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Aguardando pagamento</h1>
            <p className="text-gray-400 text-sm">
              {transaction.paymentMethod === "pix"
                ? "Escaneie o QR Code ou copie o codigo PIX abaixo"
                : "Seu boleto foi gerado. Pague ate o vencimento."}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Pagamento nao aprovado</h1>
            <p className="text-gray-400 text-sm">
              Houve um problema com seu pagamento. Tente novamente.
            </p>
          </>
        )}
      </div>

      {/* PIX pendente */}
      {status === "pending" && transaction.paymentMethod === "pix" && transaction.pixCode && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          {transaction.pixQrCode && (
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl">
                <img
                  src={
                    transaction.pixQrCode.startsWith("data:")
                      ? transaction.pixQrCode
                      : `data:image/png;base64,${transaction.pixQrCode}`
                  }
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
            </div>
          )}
          <CopyPixCode code={transaction.pixCode} />
        </div>
      )}

      {/* Boleto pendente */}
      {status === "pending" && transaction.paymentMethod === "boleto" && transaction.boletoUrl && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
          <a
            href={transaction.boletoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ver boleto
          </a>
        </div>
      )}

      {/* Detalhes */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
          Detalhes da compra
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Produto</span>
            <span className="text-white">{product.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Valor</span>
            <span className="text-white">R$ {transaction.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Pagamento</span>
            <span className="text-white">
              {transaction.paymentMethod === "pix"
                ? "PIX"
                : transaction.paymentMethod === "credit_card"
                ? "Cartao de credito"
                : "Boleto"}
            </span>
          </div>
          {transaction.customerEmail && (
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="text-white text-xs">{transaction.customerEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Entrega - Link direto */}
      {status === "approved" && product.deliveryType === "url" && product.deliveryUrl && (
        <div className="bg-gray-900 rounded-xl border border-green-500/30 p-4 text-center">
          <p className="text-gray-400 text-sm mb-3">Acesse seu conteudo:</p>
          <a
            href={product.deliveryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Acessar agora
          </a>
        </div>
      )}

      {/* Area de membros */}
      {status === "approved" && product.deliveryType === "member_area" && (
        <div className="bg-gray-900 rounded-xl border border-green-500/30 p-4 text-center">
          <p className="text-gray-400 text-sm mb-3">
            Enviamos um email para <strong className="text-white">{transaction.customerEmail}</strong> com os dados de acesso.
          </p>
          <a
            href="/member"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Acessar area de membros
          </a>
        </div>
      )}

      {/* Redirect notice */}
      {status === "approved" && product.thankYouPageUrl && (
        <p className="text-center text-gray-500 text-xs">
          Redirecionando em instantes...
        </p>
      )}
    </div>
  );
}

function CopyPixCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  }

  return (
    <div>
      <p className="text-gray-400 text-xs mb-2 text-center">Codigo PIX Copia e Cola</p>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={code}
          className="w-full px-3 py-2.5 pr-20 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-mono truncate"
        />
        <button
          type="button"
          onClick={copy}
          className={`absolute right-1 top-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            copied ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
