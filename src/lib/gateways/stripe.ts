import type { GatewayCredentials, GatewayProvider, PaymentInput, PaymentResult, PaymentStatus, RefundResult } from "./types";
import crypto from "crypto";

export class StripeGateway implements GatewayProvider {
  name = "stripe";
  private secretKey: string;
  private webhookSecret: string;
  private baseUrl = "https://api.stripe.com/v1";

  constructor(credentials: GatewayCredentials) {
    if (!credentials.secretKey) throw new Error("Stripe: secretKey obrigatoria");
    this.secretKey = credentials.secretKey;
    this.webhookSecret = credentials.webhookSecret || "";
  }

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...options.headers,
      },
    });
    return res.json();
  }

  private toFormData(obj: Record<string, unknown>, prefix = ""): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (typeof value === "object" && !Array.isArray(value)) {
        parts.push(this.toFormData(value as Record<string, unknown>, fullKey));
      } else {
        parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.filter(Boolean).join("&");
  }

  async createPayment(data: PaymentInput): Promise<PaymentResult> {
    // Criar Payment Intent
    const params: Record<string, unknown> = {
      amount: Math.round(data.amount * 100),
      currency: (data.currency || "brl").toLowerCase(),
      description: data.description || "Pagamento NexFy",
      metadata: {
        external_ref: data.externalRef || "",
        customer_cpf: data.customer.cpf,
      },
    };

    if (data.paymentMethod === "pix") {
      params.payment_method_types = ["pix"];
    } else if (data.paymentMethod === "credit_card") {
      params.payment_method_types = ["card"];
      if (data.cardToken) {
        params.payment_method = data.cardToken;
        params.confirm = "true";
      }
    } else if (data.paymentMethod === "boleto") {
      params.payment_method_types = ["boleto"];
    }

    // Criar ou buscar customer
    const customerResult = await this.request("/customers", {
      method: "POST",
      body: this.toFormData({
        email: data.customer.email,
        name: data.customer.name,
        phone: data.customer.phone || "",
      }),
    });

    if (customerResult.id) {
      params.customer = customerResult.id;
    }

    const result = await this.request("/payment_intents", {
      method: "POST",
      body: this.toFormData(params),
    });

    if (result.error) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: result.error.message, raw: result };
    }

    const status = this.mapStatus(result.status);
    return {
      success: status !== "refused",
      gatewayPaymentId: result.id,
      status,
      cardLastFour: result.charges?.data?.[0]?.payment_method_details?.card?.last4,
      cardBrand: result.charges?.data?.[0]?.payment_method_details?.card?.brand,
      raw: result,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.request(`/payment_intents/${paymentId}`);
    return {
      gatewayPaymentId: paymentId,
      status: this.mapStatus(result.status),
      paidAt: result.charges?.data?.[0]?.created
        ? new Date(result.charges.data[0].created * 1000)
        : undefined,
      raw: result,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    const params: Record<string, unknown> = { payment_intent: paymentId };
    if (amount) params.amount = Math.round(amount * 100);

    const result = await this.request("/refunds", {
      method: "POST",
      body: this.toFormData(params),
    });

    if (result.error) {
      return { success: false, error: result.error.message, raw: result };
    }

    return { success: true, refundId: result.id, raw: result };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    try {
      const parts = signature.split(",");
      const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
      const v1 = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
      if (!timestamp || !v1) return false;

      const signedPayload = `${timestamp}.${payload}`;
      const expectedSig = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(signedPayload)
        .digest("hex");

      return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(v1));
    } catch {
      return false;
    }
  }

  private mapStatus(stripeStatus: string): PaymentResult["status"] {
    const map: Record<string, PaymentResult["status"]> = {
      succeeded: "approved",
      requires_payment_method: "refused",
      requires_confirmation: "pending",
      requires_action: "pending",
      processing: "pending",
      canceled: "refused",
    };
    return map[stripeStatus] || "pending";
  }
}
