export const STRIPE_ERROR_MESSAGES: Record<string, {
  title: string;
  message: string;
  action: string;
  isRetryable: boolean;
}> = {
  card_not_supported: {
    title: "Cartao nao suportado",
    message: "Seu banco nao permite este tipo de transacao com este cartao.",
    action: "Tente usar outro cartao (de preferencia credito) ou entre em contato com seu banco.",
    isRetryable: false,
  },
  insufficient_funds: {
    title: "Saldo insuficiente",
    message: "Seu cartao nao possui saldo suficiente para esta compra.",
    action: "Verifique seu saldo ou use outro cartao.",
    isRetryable: true,
  },
  card_declined: {
    title: "Cartao recusado",
    message: "Seu banco recusou a transacao.",
    action: "Entre em contato com seu banco ou tente outro cartao.",
    isRetryable: true,
  },
  expired_card: {
    title: "Cartao expirado",
    message: "A validade do seu cartao expirou.",
    action: "Use um cartao com data de validade valida.",
    isRetryable: false,
  },
  incorrect_cvc: {
    title: "CVC incorreto",
    message: "O codigo de seguranca (CVC) esta incorreto.",
    action: "Verifique o codigo de 3 digitos no verso do cartao.",
    isRetryable: true,
  },
  processing_error: {
    title: "Erro de processamento",
    message: "Ocorreu um erro ao processar o pagamento.",
    action: "Aguarde alguns segundos e tente novamente.",
    isRetryable: true,
  },
  do_not_honor: {
    title: "Transacao nao autorizada",
    message: "Seu banco nao autorizou esta transacao.",
    action: "Entre em contato com seu banco para liberar a transacao ou use outro cartao.",
    isRetryable: false,
  },
  invalid_number: {
    title: "Numero invalido",
    message: "O numero do cartao esta incorreto.",
    action: "Verifique o numero do cartao e tente novamente.",
    isRetryable: true,
  },
  invalid_expiry_month: {
    title: "Mes invalido",
    message: "O mes de validade esta incorreto.",
    action: "Verifique a data de validade do cartao.",
    isRetryable: true,
  },
  invalid_expiry_year: {
    title: "Ano invalido",
    message: "O ano de validade esta incorreto.",
    action: "Verifique a data de validade do cartao.",
    isRetryable: true,
  },
  authentication_required: {
    title: "Autenticacao necessaria",
    message: "Seu banco requer autenticacao adicional (3D Secure).",
    action: "Complete a verificacao no app do seu banco.",
    isRetryable: true,
  },
  generic_decline: {
    title: "Pagamento recusado",
    message: "O pagamento nao foi autorizado.",
    action: "Tente outro cartao ou entre em contato com seu banco.",
    isRetryable: true,
  },
};

export function getErrorMessage(code: string | undefined) {
  return STRIPE_ERROR_MESSAGES[code || ""] || STRIPE_ERROR_MESSAGES.generic_decline;
}
