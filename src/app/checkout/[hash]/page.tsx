import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, productOffers, orderBumps } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
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
    title: product.checkoutTitle || `Comprar ${product.name}`,
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

  // Buscar ofertas ativas
  const offers = await db
    .select()
    .from(productOffers)
    .where(and(eq(productOffers.productId, product.id), eq(productOffers.isActive, true)));

  // Buscar order bumps
  const bumps = await db
    .select()
    .from(orderBumps)
    .where(and(eq(orderBumps.productId, product.id), eq(orderBumps.isActive, true)));

  // Determinar oferta: por hash na URL ou default
  const offerHash = searchParams.offer;
  const selectedOffer = offerHash
    ? offers.find((o) => o.hash === offerHash)
    : offers.find((o) => o.isDefault) || null;

  const price = selectedOffer ? Number(selectedOffer.price) : Number(product.price);

  // UTM params
  const utm = {
    utmSource: searchParams.utm_source || searchParams.src || "",
    utmMedium: searchParams.utm_medium || "",
    utmCampaign: searchParams.utm_campaign || "",
    utmContent: searchParams.utm_content || "",
    utmTerm: searchParams.utm_term || "",
  };

  return (
    <>
      {/* Tracking pixels */}
      {product.facebookPixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
              (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init','${product.facebookPixelId}');
              fbq('track','PageView');
              fbq('track','InitiateCheckout',{value:${price},currency:'BRL'});
            `,
          }}
        />
      )}
      {product.googleAnalyticsId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${product.googleAnalyticsId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
                gtag('js',new Date());gtag('config','${product.googleAnalyticsId}');
                gtag('event','begin_checkout',{value:${price},currency:'BRL'});
              `,
            }}
          />
        </>
      )}

      <div
        className="min-h-screen py-6 px-4"
        style={{ backgroundColor: "#000000" }}
      >
        <div className="max-w-lg mx-auto">
          {/* Header do produto */}
          <div className="text-center mb-6">
            {product.checkoutImage && (
              <img
                src={product.checkoutImage}
                alt={product.name}
                className="w-24 h-24 rounded-xl mx-auto mb-4 object-cover border border-[rgba(139,92,246,0.2)]"
              />
            )}
            <h1 className="text-xl font-bold text-white">
              {product.checkoutTitle || product.name}
            </h1>
            {product.checkoutDescription && (
              <p className="text-gray-400 text-sm mt-1">
                {product.checkoutDescription}
              </p>
            )}
          </div>

          <CheckoutForm
            product={{
              id: product.id,
              hash: product.hash,
              name: product.name,
              price,
              pixEnabled: product.pixEnabled ?? true,
              cardEnabled: product.cardEnabled ?? true,
              boletoEnabled: product.boletoEnabled ?? false,
              maxInstallments: product.maxInstallments ?? 12,
              buttonColor: product.checkoutButtonColor || "#3b82f6",
              buttonText: product.checkoutButtonText || "Finalizar compra",
              facebookPixelId: product.facebookPixelId,
              googleAnalyticsId: product.googleAnalyticsId,
            }}
            offer={selectedOffer ? { hash: selectedOffer.hash, price: Number(selectedOffer.price) } : null}
            bumps={bumps.map((b) => ({
              id: b.id,
              title: b.title,
              description: b.description,
              price: Number(b.price),
            }))}
            utm={utm}
          />
        </div>
      </div>
    </>
  );
}
