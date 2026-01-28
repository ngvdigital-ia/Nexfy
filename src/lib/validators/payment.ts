import { z } from "zod";

function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(cleaned[10]);
}

export const customerSchema = z.object({
  name: z.string().min(3, "Nome obrigatorio"),
  email: z.string().email("Email invalido"),
  cpf: z.string().optional().default(""),
  phone: z.string().optional(),
});

export const cardSchema = z.object({
  number: z.string().min(13).max(19),
  holderName: z.string().min(3),
  expMonth: z.string().length(2),
  expYear: z.string().min(2).max(4),
  cvv: z.string().min(3).max(4),
});

export const createPaymentSchema = z.object({
  productHash: z.string().min(1),
  offerHash: z.string().optional(),
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
  customer: customerSchema,
  card: cardSchema.optional(),
  cardToken: z.string().optional(),
  installments: z.number().int().min(1).max(12).optional(),
  couponCode: z.string().optional(),
  orderBumpIds: z.array(z.number()).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
