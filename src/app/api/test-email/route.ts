import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { sendEmail } from "@/lib/email";

// API para testar envio de email - requer autenticacao admin
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { to, subject, message } = await req.json();

  if (!to) {
    return NextResponse.json({ error: "Campo 'to' obrigatorio" }, { status: 400 });
  }

  const result = await sendEmail({
    to,
    subject: subject || "Teste de Email - RubusPay",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background-color:#1f2937;border-radius:16px;padding:40px;border:1px solid #374151;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:48px;height:48px;background-color:#8b5cf6;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">R</div>
          </div>
          <h1 style="color:#ffffff;font-size:20px;text-align:center;">Email de Teste</h1>
          <p style="color:#d1d5db;font-size:16px;line-height:1.6;">${message || "Este e um email de teste do sistema RubusPay."}</p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">Enviado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
        </div>
      </div>
    `,
  });

  return NextResponse.json(result);
}
