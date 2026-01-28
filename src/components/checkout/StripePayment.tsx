"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toStripeAmount } from "@/lib/currencies";
import { getErrorMessage } from "@/lib/stripe-errors";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface PaymentError {
  title: string;
  message: string;
  action: string;
  isRetryable: boolean;
}

interface Props {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  onCurrencyError?: () => void;
  amount: number;
  currency?: string;
  loading: boolean;
}

function StripeForm({ clientSecret, onSuccess, onError, onCurrencyError, amount, currency = "usd", loading }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canPaymentRequest, setCanPaymentRequest] = useState(false);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);

  // Converter amount para centavos baseado na moeda
  const stripeAmount = toStripeAmount(amount, currency.toUpperCase() as any);

  // Determinar país baseado na moeda para Payment Request
  const getCountryFromCurrency = (curr: string): string => {
    const currencyCountry: Record<string, string> = {
      usd: 'US', eur: 'DE', gbp: 'GB', cad: 'CA', aud: 'AU',
      brl: 'BR', mxn: 'MX', jpy: 'JP', chf: 'CH', inr: 'IN',
    };
    return currencyCountry[curr.toLowerCase()] || 'US';
  };

  // Apple Pay / Google Pay via Payment Request API
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: getCountryFromCurrency(currency),
      currency: currency.toLowerCase(),
      total: {
        label: "Total",
        amount: stripeAmount,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanPaymentRequest(true);
      }
    });

    pr.on("paymentmethod", async (ev) => {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );

      if (error) {
        ev.complete("fail");
        onError(error.message || "Payment error");
        return;
      }

      ev.complete("success");

      if (paymentIntent?.status === "requires_action") {
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
        if (confirmError) {
          onError(confirmError.message || "Confirmation error");
          return;
        }
      }

      onSuccess(paymentIntent?.id || "");
    });
  }, [stripe, stripeAmount, currency, clientSecret, onSuccess, onError]);

  async function handleCardSubmit() {
    if (!stripe || !elements) return;

    if (!cardholderName.trim()) {
      onError("Enter the name on card");
      return;
    }

    setProcessing(true);
    const card = elements.getElement(CardElement);
    if (!card) {
      onError("Card element not found");
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: { name: cardholderName.trim() },
      },
    });

    if (error) {
      // Detectar erro de moeda (cartao BR + moeda estrangeira)
      const isCurrencyError =
        error.code === "card_not_supported" &&
        (error.message?.toLowerCase().includes("currency") ||
         error.message?.toLowerCase().includes("brl"));

      if (isCurrencyError && currency.toLowerCase() !== "brl" && onCurrencyError) {
        onCurrencyError();
        setProcessing(false);
        return;
      }

      const errorInfo = getErrorMessage(error.code || (error as any).decline_code);
      setPaymentError(errorInfo);
      onError(errorInfo.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      setPaymentError(null);
      onSuccess(paymentIntent.id);
    } else {
      onError("Payment not approved. Please try again.");
    }
    setProcessing(false);
  }

  // Formatar preço para exibição
  const formatAmount = (amt: number, curr: string): string => {
    const symbols: Record<string, string> = {
      usd: '$', eur: '€', gbp: '£', cad: 'C$', aud: 'A$',
      brl: 'R$', mxn: 'MX$', jpy: '¥', chf: 'CHF', inr: '₹',
    };
    const symbol = symbols[curr.toLowerCase()] || '$';
    const isZeroDecimal = curr.toLowerCase() === 'jpy';
    return `${symbol}${isZeroDecimal ? amt.toFixed(0) : amt.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Aviso para cartoes brasileiros */}
      {currency.toLowerCase() !== "brl" && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
          <p className="text-amber-300 text-sm font-medium">Brazilian card?</p>
          <p className="text-gray-400 text-xs mt-1">
            Brazilian cards only accept payments in BRL. If you use a Brazilian card, we will automatically convert and retry.
          </p>
        </div>
      )}

      {/* Apple Pay / Google Pay */}
      {canPaymentRequest && paymentRequest && (
        <div className="card-glow p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Quick payment
          </h2>
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: "default",
                  theme: "dark",
                  height: "48px",
                },
              },
            }}
          />
          <div className="flex items-center gap-3 text-gray-500 text-xs">
            <div className="flex-1 h-px bg-gray-800" />
            <span>or pay with card</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
        </div>
      )}

      {/* Card Element */}
      <div className="card-glow p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Card details
        </h2>
        <input
          type="text"
          placeholder="Name on card"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          autoComplete="cc-name"
          className="w-full px-4 py-3 input-glow text-sm uppercase"
        />
        <div className="p-3 input-glow rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "14px",
                  color: "#fff",
                  "::placeholder": { color: "#4B5563" },
                  iconColor: "#8B5CF6",
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>

        {paymentError && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-lg mt-0.5">!</span>
              <div className="flex-1">
                <h4 className="text-red-400 font-semibold text-sm">{paymentError.title}</h4>
                <p className="text-gray-300 text-sm mt-1">{paymentError.message}</p>
                <p className="text-gray-400 text-xs mt-2">{paymentError.action}</p>
                {paymentError.isRetryable && (
                  <button
                    type="button"
                    onClick={() => setPaymentError(null)}
                    className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleCardSubmit}
          disabled={!stripe || processing || loading}
          className="w-full py-3.5 btn-cta text-base disabled:opacity-50"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            <>Pay {formatAmount(amount, currency)}</>
          )}
        </button>
      </div>
    </div>
  );
}

export function StripePayment(props: Props) {
  return (
    <Elements
      key={props.clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#8B5CF6",
            colorBackground: "#0A0A0F",
            colorText: "#ffffff",
          },
        },
      }}
    >
      <StripeForm {...props} />
    </Elements>
  );
}
