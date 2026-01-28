"use client";

interface CardData {
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

interface Props {
  cardData: CardData;
  onCardChange: (data: CardData) => void;
  installments: number;
  onInstallmentsChange: (n: number) => void;
  maxInstallments: number;
  totalAmount: number;
  currencySymbol?: string;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function detectBrand(number: string): string {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(636368|438935|504175|451416|636297)/.test(n) || /^(5067|4576|4011)/.test(n)) return "Elo";
  if (/^606282/.test(n)) return "Hipercard";
  return "";
}

export function CardPayment({
  cardData,
  onCardChange,
  installments,
  onInstallmentsChange,
  maxInstallments,
  totalAmount,
  currencySymbol = "R$",
}: Props) {
  const brand = detectBrand(cardData.number);

  const installmentOptions = Array.from({ length: maxInstallments }, (_, i) => {
    const n = i + 1;
    const value = totalAmount / n;
    return { n, label: n === 1 ? `1x de ${currencySymbol} ${value.toFixed(2)} (sem juros)` : `${n}x de ${currencySymbol} ${value.toFixed(2)}` };
  });

  return (
    <div className="card-glow p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Dados do cartao
      </h2>

      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Numero do cartao"
          value={cardData.number}
          onChange={(e) =>
            onCardChange({ ...cardData, number: formatCardNumber(e.target.value) })
          }
          maxLength={19}
          required
          className="w-full px-3 py-2.5 input-glow text-sm"
        />
        {brand && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--accent-light)] font-medium">
            {brand}
          </span>
        )}
      </div>

      <input
        type="text"
        placeholder="Nome impresso no cartao"
        value={cardData.holderName}
        onChange={(e) =>
          onCardChange({ ...cardData, holderName: e.target.value.toUpperCase() })
        }
        required
        className="w-full px-3 py-2.5 input-glow text-sm uppercase"
      />

      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Mes"
          value={cardData.expMonth}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 2);
            onCardChange({ ...cardData, expMonth: v });
          }}
          maxLength={2}
          required
          className="w-full px-3 py-2.5 input-glow text-sm text-center"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Ano"
          value={cardData.expYear}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            onCardChange({ ...cardData, expYear: v });
          }}
          maxLength={4}
          required
          className="w-full px-3 py-2.5 input-glow text-sm text-center"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="CVV"
          value={cardData.cvv}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            onCardChange({ ...cardData, cvv: v });
          }}
          maxLength={4}
          required
          className="w-full px-3 py-2.5 input-glow text-sm text-center"
        />
      </div>

      {maxInstallments > 1 && (
        <select
          value={installments}
          onChange={(e) => onInstallmentsChange(Number(e.target.value))}
          className="w-full px-3 py-2.5 input-glow text-sm appearance-none"
        >
          {installmentOptions.map((opt) => (
            <option key={opt.n} value={opt.n}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
