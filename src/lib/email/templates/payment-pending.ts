interface PaymentPendingEmailProps {
  customerName: string;
  productName: string;
  amount: number;
  currency: string;
  paymentMethod: "pix" | "boleto";
  pixCode?: string;
  checkoutUrl?: string;
  expiresIn?: string;
}

export function paymentPendingEmailTemplate({
  customerName,
  productName,
  amount,
  currency,
  paymentMethod,
  pixCode,
  checkoutUrl,
  expiresIn,
}: PaymentPendingEmailProps): string {
  const methodLabel = paymentMethod === "pix" ? "PIX" : "Boleto";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background-color:#1f2937;border-radius:16px;padding:40px;border:1px solid #374151;">

      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;width:48px;height:48px;background-color:#f59e0b;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">R</div>
        <h1 style="color:#ffffff;font-size:24px;margin:16px 0 0;">Aguardando pagamento</h1>
      </div>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Ola <strong style="color:#ffffff;">${customerName}</strong>,
      </p>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Seu pedido de <strong style="color:#f59e0b;">${productName}</strong> foi registrado. Complete o pagamento via <strong>${methodLabel}</strong> para liberar seu acesso.
      </p>

      <div style="background-color:#111827;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
        <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;">Valor:</p>
        <p style="color:#10b981;font-size:28px;font-weight:bold;margin:0;">
          ${currency} ${amount.toFixed(2)}
        </p>
        ${expiresIn ? `<p style="color:#f59e0b;font-size:13px;margin:12px 0 0;">Expira em: ${expiresIn}</p>` : ""}
      </div>

      ${pixCode ? `
      <div style="background-color:#111827;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">Codigo PIX (Copia e Cola):</p>
        <p style="color:#e5e7eb;font-size:11px;font-family:monospace;word-break:break-all;background:#0d1117;padding:12px;border-radius:8px;margin:0;">${pixCode}</p>
      </div>
      ` : ""}

      ${checkoutUrl ? `
      <div style="text-align:center;margin:32px 0;">
        <a href="${checkoutUrl}" style="display:inline-block;background-color:#f59e0b;color:#111827;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Pagar agora
        </a>
      </div>
      ` : ""}

      <div style="background-color:#111827;border-radius:12px;padding:16px;margin-top:24px;">
        <p style="color:#9ca3af;font-size:13px;margin:0;">
          Apos o pagamento, voce recebera um email de confirmacao com o acesso ao conteudo.
        </p>
      </div>

      <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #374151;">
        <p style="color:#6b7280;font-size:12px;margin:0;">
          RubusPay - Plataforma de Pagamentos
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
