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

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface Props {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  amount: number;
  currency?: string;
  loading: boolean;
}

function StripeForm({ clientSecret, onSuccess, onError, amount, currency = "brl", loading }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canPaymentRequest, setCanPaymentRequest] = useState(false);

  // Apple Pay / Google Pay via Payment Request API
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: "BR",
      currency,
      total: {
        label: "Total",
        amount: Math.round(amount * 100),
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
        onError(error.message || "Erro no pagamento");
        return;
      }

      ev.complete("success");

      if (paymentIntent?.status === "requires_action") {
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
        if (confirmError) {
          onError(confirmError.message || "Erro na confirmacao");
          return;
        }
      }

      onSuccess(paymentIntent?.id || "");
    });
  }, [stripe, amount, currency, clientSecret, onSuccess, onError]);

  async function handleCardSubmit(e: React.FormEvent) {
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
    <div className="space-y-4">
      {/* Apple Pay / Google Pay */}
      {canPaymentRequest && paymentRequest && (
        <div className="card-glow p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Pagamento rapido
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
            <span>ou pague com cartao</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
        </div>
      )}

      {/* Card Element */}
      <form onSubmit={handleCardSubmit} className="card-glow p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Dados do cartao
        </h2>
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

        <button
          type="submit"
          disabled={!stripe || processing || loading}
          className="w-full py-3.5 btn-cta text-base disabled:opacity-50"
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
            <>Pagar R$ {amount.toFixed(2)}</>
          )}
        </button>
      </form>
    </div>
  );
}

export function StripePayment(props: Props) {
  return (
    <Elements
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
