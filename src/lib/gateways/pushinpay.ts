import type { GatewayCredentials, GatewayProvider, PaymentInput, PaymentResult, PaymentStatus, RefundResult } from "./types";
import crypto from "crypto";

export class PushinPayGateway implements GatewayProvider {
  name = "pushinpay";
  private apiKey: string;
  private baseUrl = "https://api.pushinpay.com.br/api";

  constructor(credentials: GatewayCredentials) {
    if (!credentials.apiKey) throw new Error("PushinPay: apiKey obrigatoria");
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
    if (data.paymentMethod !== "pix") {
      return { success: false, gatewayPaymentId: "", status: "refused", error: "PushinPay suporta apenas PIX" };
    }

    const body = {
      value: Math.round(data.amount * 100),
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pushinpay`,
      payer: {
        name: data.customer.name,
        document: data.customer.cpf.replace(/\D/g, ""),
        email: data.customer.email,
      },
      external_reference: data.externalRef,
    };

    const result = await this.request("/pix/cashIn", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!result.id) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: result.message || "Erro PushinPay", raw: result };
    }

    return {
      success: true,
      gatewayPaymentId: result.id,
      status: "pending",
      pixCode: result.qr_code,
      pixQrCode: result.qr_code_base64,
      raw: result,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.request(`/pix/cashIn/${paymentId}`);
    const statusMap: Record<string, PaymentStatus["status"]> = {
      pending: "pending",
      approved: "approved",
      paid: "approved",
      expired: "expired",
      refunded: "refunded",
    };
    return {
      gatewayPaymentId: paymentId,
      status: statusMap[result.status] || "pending",
      paidAt: result.paid_at ? new Date(result.paid_at) : undefined,
      raw: result,
    };
  }

  async refund(paymentId: string, _amount?: number): Promise<RefundResult> {
    const result = await this.request(`/pix/cashIn/${paymentId}/refund`, {
      method: "POST",
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
}
