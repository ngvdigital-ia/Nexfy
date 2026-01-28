interface PasswordResetEmailProps {
  name: string;
  resetLink: string;
}

export function passwordResetEmailTemplate({ name, resetLink }: PasswordResetEmailProps): string {
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
        <div style="display:inline-block;width:48px;height:48px;background-color:#8b5cf6;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">R</div>
        <h1 style="color:#ffffff;font-size:24px;margin:16px 0 0;">Recuperar senha</h1>
      </div>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Ola <strong style="color:#ffffff;">${name}</strong>,
      </p>

      <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
        Recebemos uma solicitacao para redefinir sua senha. Clique no botao abaixo para criar uma nova senha:
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}" style="display:inline-block;background-color:#8b5cf6;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Redefinir senha
        </a>
      </div>

      <div style="background-color:#111827;border-radius:12px;padding:16px;margin-top:24px;">
        <p style="color:#9ca3af;font-size:13px;margin:0;">
          Este link expira em 1 hora. Se voce nao solicitou a redefinicao de senha, ignore este email.
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
