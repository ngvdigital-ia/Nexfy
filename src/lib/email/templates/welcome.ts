interface WelcomeEmailProps {
  customerName: string;
  productName: string;
  accessUrl?: string;
  loginUrl: string;
}

export function welcomeEmailTemplate({ customerName, productName, accessUrl, loginUrl }: WelcomeEmailProps): string {
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
        <div style="display:inline-block;width:48px;height:48px;background-color:#10b981;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">N</div>
        <h1 style="color:#ffffff;font-size:24px;margin:16px 0 0;">Compra confirmada!</h1>
      </div>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Ola <strong style="color:#ffffff;">${customerName}</strong>,
      </p>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Sua compra do produto <strong style="color:#10b981;">${productName}</strong> foi aprovada com sucesso!
      </p>

      ${accessUrl ? `
      <div style="text-align:center;margin:32px 0;">
        <a href="${accessUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Acessar conteudo
        </a>
      </div>
      ` : `
      <div style="text-align:center;margin:32px 0;">
        <a href="${loginUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Acessar area de membros
        </a>
      </div>
      `}

      <div style="background-color:#111827;border-radius:12px;padding:20px;margin-top:24px;">
        <p style="color:#9ca3af;font-size:14px;margin:0;">
          Caso precise de ajuda, responda este email ou entre em contato com nosso suporte.
        </p>
      </div>

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
