"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface Props {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  amount: number;
  buttonColor: string;
  buttonText: string;
  loading: boolean;
}

function StripeForm({ clientSecret, onSuccess, onError, amount, buttonColor, buttonText, loading }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const card = elements.getElement(CardElement);
    if (!card) {
      onError("Elemento de cartao nao encontrado");
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (error) {
      onError(error.message || "Erro ao processar cartao");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      onError("Pagamento nao aprovado. Tente novamente.");
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Dados do cartao
        </h2>
        <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "14px",
                  color: "#fff",
                  "::placeholder": { color: "#6b7280" },
                  iconColor: "#6b7280",
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || loading}
        className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all disabled:opacity-50"
        style={{ backgroundColor: buttonColor }}
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processando...
          </span>
        ) : (
          <>{buttonText} - R$ {amount.toFixed(2)}</>
        )}
      </button>
    </form>
  );
}

export function StripeCardPayment(props: Props) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "night",
          variables: { colorPrimary: "#10b981" },
        },
      }}
    >
      <StripeForm {...props} />
    </Elements>
  );
}
