"use client";

import type { ProcurementFunnelStep } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: ProcurementFunnelStep[];
  loading?: boolean;
  onStepClick?: (label: string) => void;
}

export function ProcurementFunnel({ data, loading, onStepClick }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map((step, i) => {
        const widthPct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
        const convRate = i > 0 && data[i - 1].count > 0
          ? ((step.count / data[i - 1].count) * 100).toFixed(0)
          : null;

        return (
          <div key={step.label}>
            {/* Connector arrow */}
            {i > 0 && (
              <div className="flex items-center justify-center py-0.5">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-px h-3 bg-slate-200" />
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M5 6L0 0h10L5 6z" fill="#cbd5e1" />
                  </svg>
                  {convRate !== null && (
                    <span className="text-[10px] text-slate-400 font-medium">{convRate}%</span>
                  )}
                </div>
              </div>
            )}

            {/* Step bar */}
            <div
              onClick={() => onStepClick?.(step.label)}
              className={`relative rounded-xl overflow-hidden transition-all ${onStepClick ? "cursor-pointer hover:opacity-90" : ""}`}
              style={{ backgroundColor: step.color + "18" }}
            >
              {/* Fill bar */}
              <div
                className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700"
                style={{ width: `${widthPct}%`, backgroundColor: step.color + "33" }}
              />
              <div className="relative flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                  <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 bg-white/50 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${widthPct}%`, backgroundColor: step.color }}
                    />
                  </div>
                  <span className="text-sm font-bold tabular-nums min-w-[2.5rem] text-right" style={{ color: step.color }}>
                    {step.count.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
