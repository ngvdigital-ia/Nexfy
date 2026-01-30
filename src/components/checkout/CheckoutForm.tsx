"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { PaymentMethods } from "./PaymentMethods";
import { CardPayment } from "./CardPayment";
import { PixPayment } from "./PixPayment";

const StripePayment = dynamic(
  () => import("./StripePayment").then((mod) => mod.StripePayment),
  { ssr: false, loading: () => (
    <div className="overflow-hidden">
      <div className="h-1 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
        <div className="h-full bg-[#22C55E] rounded-full animate-pulse" style={{ width: "60%" }} />
      </div>
      <p className="text-[#9CA3AF] text-xs text-center mt-3">Loading payment methods...</p>
    </div>
  )}
);
import { OrderBump } from "./OrderBump";
import { CouponInput } from "./CouponInput";
import { CountrySelector } from "./CountrySelector";
import {
  SUPPORTED_CURRENCIES,
  COUNTRIES,
  type CurrencyCode,
  formatDisplayPrice,
  toStripeAmount,
} from "@/lib/currencies";

interface Product {
  id: number;
  hash: string;
  name: string;
  price: number;
  baseCurrency: CurrencyCode;
  pixEnabled: boolean;
  cardEnabled: boolean;
  boletoEnabled: boolean;
  maxInstallments: number;
  buttonColor: string;
  buttonText: string;
  facebookPixelId: string | null;
  googleAnalyticsId: string | null;
  gateway: string;
  checkoutImage?: string | null;
  checkoutTitle?: string | null;
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
  const [confirmEmail, setConfirmEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [cardData, setCardData] = useState({
    number: "",
    holderName: "",
    expMonth: "",
    expYear: "",
    cvv: "",
  });
  const [installments, setInstallments] = useState(1);

  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeTransactionId, setStripeTransactionId] = useState<number | null>(null);
  const [stripeCurrency, setStripeCurrency] = useState<string>("");
  const [stripeAmount, setStripeAmount] = useState<number>(0);
  const [isRetryingBRL, setIsRetryingBRL] = useState(false);
  const [didRetryBRL, setDidRetryBRL] = useState(false);
  const isStripe = product.gateway === "stripe";

  const bumpTotal = bumps
    .filter((b) => selectedBumps.includes(b.id))
    .reduce((sum, b) => sum + (convertedBumps[b.id] || b.price * exchangeRate), 0);

  const convertedDiscount = discount * exchangeRate;
  const totalPrice = Math.max(0, convertedPrice - convertedDiscount + bumpTotal);

