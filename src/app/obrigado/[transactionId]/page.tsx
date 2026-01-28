import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, products } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { ThankYouClient } from "./ThankYouClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compra realizada!",
};

interface Props {
  params: { transactionId: string };
}

export default async function ThankYouPage({ params }: Props) {
  const id = parseInt(params.transactionId);
  if (isNaN(id)) notFound();

  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!transaction) notFound();

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, transaction.productId))
    .limit(1);

  if (!product) notFound();

  return (
    <>
      {/* Tracking pixels - Purchase event */}
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
              fbq('track','Purchase',{value:${Number(transaction.amount)},currency:'BRL',content_ids:['${product.id}']});
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
                gtag('event','purchase',{transaction_id:'${transaction.id}',value:${Number(transaction.amount)},currency:'BRL'});
              `,
            }}
          />
        </>
      )}

      <div className="min-h-screen bg-gray-950 py-10 px-4">
        <div className="max-w-lg mx-auto">
          <ThankYouClient
            transaction={{
              id: transaction.id,
              status: transaction.status,
              amount: Number(transaction.amount),
              paymentMethod: transaction.paymentMethod,
              pixCode: transaction.pixCode,
              pixQrCode: transaction.pixQrCode,
              boletoUrl: transaction.boletoUrl,
              customerName: transaction.customerName,
              customerEmail: transaction.customerEmail,
            }}
            product={{
              name: product.name,
              deliveryType: product.deliveryType,
              deliveryUrl: product.deliveryUrl,
              thankYouPageUrl: product.thankYouPageUrl,
            }}
          />
        </div>
      </div>
    </>
  );
}
