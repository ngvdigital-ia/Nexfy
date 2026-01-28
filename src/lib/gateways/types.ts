export interface PaymentInput {
  amount: number;
  currency?: string;
  paymentMethod: "pix" | "credit_card" | "boleto";
  customer: {
    name: string;
    email: string;
    cpf: string;
    phone?: string;
  };
  card?: {
    number: string;
    holderName: string;
    expMonth: string;
    expYear: string;
    cvv: string;
    installments?: number;
  };
  cardToken?: string;
  installments?: number;
  description?: string;
  externalRef?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  gatewayPaymentId: string;
  status: "pending" | "approved" | "refused";
  pixCode?: string;
  pixQrCode?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
  cardLastFour?: string;
  cardBrand?: string;
  error?: string;
  raw?: unknown;
}

export interface PaymentStatus {
  gatewayPaymentId: string;
  status: "pending" | "approved" | "refused" | "refunded" | "chargeback" | "cancelled" | "expired";
  paidAt?: Date;
  raw?: unknown;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
  raw?: unknown;
}

export interface GatewayProvider {
  name: string;
  createPayment(data: PaymentInput): Promise<PaymentResult>;
  getStatus(paymentId: string): Promise<PaymentStatus>;
  refund(paymentId: string, amount?: number): Promise<RefundResult>;
  verifyWebhook(payload: string, signature: string): boolean;
}

export interface GatewayCredentials {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  certificatePath?: string;
  apiKey?: string;
  secretKey?: string;
  publicKey?: string;
  webhookSecret?: string;
  sandbox?: boolean;
}
