import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { products, productOffers, orderBumps } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import Script from "next/script";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCurrencyFromCountry, type CurrencyCode } from "@/lib/currencies";
import type { Metadata } from "next";

interface Props {
  params: { hash: string };
  searchParams: Record<string, string | undefined>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.hash, params.hash), eq(products.isActive, true)))
    .limit(1);

  if (!product) return { title: "Checkout" };

  return {
    title: product.checkoutTitle || `Buy ${product.name}`,
    description: product.checkoutDescription || product.description || "",
  };
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.hash, params.hash), eq(products.isActive, true)))
    .limit(1);

  if (!product) notFound();

  const offers = await db
    .select()
    .from(productOffers)
    .where(and(eq(productOffers.productId, product.id), eq(productOffers.isActive, true)));

  const bumps = await db
    .select()
    .from(orderBumps)
    .where(and(eq(orderBumps.productId, product.id), eq(orderBumps.isActive, true)));

  const offerHash = searchParams.offer;
  const selectedOffer = offerHash
    ? offers.find((o) => o.hash === offerHash)
    : offers.find((o) => o.isDefault) || null;

  const price = selectedOffer ? Number(selectedOffer.price) : Number(product.price);

  const utm = {
    utmSource: searchParams.utm_source || searchParams.src || "",
    utmMedium: searchParams.utm_medium || "",
    utmCampaign: searchParams.utm_campaign || "",
    utmContent: searchParams.utm_content || "",
    utmTerm: searchParams.utm_term || "",
  };

  const cookieStore = cookies();
  const userCountry = cookieStore.get("user_country")?.value || "US";
  const savedCurrency = cookieStore.get("user_currency")?.value;

  const validCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "BRL", "MXN", "JPY", "CHF", "INR"];
  const userCurrency: CurrencyCode = (savedCurrency && validCurrencies.includes(savedCurrency))
    ? savedCurrency as CurrencyCode
    : getCurrencyFromCountry(userCountry);

  return (
    <>
      {/* Tracking pixels */}
      {product.facebookPixelId && (
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
              (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init','${product.facebookPixelId}');
              fbq('track','PageView');
              fbq('track','InitiateCheckout',{value:${price},currency:'USD'});
            `,
          }}
        />
      )}
      {product.googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${product.googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
                gtag('js',new Date());gtag('config','${product.googleAnalyticsId}');
                gtag('event','begin_checkout',{value:${price},currency:'USD'});
              `,
            }}
          />
        </>
      )}

      <div
        className="checkout-light min-h-screen py-8 px-4"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        <div className="max-w-6xl mx-auto">
          <CheckoutForm
            product={{
              id: product.id,
              hash: product.hash,
              name: product.name,
              price,
              baseCurrency: (product.currency as CurrencyCode) || "USD",
              pixEnabled: product.pixEnabled ?? true,
              cardEnabled: product.cardEnabled ?? true,
              boletoEnabled: product.boletoEnabled ?? false,
              maxInstallments: product.maxInstallments ?? 12,
              buttonColor: product.checkoutButtonColor || "#22C55E",
              buttonText: product.checkoutButtonText || "Buy now",
              facebookPixelId: product.facebookPixelId,
              googleAnalyticsId: product.googleAnalyticsId,
              gateway: product.gateway || "mercadopago",
              checkoutImage: product.checkoutImage,
              checkoutTitle: product.checkoutTitle,
            }}
            offer={selectedOffer ? { hash: selectedOffer.hash, price: Number(selectedOffer.price) } : null}
            bumps={bumps.map((b) => ({
              id: b.id,
              title: b.title,
              description: b.description,
              price: Number(b.price),
            }))}
            utm={utm}
            initialCountry={userCountry}
            initialCurrency={userCurrency}
          />
        </div>
      </div>
    </>
  );
}
