"use client";

interface KPI {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: string;
}

interface Props {
  kpis: KPI[];
}

export function KPICards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">{kpi.label}</span>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={kpi.icon} />
            </svg>
          </div>
          <p className="text-xl font-bold text-white">{kpi.value}</p>
          {kpi.change && (
            <p className={`text-xs mt-1 ${kpi.positive ? "text-green-400" : "text-red-400"}`}>
              {kpi.positive ? "+" : ""}{kpi.change} vs mes anterior
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
