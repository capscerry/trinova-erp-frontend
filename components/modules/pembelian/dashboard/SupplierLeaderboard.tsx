"use client";

import { Trophy, TrendingUp } from "lucide-react";
import type { SupplierLeaderboardRow } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: SupplierLeaderboardRow[];
  loading?: boolean;
  onRowClick?: (supplierId: number) => void;
}

function formatRupiah(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}Rb`;
  return `Rp ${v}`;
}

const RISK_BADGE: Record<string, string> = {
  green:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  yellow: "bg-amber-50   text-amber-700   border border-amber-200",
  red:    "bg-rose-50    text-rose-600    border border-rose-200",
};

const RISK_DOT: Record<string, string> = {
  green:  "bg-emerald-500",
  yellow: "bg-amber-500",
  red:    "bg-rose-500",
};

const RANK_MEDAL: Record<number, string> = {
  1: "bg-amber-400 text-white",
  2: "bg-slate-300 text-slate-700",
  3: "bg-amber-600 text-white",
};

export function SupplierLeaderboard({ data, loading, onRowClick }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
        <Trophy size={28} className="opacity-40" />
        <p className="text-sm">Jalankan AI Rekomendasi untuk melihat leaderboard</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <th className="px-3 py-2 text-center w-10">#</th>
            <th className="px-3 py-2 text-left">Supplier</th>
            <th className="px-3 py-2 text-center">AI Score</th>
            <th className="px-3 py-2 text-center">Orders</th>
            <th className="px-3 py-2 text-right">Spend</th>
            <th className="px-3 py-2 text-center">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row) => (
            <tr
              key={row.supplier_id}
              onClick={() => onRowClick?.(row.supplier_id)}
              className={`transition-colors hover:bg-slate-50 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {/* Rank */}
              <td className="px-3 py-2.5 text-center">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${RANK_MEDAL[row.rank] ?? "bg-slate-100 text-slate-500"}`}>
                  {row.rank}
                </span>
              </td>

              {/* Name */}
              <td className="px-3 py-2.5">
                <p className="font-semibold text-slate-700 truncate max-w-[160px]">{row.supplier_name}</p>
              </td>

              {/* AI Score bar */}
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-20 bg-slate-100 rounded-full h-1.5 shrink-0">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${row.ai_score}%`,
                        backgroundColor: row.ai_score >= 80 ? "#10b981" : row.ai_score >= 60 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-10 text-right shrink-0">
                    {row.ai_score > 0 ? `${row.ai_score.toFixed(0)}%` : "-"}
                  </span>
                </div>
              </td>

              {/* Orders */}
              <td className="px-3 py-2.5 text-center">
                <span className="text-slate-600 font-medium">{row.orders}</span>
              </td>

              {/* Spend */}
              <td className="px-3 py-2.5 text-right">
                <span className="text-slate-700 font-semibold tabular-nums">{formatRupiah(row.spend)}</span>
              </td>

              {/* Risk badge */}
              <td className="px-3 py-2.5 text-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${RISK_BADGE[row.risk]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[row.risk]}`} />
                  {row.risk === "green" ? "Low" : row.risk === "yellow" ? "Medium" : "High"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
