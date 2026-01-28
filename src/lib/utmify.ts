const UTMIFY_API_URL = "https://api.utmify.com.br/api-credentials/orders";

/**
 * Envia venda para UTMify.
 * Docs: POST /v1/sales para registrar, PATCH para atualizar status.
 */
export async function sendSaleToUtmify(data: {
  orderId: string;
  platform: string;
  paymentMethod: "pix" | "credit_card" | "boleto";
  status: "approved" | "pending" | "refunded" | "refused" | "chargeback";
  customerEmail: string;
  customerPhone?: string;
  customerDocument?: string;
  amount: number;
  planName?: string;
  offerName?: string;
  createdAt?: Date;
  approvedAt?: Date;
  refundedAt?: Date;
  utm?: {
    src?: string;
    sck?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
}) {
  const apiKey = process.env.UTMIFY_API_KEY;
  if (!apiKey) return null;

  const statusMap: Record<string, string> = {
    approved: "paid",
    pending: "waiting_payment",
    refunded: "refunded",
    refused: "refused",
    chargeback: "chargedback",
  };

  const paymentMethodMap: Record<string, number> = {
    credit_card: 1,
    boleto: 2,
    pix: 3,
  };

  const body = {
    orderId: data.orderId,
    platform: data.platform || "NexFy",
    paymentMethod: paymentMethodMap[data.paymentMethod] || 3,
    status: statusMap[data.status] || "waiting_payment",
    "customer.email": data.customerEmail,
    "customer.phone": data.customerPhone || "",
    "customer.document": data.customerDocument || "",
    "offer.name": data.offerName || "",
    "offer.paymentType": "one_time",
    "offer.plans[0].name": data.planName || "Compra Avulsa",
    "offer.plans[0].quantity": 1,
    "offer.plans[0].priceInCents": Math.round(data.amount * 100),
    ...(data.createdAt && { createdAt: data.createdAt.toISOString() }),
    ...(data.approvedAt && { approvedDate: data.approvedAt.toISOString() }),
    ...(data.refundedAt && { refundedDate: data.refundedAt.toISOString() }),
    ...(data.utm?.src && { "trackingParameters.src": data.utm.src }),
    ...(data.utm?.sck && { "trackingParameters.sck": data.utm.sck }),
    ...(data.utm?.utm_source && { "trackingParameters.utm_source": data.utm.utm_source }),
    ...(data.utm?.utm_medium && { "trackingParameters.utm_medium": data.utm.utm_medium }),
    ...(data.utm?.utm_campaign && { "trackingParameters.utm_campaign": data.utm.utm_campaign }),
    ...(data.utm?.utm_content && { "trackingParameters.utm_content": data.utm.utm_content }),
    ...(data.utm?.utm_term && { "trackingParameters.utm_term": data.utm.utm_term }),
  };

  try {
    const res = await fetch(UTMIFY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("UTMify error:", res.status, errText);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("UTMify send error:", err);
    return null;
  }
}
