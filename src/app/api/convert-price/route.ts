import { NextResponse } from "next/server";

const EXCHANGE_API = "https://latest.currency-api.pages.dev/v1/currencies";

// Taxas de fallback caso a API falhe
const FALLBACK_RATES_FROM_USD: Record<string, number> = {
  usd: 1, eur: 0.92, gbp: 0.79, cad: 1.36, aud: 1.53,
  brl: 4.97, mxn: 17.15, jpy: 148.5, chf: 0.88, inr: 83.1,
};

async function getRate(from: string, to: string): Promise<number> {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  try {
    const response = await fetch(`${EXCHANGE_API}/${fromLower}.json`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) throw new Error("API failed");

    const data = await response.json();
    const rates = data[fromLower];
    if (rates && rates[toLower]) return rates[toLower];

    throw new Error("Rate not found");
  } catch {
    // Fallback: calcular a partir de USD
    const fromRate = FALLBACK_RATES_FROM_USD[fromLower] || 1;
    const toRate = FALLBACK_RATES_FROM_USD[toLower] || 1;
    return toRate / fromRate;
  }
}

export async function POST(request: Request) {
  try {
    const { amount, fromCurrency, toCurrency } = await request.json();

    if (amount === undefined || !fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: "Missing required fields: amount, fromCurrency, toCurrency" },
        { status: 400 }
      );
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return NextResponse.json({
        success: true,
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency: from,
        toCurrency: to,
        rate: 1,
      });
    }

    const rate = await getRate(from, to);

    const isZeroDecimal = to === "JPY";
    const convertedAmount = isZeroDecimal
      ? Math.round(amount * rate)
      : Math.round(amount * rate * 100) / 100;

    return NextResponse.json({
      success: true,
      originalAmount: amount,
      convertedAmount,
      fromCurrency: from,
      toCurrency: to,
      rate,
    });
  } catch (error) {
    console.error("Convert price error:", error);
    return NextResponse.json(
      { error: "Failed to convert price" },
      { status: 500 }
    );
  }
}
