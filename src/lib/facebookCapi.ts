import crypto from "crypto";

const FB_GRAPH_URL = "https://graph.facebook.com/v18.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendFacebookPurchaseEvent(data: {
  pixelId: string;
  accessToken: string;
  email: string;
  phone?: string;
  amount: number;
  currency: string;
  transactionId: number;
  productName?: string;
  productId?: number;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
}) {
  const userData: Record<string, unknown> = {};
  if (data.email) userData.em = [sha256(data.email)];
  if (data.phone) userData.ph = [sha256(data.phone.replace(/\D/g, ""))];
  if (data.clientIpAddress) userData.client_ip_address = data.clientIpAddress;
  if (data.clientUserAgent) userData.client_user_agent = data.clientUserAgent;
  if (data.fbc) userData.fbc = data.fbc;
  if (data.fbp) userData.fbp = data.fbp;

  const eventData = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase_${data.transactionId}`,
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: data.amount,
          currency: data.currency || "BRL",
          content_ids: [String(data.productId)],
          content_name: data.productName,
          content_type: "product",
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `${FB_GRAPH_URL}/${data.pixelId}/events?access_token=${data.accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Facebook CAPI error:", res.status, errText);
      return null;
    }

    const result = await res.json();
    return result;
  } catch (err) {
    console.error("Facebook CAPI send error:", err);
    return null;
  }
}
