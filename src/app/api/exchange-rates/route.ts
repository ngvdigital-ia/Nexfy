import { NextResponse } from "next/server";

// Cache de taxas (atualiza a cada 1 hora)
let ratesCache: {
  rates: Record<string, number>;
  timestamp: number;
  baseCurrency: string;
} | null = null;

const ONE_HOUR = 60 * 60 * 1000;

// API gratuita de câmbio (sem necessidade de API key)
const EXCHANGE_API = "https://latest.currency-api.pages.dev/v1/currencies";

// Taxas de fallback (aproximadas) caso a API falhe
const FALLBACK_RATES_FROM_USD: Record<string, number> = {
  usd: 1,
  eur: 0.92,
  gbp: 0.79,
  cad: 1.36,
  aud: 1.53,
  brl: 4.97,
  mxn: 17.15,
  jpy: 148.5,
  chf: 0.88,
  inr: 83.1,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseCurrency = (searchParams.get("base") || "usd").toLowerCase();

  try {
    // Verificar cache
    if (
      ratesCache &&
      ratesCache.baseCurrency === baseCurrency &&
      Date.now() - ratesCache.timestamp < ONE_HOUR
    ) {
      return NextResponse.json({
        success: true,
        base: baseCurrency.toUpperCase(),
        rates: ratesCache.rates,
        cached: true,
      });
    }

    // Buscar taxas atualizadas
    const response = await fetch(`${EXCHANGE_API}/${baseCurrency}.json`, {
      next: { revalidate: 3600 }, // Cache do Next.js por 1 hora
    });

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }

    const data = await response.json();
    const rates = data[baseCurrency];

    if (!rates) {
      throw new Error("Invalid response from exchange API");
    }

    // Atualizar cache
    ratesCache = {
      rates,
      timestamp: Date.now(),
      baseCurrency,
    };

    return NextResponse.json({
      success: true,
      base: baseCurrency.toUpperCase(),
      rates,
      cached: false,
    });
  } catch (error) {
    console.error("Exchange rates error:", error);

    // Calcular taxas de fallback baseadas em USD
    let fallbackRates: Record<string, number>;

    if (baseCurrency === "usd") {
      fallbackRates = FALLBACK_RATES_FROM_USD;
    } else {
      // Converter de USD para a moeda base
      const baseRate = FALLBACK_RATES_FROM_USD[baseCurrency] || 1;
      fallbackRates = {};
      for (const [currency, rate] of Object.entries(FALLBACK_RATES_FROM_USD)) {
        fallbackRates[currency] = rate / baseRate;
      }
    }

    return NextResponse.json({
      success: true,
      base: baseCurrency.toUpperCase(),
      rates: fallbackRates,
      cached: false,
      fallback: true,
    });
  }
}
