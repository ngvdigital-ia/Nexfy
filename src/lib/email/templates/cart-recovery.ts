interface CartRecoveryEmailProps {
  customerName: string;
  productName: string;
  productPrice: number;
  checkoutUrl: string;
}

export function cartRecoveryEmailTemplate({ customerName, productName, productPrice, checkoutUrl }: CartRecoveryEmailProps): string {
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
        <div style="display:inline-block;width:48px;height:48px;background-color:#3b82f6;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">N</div>
        <h1 style="color:#ffffff;font-size:24px;margin:16px 0 0;">Esqueceu algo?</h1>
      </div>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Ola${customerName ? ` <strong style="color:#ffffff;">${customerName}</strong>` : ""},
      </p>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Notamos que voce comecou a compra do <strong style="color:#3b82f6;">${productName}</strong> mas nao finalizou.
      </p>

      <div style="background-color:#111827;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
        <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;">Valor:</p>
        <p style="color:#10b981;font-size:28px;font-weight:bold;margin:0;">
          R$ ${productPrice.toFixed(2)}
        </p>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${checkoutUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Finalizar minha compra
        </a>
      </div>

      <p style="color:#6b7280;font-size:14px;text-align:center;">
        Sua compra esta garantida e segura.
      </p>

      <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #374151;">
        <p style="color:#6b7280;font-size:12px;margin:0;">
          NexFy - Plataforma de Pagamentos
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
