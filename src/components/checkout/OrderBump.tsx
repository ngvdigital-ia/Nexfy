"use client";

interface Bump {
  id: number;
  title: string;
  description: string | null;
  price: number;
}

interface Props {
  bump: Bump;
  selected: boolean;
  onToggle: () => void;
}

export function OrderBump({ bump, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left p-4 rounded-xl border-2 border-dashed transition-all ${
        selected
          ? "border-[var(--cta-green)] bg-[rgba(34,197,94,0.1)]"
          : "border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.05)] hover:border-[var(--accent)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selected ? "bg-[var(--cta-green)] border-[var(--cta-green)]" : "border-gray-500"
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-light)] bg-[rgba(139,92,246,0.2)] px-1.5 py-0.5 rounded">
              Oferta especial
            </span>
          </div>
          <p className="text-sm font-semibold text-white">{bump.title}</p>
          {bump.description && (
            <p className="text-xs text-gray-400 mt-0.5">{bump.description}</p>
          )}
          <p className="text-sm font-bold text-[var(--cta-green)] mt-1">
            + R$ {bump.price.toFixed(2)}
          </p>
        </div>
      </div>
    </button>
  );
}
