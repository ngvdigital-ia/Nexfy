import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export async function GET(req: NextRequest) {
  // Admin only
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const pi = req.nextUrl.searchParams.get("pi");
  if (!pi) {
    return NextResponse.json({ error: "Payment Intent ID required (?pi=pi_xxx)" }, { status: 400 });
  }

  try {
    const [piRes, chargesRes] = await Promise.all([
      fetch(`https://api.stripe.com/v1/payment_intents/${pi}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      }),
      fetch(`https://api.stripe.com/v1/charges?payment_intent=${pi}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      }),
    ]);

    const paymentIntent = await piRes.json();
    const charges = await chargesRes.json();

    if (paymentIntent.error) {
      return NextResponse.json({ error: paymentIntent.error.message }, { status: 400 });
    }

    const diagnosis = {
      paymentIntentId: pi,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      lastError: paymentIntent.last_payment_error
        ? {
            type: paymentIntent.last_payment_error.type,
            code: paymentIntent.last_payment_error.code,
            declineCode: paymentIntent.last_payment_error.decline_code,
            message: paymentIntent.last_payment_error.message,
            card: paymentIntent.last_payment_error.payment_method?.card
              ? {
                  brand: paymentIntent.last_payment_error.payment_method.card.brand,
                  funding: paymentIntent.last_payment_error.payment_method.card.funding,
                  country: paymentIntent.last_payment_error.payment_method.card.country,
                  last4: paymentIntent.last_payment_error.payment_method.card.last4,
                }
              : null,
          }
        : null,
      charges: (charges.data || []).map((c: any) => ({
        id: c.id,
        status: c.status,
        outcome: c.outcome,
        failureCode: c.failure_code,
        failureMessage: c.failure_message,
        card: c.payment_method_details?.card
          ? {
              brand: c.payment_method_details.card.brand,
              funding: c.payment_method_details.card.funding,
              country: c.payment_method_details.card.country,
              last4: c.payment_method_details.card.last4,
            }
          : null,
      })),
      analysis: analyzeOutcome(charges.data?.[0]?.outcome),
    };

    return NextResponse.json(diagnosis);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function analyzeOutcome(outcome: any) {
  if (!outcome) return { source: "unknown", recommendation: "Nenhum dado de outcome disponivel" };

  const analysis: any = {
    source: outcome.type,
    networkStatus: outcome.network_status,
    reason: outcome.reason,
    riskLevel: outcome.risk_level,
    riskScore: outcome.risk_score,
    sellerMessage: outcome.seller_message,
  };

  if (outcome.type === "blocked") {
    analysis.recommendation =
      "BLOQUEADO PELO STRIPE RADAR. Verificar regras em Dashboard > Radar > Rules.";
  } else if (outcome.type === "issuer_declined") {
    analysis.recommendation = `RECUSADO PELO EMISSOR DO CARTAO (${outcome.reason}). Cliente deve contatar seu banco ou usar outro cartao.`;
  } else if (outcome.type === "invalid") {
    analysis.recommendation = "DADOS INVALIDOS. Verificar numero do cartao, validade ou CVC.";
  } else if (outcome.type === "authorized") {
    analysis.recommendation = "AUTORIZADO com sucesso.";
  }

  return analysis;
}
