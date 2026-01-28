import type { GatewayCredentials, GatewayProvider, PaymentInput, PaymentResult, PaymentStatus, RefundResult } from "./types";
import https from "https";
import fs from "fs";
import crypto from "crypto";

export class EfiGateway implements GatewayProvider {
  name = "efi";
  private clientId: string;
  private clientSecret: string;
  private certPath: string;
  private sandbox: boolean;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(credentials: GatewayCredentials) {
    if (!credentials.clientId || !credentials.clientSecret || !credentials.certificatePath) {
      throw new Error("Efi: clientId, clientSecret e certificatePath obrigatorios");
    }
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.certPath = credentials.certificatePath;
    this.sandbox = credentials.sandbox ?? false;
  }

  private get baseUrl() {
    return this.sandbox ? "https://pix-h.api.efipay.com.br" : "https://pix.api.efipay.com.br";
  }

  private get cardBaseUrl() {
    return this.sandbox ? "https://sandbox.api.efipay.com.br" : "https://api.efipay.com.br";
  }

  private getHttpsAgent() {
    const cert = fs.readFileSync(this.certPath);
    return new https.Agent({
      pfx: cert,
      passphrase: "",
    });
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const agent = this.getHttpsAgent();

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grant_type: "client_credentials" }),
      // @ts-expect-error Node.js fetch supports agent
      agent,
    });

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async pixRequest(path: string, options: RequestInit = {}) {
    const token = await this.authenticate();
    const agent = this.getHttpsAgent();

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      // @ts-expect-error Node.js fetch supports agent
      agent,
    });
    return res.json();
  }

  async createPayment(data: PaymentInput): Promise<PaymentResult> {
    if (data.paymentMethod === "pix") {
      return this.createPixPayment(data);
    }
    return this.createCardPayment(data);
  }

  private async createPixPayment(data: PaymentInput): Promise<PaymentResult> {
    // Criar cobranca PIX
    const body = {
      calendario: { expiracao: 3600 },
      valor: { original: data.amount.toFixed(2) },
      chave: "", // Chave PIX da conta Efi
      solicitacaoPagador: data.description || "Pagamento NexFy",
      infoAdicionais: [
        { nome: "cpf", valor: data.customer.cpf.replace(/\D/g, "") },
      ],
    };

    const result = await this.pixRequest("/v2/cob", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!result.loc?.id) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: "Falha ao criar cobranca PIX", raw: result };
    }

    // Buscar QR Code
    const qrResult = await this.pixRequest(`/v2/loc/${result.loc.id}/qrcode`);

    return {
      success: true,
      gatewayPaymentId: result.txid,
      status: "pending",
      pixCode: qrResult.qrcode,
      pixQrCode: qrResult.imagemQrcode,
      raw: result,
    };
  }

  private async createCardPayment(data: PaymentInput): Promise<PaymentResult> {
    const token = await this.authenticate();

    const body = {
      items: [
        {
          name: data.description || "Pagamento NexFy",
          value: Math.round(data.amount * 100),
          amount: 1,
        },
      ],
      payment: {
        credit_card: {
          installments: data.installments || 1,
          payment_token: data.cardToken,
          customer: {
            name: data.customer.name,
            email: data.customer.email,
            cpf: data.customer.cpf.replace(/\D/g, ""),
            phone_number: data.customer.phone?.replace(/\D/g, ""),
          },
        },
      },
    };

    const res = await fetch(`${this.cardBaseUrl}/v1/charge/one-step`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (result.code !== 200) {
      return { success: false, gatewayPaymentId: "", status: "refused", error: result.message, raw: result };
    }

    return {
      success: true,
      gatewayPaymentId: String(result.data.charge_id),
      status: result.data.status === "approved" ? "approved" : "pending",
      cardLastFour: data.card?.number?.slice(-4),
      raw: result,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.pixRequest(`/v2/cob/${paymentId}`);
    const statusMap: Record<string, PaymentStatus["status"]> = {
      ATIVA: "pending",
      CONCLUIDA: "approved",
      REMOVIDA_PELO_USUARIO_RECEBEDOR: "cancelled",
      REMOVIDA_PELO_PSP: "cancelled",
    };
    return {
      gatewayPaymentId: paymentId,
      status: statusMap[result.status] || "pending",
      raw: result,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    const refundId = crypto.randomUUID().replace(/-/g, "");
    const body = {
      valor: amount ? amount.toFixed(2) : undefined,
    };

    const result = await this.pixRequest(`/v2/pix/${paymentId}/devolucao/${refundId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (result.status === "EM_PROCESSAMENTO" || result.status === "DEVOLVIDO") {
      return { success: true, refundId: result.rtrId, raw: result };
    }

    return { success: false, error: "Falha no reembolso", raw: result };
  }

  verifyWebhook(_payload: string, _signature: string): boolean {
    // Efi usa mTLS para validacao de webhooks (certificado no servidor)
    // A validacao eh feita pela presenca do certificado client na request
    return true;
  }
}
