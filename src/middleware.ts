import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Mapeamento de país para moeda
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR',
  BR: 'BRL', MX: 'MXN', JP: 'JPY', CH: 'CHF', IN: 'INR',
  AR: 'USD', CL: 'USD', CO: 'USD', PE: 'USD',
};

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'BRL', 'MXN', 'JPY', 'CHF', 'INR'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes - no auth needed
  const publicPaths = [
    "/login",
    "/checkout",
    "/obrigado",
    "/api/webhooks",
    "/api/payments",
    "/api/coupons/validate",
    "/api/cron",
    "/api/auth",
    "/api/exchange-rates",
    "/api/convert-price",
    "/api/geo",
    "/termos",
    "/privacidade",
  ];

  const isPublic = publicPaths.some((p) => pathname.startsWith(p)) || pathname === "/";

  // Criar response base
  let response = NextResponse.next();

  // ========== DETECÇÃO DE PAÍS/MOEDA ==========
  // Só para rotas de checkout e se não tiver cookie
  if (pathname.startsWith('/checkout')) {
    const existingCountry = req.cookies.get('user_country')?.value;
    const existingCurrency = req.cookies.get('user_currency')?.value;

    if (!existingCountry || !existingCurrency) {
      // Detectar país via header do Vercel (funciona automaticamente no Vercel)
      const detectedCountry = req.headers.get('x-vercel-ip-country') ||
                              req.geo?.country ||
                              'US';

      // Mapear país para moeda
      let detectedCurrency = COUNTRY_TO_CURRENCY[detectedCountry] || 'USD';

      // Garantir que a moeda é suportada
      if (!SUPPORTED_CURRENCIES.includes(detectedCurrency)) {
        detectedCurrency = 'USD';
      }

      // Setar cookies com país e moeda detectados
      response.cookies.set('user_country', detectedCountry, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 ano
        sameSite: 'lax',
      });

      response.cookies.set('user_currency', detectedCurrency, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
  }
  // ========== FIM DETECÇÃO ==========

  // Se é rota pública, permitir acesso
  if (isPublic) {
    return response;
  }

  // Check JWT token para rotas protegidas
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  // No token = redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;

  // Role-based access
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/dashboard") && !["admin", "producer"].includes(role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/member") && !["admin", "customer"].includes(role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.webp$).*)",
  ],
};