  const handleCountryChange = useCallback(async (country: string, currency: CurrencyCode) => {
    setUserCountry(country);
    setUserCurrency(currency);

    const baseCurrency = product.baseCurrency || "USD";

    if (currency === baseCurrency) {
      setConvertedPrice(product.price);
      setExchangeRate(1);
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

  useEffect(() => {
    const baseCurrency = product.baseCurrency || "USD";

    const savedCountry = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_country="))
      ?.split("=")[1];

    const savedCurrency = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_currency="))
      ?.split("=")[1] as CurrencyCode | undefined;

    const effectiveCountry = savedCountry || initialCountry;
    const effectiveCurrency = (savedCurrency && savedCurrency in SUPPORTED_CURRENCIES)
      ? savedCurrency
      : initialCurrency;

    if (effectiveCurrency !== baseCurrency) {
      handleCountryChange(effectiveCountry, effectiveCurrency);
    }
  }, []);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    return value.replace(/[^\d\s\-()]/g, "").slice(0, 20);
  };

  const defaultDialCode = COUNTRIES.find((c) => c.code === userCountry)?.dialCode || "+1";
  const [dialCode, setDialCode] = useState(defaultDialCode);
  const [dialDropdownOpen, setDialDropdownOpen] = useState(false);

  useEffect(() => {
    const newDial = COUNTRIES.find((c) => c.code === userCountry)?.dialCode || "+1";
    setDialCode(newDial);
  }, [userCountry]);

  const handleCouponApplied = useCallback((code: string, discountValue: number) => {
    setCouponCode(code);
    setDiscount(discountValue);
  }, []);

  const toggleBump = useCallback((id: number) => {
    setSelectedBumps((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }, []);

  async function createStripeIntent(silent = false) {
    if (!silent) setLoading(true);
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
          customer: { name: name || "", email: email || "", cpf: cpf ? cpf.replace(/\D/g, "") : "", phone: phone.replace(/\D/g, "") },
          currency: userCurrency.toLowerCase(),
          country: userCountry,
          convertedAmount: totalPrice,
          exchangeRate,
          ...utm,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        console.error("Stripe intent error:", data.error);
        setError(data.error || "Error initiating payment");
        setLoading(false);
        return;
      }
      setStripeClientSecret(data.clientSecret);
      setStripeTransactionId(data.transactionId);
      setStripeCurrency(data.currency || userCurrency.toLowerCase());
      setStripeAmount(data.amount || totalPrice);
    } catch {
      setError("Connection error.");
    }
    if (!silent) setLoading(false);
  }

  async function retryStripeInBRL() {
    setIsRetryingBRL(true);
    setDidRetryBRL(true);
    setError("Brazilian card detected. Converting to BRL...");
    setStripeClientSecret("");

    try {
      const baseCurrency = product.baseCurrency || "USD";
      let brlPrice = product.price;
      let brlRate = 1;

      if (baseCurrency !== "BRL") {
        const convRes = await fetch("/api/convert-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: product.price,
            fromCurrency: baseCurrency,
            toCurrency: "BRL",
          }),
        });
        const convData = await convRes.json();
        if (convData.success) {
          brlPrice = convData.convertedAmount;
          brlRate = convData.rate;
        }
      }

      const brlBumpTotal = bumps
        .filter((b) => selectedBumps.includes(b.id))
        .reduce((sum, b) => sum + Math.round(b.price * brlRate * 100) / 100, 0);
      const brlDiscount = discount * brlRate;
      const brlTotal = Math.max(0, brlPrice - brlDiscount + brlBumpTotal);

      const res = await fetch("/api/payments/stripe-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productHash: product.hash,
          offerHash: offer?.hash,
          couponCode: couponCode || undefined,
          orderBumpIds: selectedBumps.length ? selectedBumps : undefined,
          customer: { name, email, cpf: cpf ? cpf.replace(/\D/g, "") : "", phone: phone.replace(/\D/g, "") },
          currency: "brl",
          country: "BR",
          convertedAmount: brlTotal,
          exchangeRate: brlRate,
          ...utm,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Error creating BRL payment");
        setIsRetryingBRL(false);
        return;
      }

      setStripeClientSecret(data.clientSecret);
      setStripeTransactionId(data.transactionId);
      setStripeCurrency("brl");
      setStripeAmount(data.amount || brlTotal);
      setError("");
    } catch {
      setError("Error converting to BRL.");
    }
    setIsRetryingBRL(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

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
          cpf: cpf ? cpf.replace(/\D/g, "") : "",
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
        setError(data.error || "Error processing payment");
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
      setError("Connection error. Please try again.");
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

  // Auto-create Stripe intent on mount
  const [stripeIntentCreating, setStripeIntentCreating] = useState(false);
  useEffect(() => {
    if (
      isStripe &&
      method === "credit_card" &&
      !stripeClientSecret &&
      !stripeIntentCreating &&
      !loading
    ) {
      setStripeIntentCreating(true);
      createStripeIntent(true).finally(() => setStripeIntentCreating(false));
    }
  }, [isStripe]);

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

  const Wrapper = isStripe ? "div" : "form";
  const wrapperProps = isStripe ? {} : { onSubmit: handleSubmit };

  // Purchase Summary content (reused for desktop + mobile)
  const PurchaseSummaryContent = () => (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4 shadow-sm">
      {/* Product image */}
      {product.checkoutImage && (
        <div className="flex justify-center">
          <img
            src={product.checkoutImage}
            alt={product.name}
            className="max-h-44 object-contain"
          />
        </div>
      )}

      {/* Product name + base price */}
      <div className="text-center">
        <h3 className="font-bold text-[#1F2937] text-lg">
          {product.checkoutTitle || product.name}
        </h3>
        <p className="text-[#6B7280] text-sm mt-1">
          {formatDisplayPrice(product.price, product.baseCurrency || "USD")}
        </p>
      </div>

      {/* Line items */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between text-sm border-b border-[#F3F4F6] pb-3">
          <span className="text-[#4B5563]">{product.name}</span>
          {isLoadingPrice ? (
            <span className="animate-pulse bg-gray-200 h-4 w-20 rounded"></span>
          ) : (
            <span className="text-[#22C55E] font-semibold">{formatDisplayPrice(convertedPrice, userCurrency)}</span>
          )}
        </div>

        {bumpTotal > 0 && (
          <div className="flex justify-between text-sm border-b border-[#F3F4F6] pb-3">
            <span className="text-[#4B5563]">Extras</span>
            <span className="text-[#6B7280]">+ {formatDisplayPrice(bumpTotal, userCurrency)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-sm border-b border-[#F3F4F6] pb-3">
            <span className="text-[#4B5563]">Discount</span>
            <span className="text-[#22C55E] font-semibold">- {formatDisplayPrice(convertedDiscount, userCurrency)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm border-b border-[#F3F4F6] pb-3">
          <span className="text-[#4B5563]">Applicable taxes</span>
          <span className="text-[#6B7280]">Included</span>
        </div>

        {/* Total Today */}
        <hr className="border-t border-black/10 my-0" />
        <div className="flex justify-between items-center bg-[#E9ECEF] rounded p-2">
          <span className="text-[#212529] text-[13px] font-medium">Total Today:</span>
          {isLoadingPrice ? (
            <span className="animate-pulse bg-gray-200 h-4 w-20 rounded"></span>
          ) : (
            <span className="text-[#28A745] text-[13px]">{formatDisplayPrice(totalPrice, userCurrency)}</span>
          )}
        </div>

        {method === "credit_card" && installments > 1 && (
          <p className="text-xs text-[#9CA3AF] text-right">
            {installments}x of {formatDisplayPrice(totalPrice / installments, userCurrency)}
          </p>
        )}

        {userCurrency !== (product.baseCurrency || "USD") && !isLoadingPrice && (
          <p className="text-xs text-[#9CA3AF] text-center">
            ≈ {formatDisplayPrice(product.price, product.baseCurrency || "USD")}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Order Details Header */}
      <div className="flex items-start gap-3 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 shadow-sm">
        <svg className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wide">Order details:</p>
          <p className="text-sm font-bold text-[#1F2937] truncate">{product.checkoutTitle || product.name}</p>
        </div>
        <div className="flex-shrink-0">
          <CountrySelector
            initialCountry={userCountry}
            initialCurrency={userCurrency}
            onCountryChange={handleCountryChange}
            compact
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLUMN 1: Personal Info */}
      <div className="space-y-0">
        {/* Badge overlapping the white box */}
        <div className="relative z-10 ml-4 mb-[-14px]">
          <div className="relative inline-flex items-center bg-[#D5D5D5] text-white text-sm font-bold uppercase pl-10 pr-5 py-2 rounded-full">
            <span className="absolute left-0 flex items-center justify-center w-10 h-10 bg-[#B8B8B8] text-white rounded-full text-base font-bold -ml-1 shadow">1</span>
            Personal info
          </div>
        </div>

        {/* White card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 pt-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-bold text-[#1F2937] mb-1.5">Your full name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1F2937] placeholder-[#C0C4CC] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] hover:border-[#9CA3AF] transition-all duration-200 ${submitted && !name.trim() ? "border-red-400" : "border-[#D1D5DB]"}`}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1F2937] mb-1.5">Email address</label>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1F2937] placeholder-[#C0C4CC] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] hover:border-[#9CA3AF] transition-all duration-200 ${submitted && !email.trim() ? "border-red-400" : "border-[#D1D5DB]"}`}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1F2937] mb-1.5">Confirm your email</label>
            <input
              type="email"
              placeholder="Confirm your email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1F2937] placeholder-[#C0C4CC] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] hover:border-[#9CA3AF] transition-all duration-200 ${submitted && confirmEmail.trim() && email.toLowerCase() !== confirmEmail.toLowerCase() ? "border-red-400" : "border-[#D1D5DB]"}`}
            />
            {confirmEmail.trim() && email.toLowerCase() !== confirmEmail.toLowerCase() && (
              <p className="text-red-500 text-xs mt-1">Emails do not match</p>
            )}
          </div>

          <div className="flex gap-3 relative">
            <div className="w-1/3">
              <label className="block text-sm font-bold text-[#1F2937] mb-1.5">Country code</label>
              <button
                type="button"
                onClick={() => setDialDropdownOpen(!dialDropdownOpen)}
                className="w-full inline-flex items-center justify-center gap-1 px-4 py-3 bg-white border border-[#D1D5DB] rounded-xl text-sm text-[#1F2937] font-bold hover:border-[#9CA3AF] transition-all duration-200 whitespace-nowrap"
              >
                {dialCode}
                <svg className={`w-3 h-3 text-[#9CA3AF] transition-transform ${dialDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dialDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 max-h-48 overflow-y-auto bg-white border border-[#D1D5DB] rounded-xl shadow-xl z-50">
                  {[...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setDialCode(c.dialCode); setDialDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F3F4F6] ${dialCode === c.dialCode ? "bg-[#F0FDF4] font-bold text-[#1F2937]" : "text-[#1F2937]"}`}
                    >
                      <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      <span className="text-[#9CA3AF] text-xs">{c.dialCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-2/3">
              <label className="block text-sm font-bold text-[#1F2937] mb-1.5">Telephone</label>
              <input
                type="text"
                placeholder="Telephone"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1F2937] placeholder-[#C0C4CC] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] hover:border-[#9CA3AF] transition-all duration-200 ${submitted && !phone.trim() ? "border-red-400" : "border-[#D1D5DB]"}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Payment */}
      <Wrapper {...wrapperProps as any} className="space-y-0">
        {/* Badge overlapping the white box */}
        <div className="relative z-10 ml-4 mb-[-14px]">
          <div className="relative inline-flex items-center bg-[#D5D5D5] text-white text-sm font-bold uppercase pl-10 pr-5 py-2 rounded-full">
            <span className="absolute left-0 flex items-center justify-center w-10 h-10 bg-[#B8B8B8] text-white rounded-full text-base font-bold -ml-1 shadow">2</span>
            Payment
          </div>
        </div>

        {/* White card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 pt-6 space-y-4 shadow-sm">
          {/* Payment Method Tabs - only for non-Stripe gateways */}
          {!isStripe && (
            <PaymentMethods
              selected={method}
              onSelect={setMethod}
              pixEnabled={product.pixEnabled}
              cardEnabled={product.cardEnabled}
              boletoEnabled={product.boletoEnabled}
              gateway={product.gateway}
            />
          )}

          {/* Stripe Payment */}
          {method === "credit_card" && isStripe && isRetryingBRL && (
            <div className="text-center space-y-3">
              <svg className="animate-spin h-8 w-8 mx-auto text-[#22C55E]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-amber-600 text-sm font-medium">Brazilian card detected</p>
              <p className="text-[#6B7280] text-xs">Converting to BRL and creating new payment...</p>
            </div>
          )}
          {method === "credit_card" && isStripe && stripeClientSecret && !isRetryingBRL && (
            <>
              {stripeCurrency === "brl" && userCurrency !== "BRL" && didRetryBRL && (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3">
                  <p className="text-[#16A34A] text-sm font-medium">Converted to BRL</p>
                  <p className="text-[#6B7280] text-xs mt-1">
                    Your Brazilian card requires payment in BRL. The amount was converted automatically. Please enter your card details again.
                  </p>
                </div>
              )}
              <StripePayment
                clientSecret={stripeClientSecret}
                amount={stripeAmount || totalPrice}
                currency={stripeCurrency || userCurrency.toLowerCase()}
                loading={loading}
                disabled={!name.trim() || !email.trim() || !phone.trim() || email.toLowerCase() !== confirmEmail.toLowerCase()}
                onSuccess={() => {
                  trackPurchase(stripeTransactionId || 0);
                  window.location.href = `/obrigado/${stripeTransactionId}`;
                }}
                onError={(msg) => setError(msg)}
                onCurrencyError={retryStripeInBRL}
              />
            </>
          )}
          {method === "credit_card" && isStripe && !stripeClientSecret && !isRetryingBRL && (
            <div className="overflow-hidden">
              <div className="h-1 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#22C55E] rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
              <p className="text-[#9CA3AF] text-xs text-center mt-3">Loading payment methods...</p>
            </div>
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

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[#EF4444] text-sm">
              {error}
            </div>
          )}
        </div>
      </Wrapper>

      {/* COLUMN 3: Purchase Summary (desktop only) */}
      <div className="hidden lg:block">
        <div className="sticky top-6 space-y-0">
          {/* Badge overlapping */}
          <div className="relative z-10 ml-4 mb-[-14px]">
            <div className="inline-flex items-center gap-2 bg-[#D5D5D5] text-white text-sm font-bold uppercase px-4 py-1 rounded-full">
              Purchase summary
            </div>
          </div>

          <PurchaseSummaryContent />

          {/* Support email box */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mt-4 shadow-sm text-center space-y-3">
            <p className="text-sm text-[#4B5563]">
              Support email: <span className="font-bold text-[#1F2937]">contatoleo@ngvdigital.site</span>
            </p>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-[#22C55E] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                100% SECURE
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

      {/* Buy Now + Security - below columns */}
      <div className="lg:w-2/3 flex flex-col items-center space-y-3">
        {!isStripe && (
          <button
            type="button"
            onClick={(e: any) => { setSubmitted(true); handleSubmit(e); }}
            disabled={loading || isLoadingPrice || !name.trim() || !email.trim() || !phone.trim() || email.toLowerCase() !== confirmEmail.toLowerCase()}
            className="w-full max-w-lg py-3.5 bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-white text-base font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/20"
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
              <span className="flex items-center justify-center gap-2">
                Buy now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            )}
          </button>
        )}

        <p className="text-sm text-[#22C55E] font-medium flex items-center justify-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          100% secure payment processed with 128-bit encryption
        </p>
        <p className="text-xs text-[#9CA3AF]">
          Digital product - access information will be sent by email.
        </p>
      </div>

      {/* Mobile Summary (visible only on mobile) */}
      <div className="lg:hidden space-y-0">
        {/* Badge overlapping */}
        <div className="relative z-10 ml-4 mb-[-14px]">
          <div className="inline-flex items-center gap-2 bg-[#D5D5D5] text-white text-sm font-bold uppercase px-4 py-1 rounded-full">
            Purchase summary
          </div>
        </div>

        <PurchaseSummaryContent />
      </div>

      {/* Support + Security footer */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-4 space-y-2 shadow-sm">
        <p className="text-sm text-[#4B5563] text-center">
          Support email: <span className="font-bold text-[#1F2937]">contatoleo@ngvdigital.site</span>
        </p>
        <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 bg-[#22C55E] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          100% SECURE
        </span>
        </div>
      </div>

      {/* WhatsApp Contact Box */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-6 shadow-sm text-center space-y-3">
        {/* WhatsApp Icon */}
        <div className="flex justify-center">
          <svg className="w-10 h-10 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <p className="text-[#1F2937] font-bold text-sm">Did you have any questions?</p>
        <p className="text-[#6B7280] text-sm">Contact our team</p>
        <a
          href="https://wa.me/5534991108066"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-sm px-6 py-2.5 rounded-full transition-colors"
        >
          TALK TO OUR TEAM
        </a>
      </div>

      <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed px-2">
        By clicking buy now, you acknowledge that (i) you have read and accept our <span className="underline">terms and conditions</span> and <span className="underline">privacy policy</span>. (ii) you are buying from RubusPay (Customer Support: contatoleo@ngvdigital.site) (iii) you are of legal age or authorized and accompanied by a legal guardian.
      </p>
    </div>
  );
}
