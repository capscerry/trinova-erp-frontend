"use client";

import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import type { SupplierRiskSummary } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: SupplierRiskSummary;
  loading?: boolean;
}

export function SupplierRiskIndicator({ data, loading }: Props) {
  const total = data.green + data.yellow + data.red;

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const tiles = [
    {
      label: "Low Risk",
      sublabel: "Score > 80",
      count: data.green,
      pct: total > 0 ? Math.round((data.green / total) * 100) : 0,
      Icon: ShieldCheck,
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-700",
      barColor: "bg-emerald-500",
    },
    {
      label: "Medium Risk",
      sublabel: "Score 60-80",
      count: data.yellow,
      pct: total > 0 ? Math.round((data.yellow / total) * 100) : 0,
      Icon: AlertTriangle,
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
      textColor: "text-amber-700",
      barColor: "bg-amber-500",
    },
    {
      label: "High Risk",
      sublabel: "Score < 60",
      count: data.red,
      pct: total > 0 ? Math.round((data.red / total) * 100) : 0,
      Icon: ShieldAlert,
      bg: "bg-rose-50",
      border: "border-rose-100",
      iconColor: "text-rose-600",
      textColor: "text-rose-700",
      barColor: "bg-rose-500",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`rounded-xl border ${tile.border} ${tile.bg} p-4 flex flex-col gap-2`}
        >
          <div className="flex items-center justify-between">
            <tile.Icon size={16} className={tile.iconColor} />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${tile.textColor}`}>
              {tile.sublabel}
            </span>
          </div>
          <div>
            <p className={`text-2xl font-bold ${tile.textColor}`}>{tile.count}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{tile.label}</p>
          </div>
          {/* mini progress bar */}
          <div className="w-full bg-white/60 rounded-full h-1">
            <div
              className={`h-1 rounded-full ${tile.barColor}`}
              style={{ width: `${tile.pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">{tile.pct}% dari total</p>
        </div>
      ))}
    </div>
  );
}
