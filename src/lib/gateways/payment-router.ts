import type { GatewayCredentials, GatewayProvider, PaymentInput, PaymentResult } from "./types";
import { getGateway } from "./index";

interface AcquirerConfig {
  name: string;
  credentials: GatewayCredentials;
  priority: number;
  enabled: boolean;
  methods: ("pix" | "credit_card" | "boleto")[];
}

/**
 * Payment Router com fallback chain.
 * Tenta o adquirente primario e faz fallback para os secundarios em caso de falha.
 */
export class PaymentRouter {
  private acquirers: AcquirerConfig[];

  constructor(acquirers: AcquirerConfig[]) {
    this.acquirers = acquirers
      .filter((a) => a.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async processPayment(data: PaymentInput): Promise<PaymentResult & { usedGateway: string }> {
    const eligible = this.acquirers.filter((a) =>
      a.methods.includes(data.paymentMethod)
    );

    if (eligible.length === 0) {
      return {
        success: false,
        gatewayPaymentId: "",
        status: "refused",
        error: "Nenhum adquirente disponivel para este metodo de pagamento",
        usedGateway: "",
      };
    }

    let lastError = "";

    for (const acquirer of eligible) {
      try {
        const gateway = getGateway(acquirer.name, acquirer.credentials);
        const result = await gateway.createPayment(data);

        if (result.success || result.status === "pending") {
          return { ...result, usedGateway: acquirer.name };
        }

        lastError = result.error || `${acquirer.name} recusou o pagamento`;
      } catch (err) {
        lastError = `${acquirer.name}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`PaymentRouter fallback - ${acquirer.name} falhou:`, err);
      }
    }

    return {
      success: false,
      gatewayPaymentId: "",
      status: "refused",
      error: lastError || "Todos os adquirentes falharam",
      usedGateway: "",
    };
  }

  getGatewayInstance(name: string): GatewayProvider | null {
    const config = this.acquirers.find((a) => a.name === name);
    if (!config) return null;
    return getGateway(config.name, config.credentials);
  }
}

/**
 * Cria router a partir de config do produto ou config global.
 */
export function createPaymentRouter(acquirersConfig: AcquirerConfig[]): PaymentRouter {
  return new PaymentRouter(acquirersConfig);
}
