import type { GatewayCredentials, GatewayProvider, PaymentInput, PaymentResult, PaymentStatus, RefundResult } from "./types";
import crypto from "crypto";

export class HypercashGateway implements GatewayProvider {
  name = "hypercash";
  private apiKey: string;
  private baseUrl = "https://api.hypercash.com.br/v1";

  constructor(credentials: GatewayCredentials) {
    if (!credentials.apiKey) throw new Error("Hypercash: apiKey obrigatoria");
    this.apiKey = credentials.apiKey;
  }

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey,
        ...options.headers,
      },
    });
    return res.json();
  }

  async createPayment(data: PaymentInput): Promise<PaymentResult> {
    if (data.paymentMethod !== "credit_card") {
      return { success: false, gatewayPaymentId: "", status: "refused", error: "Hypercash suporta apenas cartao de credito" };
    }

    // Hypercash EXIGE dados completos do cartao (nao aceita token)
    if (!data.card) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: "Hypercash requer dados completos do cartao" };
    }

    const body = {
      amount: Math.round(data.amount * 100),
      currency: data.currency || "BRL",
      installments: data.installments || 1,
      card: {
        number: data.card.number.replace(/\s/g, ""),
        holder_name: data.card.holderName,
        exp_month: data.card.expMonth,
        exp_year: data.card.expYear,
        cvv: data.card.cvv,
      },
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        cpf: data.customer.cpf.replace(/\D/g, ""),
        phone: data.customer.phone,
      },
      description: data.description || "Pagamento NexFy",
      external_reference: data.externalRef,
    };

    const result = await this.request("/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!result.id) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: result.message || "Erro Hypercash", raw: result };
    }

    return {
      success: result.status === "approved",
      gatewayPaymentId: result.id,
      status: result.status === "approved" ? "approved" : result.status === "pending" ? "pending" : "refused",
      cardLastFour: data.card.number.slice(-4),
      cardBrand: result.card_brand,
      raw: result,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.request(`/transactions/${paymentId}`);
    return {
      gatewayPaymentId: paymentId,
      status: this.mapStatus(result.status),
      paidAt: result.paid_at ? new Date(result.paid_at) : undefined,
      raw: result,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    const body = amount ? { amount: Math.round(amount * 100) } : {};
    const result = await this.request(`/transactions/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.success || result.refund_id) {
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
      cancelled: "cancelled",
    };
    return map[status] || "pending";
  }
}
