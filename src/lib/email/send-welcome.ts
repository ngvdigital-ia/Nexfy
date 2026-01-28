import { sendEmail } from "./index";
import { welcomeEmailTemplate } from "./templates/welcome";

export async function sendWelcomeEmail(params: {
  customerEmail: string;
  customerName: string;
  productName: string;
  productId: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const html = welcomeEmailTemplate({
    customerName: params.customerName,
    productName: params.productName,
    loginUrl: `${appUrl}/login`,
    accessUrl: `${appUrl}/member`,
  });

  return sendEmail({
    to: params.customerEmail,
    subject: `Compra confirmada - ${params.productName}`,
    html,
  });
}
