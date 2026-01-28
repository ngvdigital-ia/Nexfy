import type { GatewayCredentials, GatewayProvider, PaymentInput, PaymentResult, PaymentStatus, RefundResult } from "./types";
import crypto from "crypto";

export class BeehiveGateway implements GatewayProvider {
  name = "beehive";
  private apiKey: string;
  private baseUrl = "https://api.beehivepay.com/v1";

  constructor(credentials: GatewayCredentials) {
    if (!credentials.apiKey) throw new Error("Beehive: apiKey obrigatoria");
    this.apiKey = credentials.apiKey;
  }

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });
    return res.json();
  }

  async createPayment(data: PaymentInput): Promise<PaymentResult> {
    if (data.paymentMethod !== "credit_card") {
      return { success: false, gatewayPaymentId: "", status: "refused", error: "Beehive suporta apenas cartao de credito" };
    }

    const body: Record<string, unknown> = {
      amount: Math.round(data.amount * 100),
      currency: data.currency || "BRL",
      installments: data.installments || 1,
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        document: data.customer.cpf.replace(/\D/g, ""),
        phone: data.customer.phone,
      },
      description: data.description || "Pagamento NexFy",
      external_reference: data.externalRef,
    };

    // Beehive aceita token ou dados diretos
    if (data.cardToken) {
      body.card_token = data.cardToken;
    } else if (data.card) {
      body.card = {
        number: data.card.number.replace(/\s/g, ""),
        holder_name: data.card.holderName,
        exp_month: data.card.expMonth,
        exp_year: data.card.expYear,
        cvv: data.card.cvv,
      };
    }

    const result = await this.request("/payments", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!result.id) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: result.message || "Erro Beehive", raw: result };
    }

    return {
      success: result.status === "approved",
      gatewayPaymentId: result.id,
      status: result.status === "approved" ? "approved" : result.status === "pending" ? "pending" : "refused",
      cardLastFour: data.card?.number?.slice(-4),
      cardBrand: result.card_brand,
      raw: result,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.request(`/payments/${paymentId}`);
    return {
      gatewayPaymentId: paymentId,
      status: this.mapStatus(result.status),
      paidAt: result.paid_at ? new Date(result.paid_at) : undefined,
      raw: result,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    const body = amount ? { amount: Math.round(amount * 100) } : {};
    const result = await this.request(`/payments/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.success || result.status === "refunded") {
      return { success: true, refundId: result.refund_id, raw: result };
    }

    return { success: false, error: result.message || "Erro no reembolso", raw: result };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    try {
      const hash = crypto.createHmac("sha256", this.apiKey).update(payload).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  private mapStatus(status: string): PaymentStatus["status"] {
    const map: Record<string, PaymentStatus["status"]> = {
      approved: "approved",
      pending: "pending",
      refused: "refused",
      refunded: "refunded",
      chargeback: "chargeback",
    };
    return map[status] || "pending";
  }
}
