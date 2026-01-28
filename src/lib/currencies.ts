// Moedas suportadas pelo sistema
export const SUPPORTED_CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', flag: '🇧🇷' },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX', flag: '🇲🇽' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', flag: '🇯🇵', zeroDecimal: true },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', flag: '🇨🇭' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

// Lista de países com suas moedas
export const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'IE', name: 'Ireland', currency: 'EUR' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'AR', name: 'Argentina', currency: 'USD' },
  { code: 'CL', name: 'Chile', currency: 'USD' },
  { code: 'CO', name: 'Colombia', currency: 'USD' },
  { code: 'PE', name: 'Peru', currency: 'USD' },
] as const;

export type CountryCode = typeof COUNTRIES[number]['code'];

// Mapeamento rápido de país para moeda
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR',
  BR: 'BRL', MX: 'MXN', JP: 'JPY', CH: 'CHF', IN: 'INR',
  AR: 'USD', CL: 'USD', CO: 'USD', PE: 'USD',
};

// Formatar preço na moeda (amount em centavos)
export function formatPrice(amountInCents: number, currencyCode: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return `$${(amountInCents / 100).toFixed(2)}`;
  }

  const isZeroDecimal = 'zeroDecimal' in currency && currency.zeroDecimal;
  const amount = isZeroDecimal ? amountInCents : amountInCents / 100;

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(amount);
}

// Formatar preço de display (amount já em valor real, não centavos)
export function formatDisplayPrice(amount: number, currencyCode: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return `$${amount.toFixed(2)}`;
  }

  const isZeroDecimal = 'zeroDecimal' in currency && currency.zeroDecimal;

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(amount);
}

// Converter valor de display para centavos do Stripe
export function toStripeAmount(displayAmount: number, currencyCode: CurrencyCode): number {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  const isZeroDecimal = currency && 'zeroDecimal' in currency && currency.zeroDecimal;
  return isZeroDecimal ? Math.round(displayAmount) : Math.round(displayAmount * 100);
}

// Converter de centavos para valor de display
export function fromCents(amountInCents: number, currencyCode: CurrencyCode): number {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  const isZeroDecimal = currency && 'zeroDecimal' in currency && currency.zeroDecimal;
  return isZeroDecimal ? amountInCents : amountInCents / 100;
}

// Obter moeda do país
export function getCurrencyFromCountry(countryCode: string): CurrencyCode {
  const currency = COUNTRY_TO_CURRENCY[countryCode];
  if (currency && SUPPORTED_CURRENCIES[currency]) {
    return currency;
  }
  return 'USD'; // Fallback para USD
}

// Obter símbolo da moeda
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  return currency?.symbol || '$';
}

// Verificar se moeda é suportada
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code in SUPPORTED_CURRENCIES;
}
