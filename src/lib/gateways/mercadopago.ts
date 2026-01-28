import type { GatewayCredentials, GatewayProvider, PaymentInput, PaymentResult, PaymentStatus, RefundResult } from "./types";
import crypto from "crypto";

export class MercadoPagoGateway implements GatewayProvider {
  name = "mercadopago";
  private accessToken: string;
  private baseUrl = "https://api.mercadopago.com";

  constructor(credentials: GatewayCredentials) {
    if (!credentials.accessToken) throw new Error("MercadoPago: accessToken obrigatorio");
    this.accessToken = credentials.accessToken;
  }

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });
    return res.json();
  }

  async createPayment(data: PaymentInput): Promise<PaymentResult> {
    const body: Record<string, unknown> = {
      transaction_amount: data.amount,
      description: data.description || "Pagamento NexFy",
      payer: {
        email: data.customer.email,
        first_name: data.customer.name.split(" ")[0],
        last_name: data.customer.name.split(" ").slice(1).join(" ") || "",
        identification: {
          type: "CPF",
          number: data.customer.cpf.replace(/\D/g, ""),
        },
      },
      external_reference: data.externalRef,
    };

    if (data.paymentMethod === "pix") {
      body.payment_method_id = "pix";
    } else if (data.paymentMethod === "credit_card") {
      if (data.cardToken) {
        body.token = data.cardToken;
        body.installments = data.installments || 1;
        body.payment_method_id = "visa"; // MP auto-detect from token
      }
    } else if (data.paymentMethod === "boleto") {
      body.payment_method_id = "bolbradesco";
    }

    const result = await this.request("/v1/payments", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.error) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: result.message, raw: result };
    }

    const status = this.mapStatus(result.status);
    return {
      success: status !== "refused",
      gatewayPaymentId: String(result.id),
      status,
      pixCode: result.point_of_interaction?.transaction_data?.qr_code,
      pixQrCode: result.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoUrl: result.transaction_details?.external_resource_url,
      boletoBarcode: result.barcode?.content,
      cardLastFour: result.card?.last_four_digits,
      cardBrand: result.payment_method_id,
      raw: result,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.request(`/v1/payments/${paymentId}`);
    return {
      gatewayPaymentId: String(result.id),
      status: this.mapStatus(result.status),
      paidAt: result.date_approved ? new Date(result.date_approved) : undefined,
      raw: result,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    const body = amount ? { amount } : {};
    const result = await this.request(`/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.error) {
      return { success: false, error: result.message, raw: result };
    }

    return { success: true, refundId: String(result.id), raw: result };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    // MP usa x-signature header: ts=xxx,v1=hash
    // Validar com HMAC SHA256
    try {
      const parts = signature.split(",");
      const ts = parts.find((p) => p.startsWith("ts="))?.split("=")[1];
      const v1 = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
      if (!ts || !v1) return false;

      const manifest = `id:${payload};request-id:;ts:${ts};`;
      const hash = crypto.createHmac("sha256", this.accessToken).update(manifest).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(v1));
    } catch {
      return false;
    }
  }

  private mapStatus(mpStatus: string): PaymentResult["status"] {
    const map: Record<string, PaymentResult["status"]> = {
      approved: "approved",
      pending: "pending",
      in_process: "pending",
      rejected: "refused",
      cancelled: "refused",
      refunded: "approved",
    };
    return map[mpStatus] || "pending";
  }
}
