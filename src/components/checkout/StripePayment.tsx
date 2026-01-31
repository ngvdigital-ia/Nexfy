"use client";

import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementReadyEvent } from "@stripe/stripe-js";
import { getErrorMessage } from "@/lib/stripe-errors";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface Props {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  onCurrencyError?: () => void;
  amount: number;
  currency?: string;
  loading: boolean;
  disabled?: boolean;
  countryCode?: string;
}

function isCurrencyError(error: any): boolean {
  const msg = (error?.message || "").toLowerCase();
  const code = error?.code || "";
  const declineCode = error?.decline_code || "";

  return (
    code === "card_not_supported" ||
    (code === "card_declined" && declineCode === "currency_not_supported") ||
    declineCode === "card_not_supported" ||
    declineCode === "currency_not_supported" ||
    msg.includes("not supported for this currency") ||
    msg.includes("brazilian cards in brl") ||
    msg.includes("currency_not_supported")
  );
}

type PaymentTab = "card" | "google_pay" | "apple_pay";

/* ── SVG Icons ── */

function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="32" height="24" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="23" height="17" rx="2.5" stroke="currentColor" />
      <rect x="0" y="4" width="24" height="4" fill="currentColor" />
      <rect x="3" y="12" width="6" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

function GooglePayBadge() {
  return (
    <img src="/img/gpay.webp" alt="Google Pay" width="47" height="25" className="h-[25px] w-auto" />
  );
}

