"use client";

import { useState, useCallback, useEffect } from "react";
import { PaymentMethods } from "./PaymentMethods";
import { CardPayment } from "./CardPayment";
import { StripePayment } from "./StripePayment";
import { PixPayment } from "./PixPayment";
import { OrderBump } from "./OrderBump";
import { CouponInput } from "./CouponInput";
import { CountdownTimer } from "./CountdownTimer";
import { CountrySelector } from "./CountrySelector";
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  formatDisplayPrice,
  toStripeAmount,
} from "@/lib/currencies";

interface Product {
  id: number;
  hash: string;
  name: string;
  price: number; // Preço base em USD
  baseCurrency: CurrencyCode; // Moeda base do preço
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
  initialCountry?: string;
  initialCurrency?: CurrencyCode;
}

type PaymentMethod = "pix" | "credit_card" | "boleto";

export function CheckoutForm({
  product,
  offer,
  bumps,
  utm,
  initialCountry = "US",
  initialCurrency = "USD",
}: Props) {
  // Stripe só suporta cartão - forçar credit_card como padrão
  const isStripeGateway = product.gateway === "stripe";
  const defaultMethod: PaymentMethod = isStripeGateway
    ? "credit_card"
    : product.pixEnabled
      ? "pix"
      : product.cardEnabled
        ? "credit_card"
        : "boleto";

  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBumps, setSelectedBumps] = useState<number[]>([]);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");

  // Multi-moeda
  const [userCountry, setUserCountry] = useState(initialCountry);
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>(initialCurrency);
  const [convertedPrice, setConvertedPrice] = useState(product.price);
  const [convertedBumps, setConvertedBumps] = useState<Record<number, number>>({});
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

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

  // Calcular totais com conversão
  const bumpTotal = bumps
    .filter((b) => selectedBumps.includes(b.id))
    .reduce((sum, b) => sum + (convertedBumps[b.id] || b.price * exchangeRate), 0);

  const convertedDiscount = discount * exchangeRate;
  const totalPrice = Math.max(0, convertedPrice - convertedDiscount + bumpTotal);

  // Converter preço quando muda a moeda
  const handleCountryChange = useCallback(async (country: string, currency: CurrencyCode) => {
    setUserCountry(country);
    setUserCurrency(currency);

    const baseCurrency = product.baseCurrency || "USD";

    if (currency === baseCurrency) {
      setConvertedPrice(product.price);
      setExchangeRate(1);
      // Reset bump prices
      const bumpPrices: Record<number, number> = {};
      bumps.forEach((b) => { bumpPrices[b.id] = b.price; });
      setConvertedBumps(bumpPrices);
      return;
    }

    setIsLoadingPrice(true);

    try {
      const response = await fetch("/api/convert-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: product.price,
          fromCurrency: baseCurrency,
          toCurrency: currency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConvertedPrice(data.convertedAmount);
        setExchangeRate(data.rate);

        // Converter preços dos bumps
        const bumpPrices: Record<number, number> = {};
        for (const bump of bumps) {
          bumpPrices[bump.id] = Math.round(bump.price * data.rate * 100) / 100;
        }
        setConvertedBumps(bumpPrices);
      }
    } catch (error) {
      console.error("Failed to convert price:", error);
    } finally {
      setIsLoadingPrice(false);
    }
  }, [product.price, product.baseCurrency, bumps]);

  // Converter preço na montagem se moeda inicial != moeda base do produto
  useEffect(() => {
    const baseCurrency = product.baseCurrency || "USD";

    // Ler moeda do cookie (pode diferir do initialCurrency do server)
    const savedCountry = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_country="))
      ?.split("=")[1];

    const savedCurrency = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_currency="))
      ?.split("=")[1] as CurrencyCode | undefined;

    // Determinar moeda efetiva: cookie > initialCurrency
    const effectiveCountry = savedCountry || initialCountry;
    const effectiveCurrency = (savedCurrency && savedCurrency in SUPPORTED_CURRENCIES)
      ? savedCurrency
      : initialCurrency;

    // Sempre converter se a moeda efetiva difere da moeda base
    if (effectiveCurrency !== baseCurrency) {
      handleCountryChange(effectiveCountry, effectiveCurrency);
    }
  }, []); // Executar apenas na montagem

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
          currency: userCurrency.toLowerCase(),
          country: userCountry,
          convertedAmount: totalPrice,
          exchangeRate,
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
        currency: userCurrency.toLowerCase(),
        country: userCountry,
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
        currency: userCurrency,
        content_ids: [product.id],
        content_type: "product",
      });
    }
    if (product.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "purchase", {
        transaction_id: transactionId,
        value: totalPrice,
        currency: userCurrency,
      });
    }
  }

  // Obter símbolo da moeda
  const currencySymbol = SUPPORTED_CURRENCIES[userCurrency]?.symbol || "$";

  // PIX pendente
  if (result && method === "pix" && result.pixCode) {
    return (
      <PixPayment
        pixCode={result.pixCode}
        pixQrCode={result.pixQrCode}
        transactionId={result.transactionId}
        amount={totalPrice}
        currencySymbol={currencySymbol}
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

      {/* Seletor de País/Moeda */}
      <div className="card-glow p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Your location:</span>
          <CountrySelector
            initialCountry={userCountry}
            initialCurrency={userCurrency}
            onCountryChange={handleCountryChange}
          />
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="card-glow p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Your details
        </h2>

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2.5 input-glow text-sm"
        />

        <input
          type="email"
          placeholder="Your best email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 input-glow text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Tax ID / CPF"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            required
            maxLength={14}
            className="w-full px-3 py-2.5 input-glow text-sm"
          />
          <input
            type="text"
            placeholder="Phone"
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
        gateway={product.gateway}
      />

      {/* Stripe Payment (Card + Apple/Google Pay) */}
      {method === "credit_card" && isStripe && stripeClientSecret && (
        <StripePayment
          clientSecret={stripeClientSecret}
          amount={totalPrice}
          currency={userCurrency.toLowerCase()}
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
          {loading ? "Preparing..." : "Continue to payment"}
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
          currencySymbol={currencySymbol}
        />
      )}

      {/* Order Bumps */}
      {bumps.length > 0 && (
        <div className="space-y-2">
          {bumps.map((bump) => (
            <OrderBump
              key={bump.id}
              bump={{
                ...bump,
                price: convertedBumps[bump.id] || bump.price,
              }}
              selected={selectedBumps.includes(bump.id)}
              onToggle={() => toggleBump(bump.id)}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>
      )}

      {/* Cupom */}
      <CouponInput
        productHash={product.hash}
        onApplied={handleCouponApplied}
        currencySymbol={currencySymbol}
      />

      {/* Resumo */}
      <div className="card-glow p-4">
        <div className="flex justify-between text-sm text-gray-400">
          <span>{product.name}</span>
          {isLoadingPrice ? (
            <span className="animate-pulse bg-gray-700 h-4 w-16 rounded"></span>
          ) : (
            <span>{formatDisplayPrice(convertedPrice, userCurrency)}</span>
          )}
        </div>

        {bumpTotal > 0 && (
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>Extras</span>
            <span>+ {formatDisplayPrice(bumpTotal, userCurrency)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-sm text-[var(--cta-green)] mt-1">
            <span>Discount</span>
            <span>- {formatDisplayPrice(convertedDiscount, userCurrency)}</span>
          </div>
        )}

        <div className="flex justify-between text-white font-bold mt-3 pt-3 border-t border-[rgba(139,92,246,0.2)]">
          <span>Total</span>
          {isLoadingPrice ? (
            <span className="animate-pulse bg-gray-700 h-6 w-24 rounded"></span>
          ) : (
            <span>{formatDisplayPrice(totalPrice, userCurrency)}</span>
          )}
        </div>

        {method === "credit_card" && installments > 1 && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {installments}x of {formatDisplayPrice(totalPrice / installments, userCurrency)}
          </p>
        )}

        {/* Mostrar preço original se convertido */}
        {userCurrency !== (product.baseCurrency || "USD") && !isLoadingPrice && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            ≈ {formatDisplayPrice(product.price, product.baseCurrency || "USD")}
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
          disabled={loading || isLoadingPrice}
          className="w-full py-3.5 btn-cta text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            <>
              {product.buttonText} - {formatDisplayPrice(totalPrice, userCurrency)}
            </>
          )}
        </button>
      )}

      {/* Seguranca */}
      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        100% secure encrypted payment
      </div>
    </form>
  );
}
