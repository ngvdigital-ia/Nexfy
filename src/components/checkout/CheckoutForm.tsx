"use client";

import { useState, useCallback } from "react";
import { PaymentMethods } from "./PaymentMethods";
import { CardPayment } from "./CardPayment";
import { StripePayment } from "./StripePayment";
import { PixPayment } from "./PixPayment";
import { OrderBump } from "./OrderBump";
import { CouponInput } from "./CouponInput";
import { CountdownTimer } from "./CountdownTimer";

interface Product {
  id: number;
  hash: string;
  name: string;
  price: number;
  pixEnabled: boolean;
  cardEnabled: boolean;
  boletoEnabled: boolean;
  maxInstallments: number;
  buttonColor: string;
  buttonText: string;
  facebookPixelId: string | null;
  googleAnalyticsId: string | null;
  gateway: string;
}

interface Bump {
  id: number;
  title: string;
  description: string | null;
  price: number;
}

interface UTM {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}

interface Props {
  product: Product;
  offer: { hash: string; price: number } | null;
  bumps: Bump[];
  utm: UTM;
}

type PaymentMethod = "pix" | "credit_card" | "boleto";

export function CheckoutForm({ product, offer, bumps, utm }: Props) {
  const [method, setMethod] = useState<PaymentMethod>(
    product.pixEnabled ? "pix" : product.cardEnabled ? "credit_card" : "boleto"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBumps, setSelectedBumps] = useState<number[]>([]);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");

  const [result, setResult] = useState<{
    transactionId: number;
    status: string;
    pixCode?: string;
    pixQrCode?: string;
    boletoUrl?: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");

  const [cardData, setCardData] = useState({
    number: "",
    holderName: "",
    expMonth: "",
    expYear: "",
    cvv: "",
  });
  const [installments, setInstallments] = useState(1);

  // Stripe
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeTransactionId, setStripeTransactionId] = useState<number | null>(null);
  const isStripe = product.gateway === "stripe";

  const bumpTotal = bumps
    .filter((b) => selectedBumps.includes(b.id))
    .reduce((sum, b) => sum + b.price, 0);

  const totalPrice = Math.max(0, product.price - discount + bumpTotal);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleCouponApplied = useCallback((code: string, discountValue: number) => {
    setCouponCode(code);
    setDiscount(discountValue);
  }, []);

  const toggleBump = useCallback((id: number) => {
    setSelectedBumps((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }, []);

  async function createStripeIntent() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/stripe-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productHash: product.hash,
          offerHash: offer?.hash,
          couponCode: couponCode || undefined,
          orderBumpIds: selectedBumps.length ? selectedBumps : undefined,
          customer: { name, email, cpf: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, "") },
          ...utm,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Erro ao iniciar pagamento");
        setLoading(false);
        return;
      }
      setStripeClientSecret(data.clientSecret);
      setStripeTransactionId(data.transactionId);
    } catch {
      setError("Erro de conexao.");
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Cart recovery
    try {
      fetch("/api/cart-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productHash: product.hash,
          email,
          name,
          phone,
        }),
      }).catch(() => {});
    } catch {}

    try {
      const payload: Record<string, unknown> = {
        productHash: product.hash,
        offerHash: offer?.hash,
        paymentMethod: method,
        customer: {
          name,
          email,
          cpf: cpf.replace(/\D/g, ""),
          phone: phone.replace(/\D/g, ""),
        },
        couponCode: couponCode || undefined,
        orderBumpIds: selectedBumps.length ? selectedBumps : undefined,
        ...utm,
      };

      if (method === "credit_card") {
        payload.card = {
          number: cardData.number.replace(/\s/g, ""),
          holderName: cardData.holderName,
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvv: cardData.cvv,
        };
        payload.installments = installments;
      }

      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Erro ao processar pagamento");
        setLoading(false);
        return;
      }

      if (data.status === "approved") {
        trackPurchase(data.transactionId);
        window.location.href = `/obrigado/${data.transactionId}`;
        return;
      }

      setResult(data);
    } catch {
      setError("Erro de conexao. Tente novamente.");
    }

    setLoading(false);
  }

  function trackPurchase(transactionId: number) {
    if (product.facebookPixelId && typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Purchase", {
        value: totalPrice,
        currency: "BRL",
        content_ids: [product.id],
        content_type: "product",
      });
    }
    if (product.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "purchase", {
        transaction_id: transactionId,
        value: totalPrice,
        currency: "BRL",
      });
    }
  }

  // PIX pendente
  if (result && method === "pix" && result.pixCode) {
    return (
      <PixPayment
        pixCode={result.pixCode}
        pixQrCode={result.pixQrCode}
        transactionId={result.transactionId}
        amount={totalPrice}
        onApproved={() => {
          trackPurchase(result.transactionId);
          window.location.href = `/obrigado/${result.transactionId}`;
        }}
      />
    );
  }

  // Boleto redirect
  if (result && method === "boleto" && result.boletoUrl) {
    window.location.href = `/obrigado/${result.transactionId}`;
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CountdownTimer minutes={15} />

      {/* Dados pessoais */}
      <div className="card-glow p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Seus dados
        </h2>

        <input
          type="text"
          placeholder="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2.5 input-glow text-sm"
        />

        <input
          type="email"
          placeholder="Seu melhor e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 input-glow text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="CPF"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            required
            maxLength={14}
            className="w-full px-3 py-2.5 input-glow text-sm"
          />
          <input
            type="text"
            placeholder="Telefone"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="w-full px-3 py-2.5 input-glow text-sm"
          />
        </div>
      </div>

      {/* Metodo de pagamento */}
      <PaymentMethods
        selected={method}
        onSelect={setMethod}
        pixEnabled={product.pixEnabled}
        cardEnabled={product.cardEnabled}
        boletoEnabled={product.boletoEnabled}
      />

      {/* Stripe Payment (Card + Apple/Google Pay) */}
      {method === "credit_card" && isStripe && stripeClientSecret && (
        <StripePayment
          clientSecret={stripeClientSecret}
          amount={totalPrice}
          loading={loading}
          onSuccess={() => {
            trackPurchase(stripeTransactionId || 0);
            window.location.href = `/obrigado/${stripeTransactionId}`;
          }}
          onError={(msg) => setError(msg)}
        />
      )}
      {method === "credit_card" && isStripe && !stripeClientSecret && (
        <button
          type="button"
          onClick={createStripeIntent}
          disabled={loading || !name || !email || !cpf}
          className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {loading ? "Preparando..." : "Continuar para pagamento"}
        </button>
      )}
      {method === "credit_card" && !isStripe && (
        <CardPayment
          cardData={cardData}
          onCardChange={setCardData}
          installments={installments}
          onInstallmentsChange={setInstallments}
          maxInstallments={product.maxInstallments}
          totalAmount={totalPrice}
        />
      )}

      {/* Order Bumps */}
      {bumps.length > 0 && (
        <div className="space-y-2">
          {bumps.map((bump) => (
            <OrderBump
              key={bump.id}
              bump={bump}
              selected={selectedBumps.includes(bump.id)}
              onToggle={() => toggleBump(bump.id)}
            />
          ))}
        </div>
      )}

      {/* Cupom */}
      <CouponInput
        productHash={product.hash}
        onApplied={handleCouponApplied}
      />

      {/* Resumo */}
      <div className="card-glow p-4">
        <div className="flex justify-between text-sm text-gray-400">
          <span>{product.name}</span>
          <span>R$ {product.price.toFixed(2)}</span>
        </div>

        {bumpTotal > 0 && (
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>Extras</span>
            <span>+ R$ {bumpTotal.toFixed(2)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-sm text-[var(--cta-green)] mt-1">
            <span>Desconto</span>
            <span>- R$ {discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-white font-bold mt-3 pt-3 border-t border-[rgba(139,92,246,0.2)]">
          <span>Total</span>
          <span>R$ {totalPrice.toFixed(2)}</span>
        </div>

        {method === "credit_card" && installments > 1 && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {installments}x de R$ {(totalPrice / installments).toFixed(2)}
          </p>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Botao CTA */}
      {!(method === "credit_card" && isStripe && stripeClientSecret) && (
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 btn-cta text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processando...
            </span>
          ) : (
            <>
              {product.buttonText} - R$ {totalPrice.toFixed(2)}
            </>
          )}
        </button>
      )}

      {/* Seguranca */}
      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Pagamento 100% seguro e criptografado
      </div>
    </form>
  );
}