function ApplePayBadge() {
  return (
    <img src="/img/apple-pay.svg" alt="Apple Pay" width="42" height="25" className="h-[25px] w-auto" />
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="8" fill="#22C55E"/>
      <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StripeForm({ clientSecret, onSuccess, onError, onCurrencyError, amount, currency = "usd", loading, disabled, countryCode }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("card");
  const [expressReady, setExpressReady] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [expressAvailable, setExpressAvailable] = useState<{
    googlePay: boolean;
    applePay: boolean;
  }>({ googlePay: false, applePay: false });

  // Refresh Elements session when amount changes (e.g. bump toggled)
  const prevAmountRef = useRef(amount);
  useEffect(() => {
    if (prevAmountRef.current !== amount && elements) {
      prevAmountRef.current = amount;
      (elements as any).fetchUpdates?.();
    }
  }, [amount, elements]);

  async function confirmPayment() {
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/obrigado`,
        payment_method_data: {
          billing_details: {
            name: cardholderName || undefined,
            address: {
              country: countryCode || undefined,
            },
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      if (isCurrencyError(error) && onCurrencyError) {
        setProcessing(false);
        onCurrencyError();
        return;
      }
      const errorInfo = getErrorMessage(error.code || (error as any).decline_code);
      onError(errorInfo.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else if (paymentIntent?.status === "requires_action") {
      const { error: confirmError, paymentIntent: confirmedIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/obrigado`,
          },
          redirect: "if_required",
        });

      if (confirmError) {
        const errorInfo = getErrorMessage(confirmError.code || (confirmError as any).decline_code);
        onError(errorInfo.message);
      } else if (confirmedIntent?.status === "succeeded") {
        onSuccess(confirmedIntent.id);
      } else {
        onError("Payment not approved. Please try again.");
      }
    } else {
      onError("Payment not approved. Please try again.");
    }

    setProcessing(false);
  }

  async function handleExpressCheckoutConfirm() {
    await confirmPayment();
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    await confirmPayment();
  }

  function handleExpressReady(event: StripeExpressCheckoutElementReadyEvent) {
    const { availablePaymentMethods } = event;
    if (availablePaymentMethods) {
      setExpressAvailable({
        googlePay: !!availablePaymentMethods.googlePay,
        applePay: !!availablePaymentMethods.applePay,
      });
    }
    setExpressReady(true);
  }

  const isExpressTab = paymentTab === "google_pay" || paymentTab === "apple_pay";

  const tabs: { id: PaymentTab; label: string; icon: React.ReactNode }[] = [
    { id: "card", label: "Credit Card", icon: <CardIcon className="w-5 h-[14px]" /> },
    { id: "google_pay", label: "Google Pay", icon: <GooglePayBadge /> },
    { id: "apple_pay", label: "Apple Pay", icon: <ApplePayBadge /> },
  ];

  return (
    <div className="space-y-4">
      {/* Payment method tabs */}
      <div className="space-y-2">
        {/* Top row: Credit Card + Google Pay */}
        <div className="grid grid-cols-2 gap-2">
          {tabs.slice(0, 2).map((tab) => {
            const isSelected = paymentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-lg py-3 px-3 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-2 border-[#22C55E] bg-white"
                    : "border border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#9CA3AF]"
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 right-2">
                    <CheckIcon />
                  </span>
                )}
                <span className="text-[#1F2937]">{tab.icon}</span>
                <span className="text-sm font-medium text-[#4B5563]">{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* Apple Pay - always visible full width */}
        {(() => {
          const tab = tabs[2];
          const isSelected = paymentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPaymentTab(tab.id)}
              className={`relative w-full flex items-center gap-2 rounded-lg py-3 px-3 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-2 border-[#22C55E] bg-white"
                  : "border border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#9CA3AF]"
              }`}
            >
              {isSelected && (
                <span className="absolute -top-1.5 right-2">
                  <CheckIcon />
                </span>
              )}
              <span className="text-[#1F2937]">{tab.icon}</span>
              <span className="text-sm font-medium text-[#4B5563]">{tab.label}</span>
            </button>
          );
        })()}
      </div>

      {/* Express Checkout - mounted only on Google Pay tab */}
      {paymentTab === "google_pay" && (
        <div className="space-y-3">
          <p className="text-sm text-[#6B7280] text-center">
            Tap the button below to pay with Google Pay
          </p>
          <ExpressCheckoutElement
            key={`gpay-${amount}`}
            onConfirm={handleExpressCheckoutConfirm}
            onReady={handleExpressReady}
            options={{
              buttonType: {
                googlePay: "buy",
              },
              buttonTheme: {
                googlePay: "black",
              },
              buttonHeight: 48,
              layout: {
                maxColumns: 1,
                maxRows: 1,
                overflow: "auto",
              },
              paymentMethods: {
                googlePay: "always",
                applePay: "never",
              },
            }}
          />
        </div>
      )}

      {/* Apple Pay - render ExpressCheckoutElement on Safari/Apple devices, fallback message otherwise */}
      {paymentTab === "apple_pay" && (
        <div className="space-y-3">
          <p className="text-sm text-[#6B7280] text-center">
            Tap the button below to pay with Apple Pay
          </p>
          <ExpressCheckoutElement
            key={`applepay-${amount}`}
            onConfirm={handleExpressCheckoutConfirm}
            onReady={handleExpressReady}
            options={{
              buttonType: {
                applePay: "buy",
              },
              buttonTheme: {
                applePay: "black",
              },
              buttonHeight: 48,
              layout: {
                maxColumns: 1,
                maxRows: 1,
                overflow: "auto",
              },
              paymentMethods: {
                applePay: "always",
                googlePay: "never",
              },
            }}
          />
          {expressReady && !expressAvailable.applePay && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 text-center">
              <img src="/img/apple-pay.svg" alt="Apple Pay" width="54" height="32" className="h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[#6B7280]">
                Apple Pay is available on Safari with an Apple device.
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Use an iPhone, iPad, or Mac with Safari to pay with Apple Pay.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Card form - always mounted, hidden via CSS when not on card tab */}
      <form onSubmit={handleCardSubmit} className={paymentTab === "card" ? "space-y-4" : "hidden"}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[#6B7280] mb-1">Name on card</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Full name as displayed on card"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1F2937] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-colors"
            />
          </div>
          <PaymentElement
            options={{
              layout: "tabs",
              loader: "never",
              fields: {
                billingDetails: {
                  name: "never",
                },
              },
              wallets: {
                applePay: "never",
                googlePay: "never",
              },
            }}
          />
        </div>
      </form>

      {/* Buy button - only on card tab */}
      {paymentTab === "card" && (
        <button
          type="button"
          onClick={(e: any) => handleCardSubmit(e)}
          disabled={!stripe || processing || loading || disabled}
          className="w-full py-3.5 btn-cta text-base disabled:opacity-50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20"
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
            <span className="flex items-center justify-center gap-2">
              Buy now
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          )}
        </button>
      )}
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
        locale: 'en',
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#22C55E",
            colorBackground: "#FFFFFF",
            colorText: "#1F2937",
            colorDanger: "#EF4444",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "8px",
          },
          rules: {
            ".Input": {
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
            },
            ".Input:focus": {
              borderColor: "#22C55E",
              boxShadow: "0 0 0 1px #22C55E",
            },
            ".Label": {
              color: "#6B7280",
            },
          },
        },
      }}
    >
      <StripeForm {...props} />
    </Elements>
  );
}
