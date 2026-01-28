/**
 * Modulo Anti-Chargeback
 *
 * Estrategia de defesa multicamadas:
 *
 * 1. STRIPE RADAR (incluso no Stripe)
 *    - Deteccao automatica de fraude via ML
 *    - Regras customizaveis via Dashboard Stripe
 *    - 3D Secure automatico para transacoes suspeitas
 *    - Ja integrado no gateway Stripe (Payment Intents API)
 *
 * 2. VALIDACOES INTERNAS
 *    - Validacao de CPF (algoritmo)
 *    - Rate limiting por IP e email
 *    - Device fingerprint (futuro)
 *    - Verificacao de email descartavel (futuro)
 *
 * 3. INTEGRACAO BR (futuro)
 *    - Koin: antifraude para PIX e boleto (koin.com.br)
 *    - ClearSale: Score de risco para cartao (clearsale.com.br)
 *    - Konduto: Analise comportamental (konduto.com)
 *
 * Para habilitar integracoes externas, adicionar no .env:
 *   CLEARSALE_API_KEY=
 *   CLEARSALE_API_URL=https://api.clearsale.com.br/v1
 *   KOIN_API_KEY=
 *   KONDUTO_PUBLIC_KEY=
 *   KONDUTO_SECRET_KEY=
 */

interface FraudCheckInput {
  customerEmail: string;
  customerCpf: string;
  customerPhone: string;
  customerIp?: string;
  amount: number;
  paymentMethod: string;
  gateway: string;
}

interface FraudCheckResult {
  approved: boolean;
  score: number; // 0-100, 100 = maximo risco
  reason?: string;
  provider: string;
}

/**
 * Verificacao basica de fraude interna.
 * Checa padroes suspeitos antes de processar o pagamento.
 */
export async function checkFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
  let score = 0;
  const reasons: string[] = [];

  // CPF invalido (digitos repetidos)
  const cpfDigits = input.customerCpf.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(cpfDigits)) {
    score += 80;
    reasons.push("CPF com digitos repetidos");
  }

  // Email temporario/descartavel
  const disposableDomains = [
    "tempmail.com", "guerrillamail.com", "mailinator.com",
    "throwaway.email", "yopmail.com", "sharklasers.com",
    "temp-mail.org", "fakeinbox.com",
  ];
  const emailDomain = input.customerEmail.split("@")[1]?.toLowerCase();
  if (emailDomain && disposableDomains.includes(emailDomain)) {
    score += 40;
    reasons.push("Email descartavel");
  }

  // Valor muito alto para PIX (maior chance de fraude)
  if (input.paymentMethod === "pix" && input.amount > 5000) {
    score += 15;
    reasons.push("PIX com valor alto");
  }

  // Telefone invalido (muito curto)
  const phoneDigits = input.customerPhone.replace(/\D/g, "");
  if (phoneDigits.length > 0 && phoneDigits.length < 10) {
    score += 20;
    reasons.push("Telefone invalido");
  }

  return {
    approved: score < 70,
    score,
    reason: reasons.join("; ") || undefined,
    provider: "internal",
  };
}

/**
 * Integra com ClearSale para analise de risco de cartao.
 * Requer CLEARSALE_API_KEY no .env.
 */
export async function checkClearSale(input: FraudCheckInput & {
  customerName: string;
  cardBin?: string;
}): Promise<FraudCheckResult> {
  const apiKey = process.env.CLEARSALE_API_KEY;
  if (!apiKey) {
    return { approved: true, score: 0, reason: "ClearSale nao configurado", provider: "clearsale" };
  }

  try {
    const res = await fetch(`${process.env.CLEARSALE_API_URL || "https://api.clearsale.com.br/v1"}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.customerEmail,
        totalOrderValue: input.amount,
        ip: input.customerIp,
        billingData: {
          cpf: input.customerCpf,
          phoneNumber: input.customerPhone,
          name: input.customerName,
        },
        card: input.cardBin ? { bin: input.cardBin } : undefined,
      }),
    });

    const data = await res.json();
    const csScore = data.score || 0;

    return {
      approved: csScore < 70,
      score: csScore,
      reason: data.status === "APA" ? "Aprovado" : data.status === "RPR" ? "Reprovado" : data.status,
      provider: "clearsale",
    };
  } catch (err) {
    console.error("ClearSale error:", err);
    return { approved: true, score: 0, reason: "Erro na consulta ClearSale", provider: "clearsale" };
  }
}
