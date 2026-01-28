import { NextResponse } from "next/server";

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

    // Se mesma moeda, retornar valor original
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

    // Buscar taxa de câmbio
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    const ratesResponse = await fetch(
      `${baseUrl}/api/exchange-rates?base=${fromCurrency.toLowerCase()}`,
      { cache: 'no-store' }
    );

    const ratesData = await ratesResponse.json();

    if (!ratesData.success) {
      throw new Error("Failed to get exchange rates");
    }

    const rate = ratesData.rates[toCurrency.toLowerCase()];

    if (!rate) {
      return NextResponse.json(
        { error: `Currency ${toCurrency} not supported` },
        { status: 400 }
      );
    }

    // Converter e arredondar para 2 casas decimais (ou 0 para JPY)
    const isZeroDecimal = to === 'JPY';
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
