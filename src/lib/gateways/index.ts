import type { GatewayCredentials, GatewayProvider } from "./types";
import { MercadoPagoGateway } from "./mercadopago";
import { EfiGateway } from "./efi";
import { PushinPayGateway } from "./pushinpay";
import { BeehiveGateway } from "./beehive";
import { HypercashGateway } from "./hypercash";
import { StripeGateway } from "./stripe";

const gatewayMap: Record<string, new (creds: GatewayCredentials) => GatewayProvider> = {
  mercadopago: MercadoPagoGateway,
  efi: EfiGateway,
  pushinpay: PushinPayGateway,
  beehive: BeehiveGateway,
  hypercash: HypercashGateway,
  stripe: StripeGateway,
};

export function getGateway(name: string, credentials: GatewayCredentials): GatewayProvider {
  const GatewayClass = gatewayMap[name];
  if (!GatewayClass) {
    throw new Error(`Gateway "${name}" nao suportado`);
  }
  return new GatewayClass(credentials);
}

export type { GatewayProvider, GatewayCredentials, PaymentInput, PaymentResult, PaymentStatus, RefundResult } from "./types";
