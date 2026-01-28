"use client";

type Method = "pix" | "credit_card" | "boleto";

interface Props {
  selected: Method;
  onSelect: (method: Method) => void;
  pixEnabled: boolean;
  cardEnabled: boolean;
  boletoEnabled: boolean;
}

const methods: { key: Method; label: string; icon: string; desc: string }[] = [
  { key: "pix", label: "PIX", icon: "⚡", desc: "Aprovacao instantanea" },
  { key: "credit_card", label: "Cartao", icon: "💳", desc: "Ate 12x" },
  { key: "boleto", label: "Boleto", icon: "📄", desc: "Vence em 3 dias" },
];

export function PaymentMethods({ selected, onSelect, pixEnabled, cardEnabled, boletoEnabled }: Props) {
  const enabledMap: Record<Method, boolean> = {
    pix: pixEnabled,
    credit_card: cardEnabled,
    boleto: boletoEnabled,
  };

  const available = methods.filter((m) => enabledMap[m.key]);

  if (available.length <= 1) return null;

  return (
    <div className="card-glow p-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
        Forma de pagamento
      </h2>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(available.length, 3)}, 1fr)` }}>
        {available.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onSelect(m.key)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center ${
              selected === m.key
                ? "method-selected border-purple-500 text-white"
                : "border-[rgba(139,92,246,0.15)] bg-[#111118] text-gray-400 hover:border-[rgba(139,92,246,0.3)]"
            }`}
          >
            <span className="text-lg">{m.icon}</span>
            <span className="text-sm font-medium">{m.label}</span>
            <span className="text-[10px] opacity-60">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
