"use client";

import { Brain, Trophy, Star, Sliders, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { SupplierRecommendationDataset } from "@/lib/hooks/useSupplierRecommendations";

interface Props {
  dataset: SupplierRecommendationDataset | null;
  loading?: boolean;
}

const PRESET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  balanced:        { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"   },
  urgency_high:    { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200"   },
  budget_priority: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200"  },
  quality_focus:   { bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-200"},
};

export function AIRecommendationSummary({ dataset, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Brain size={22} className="text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600">AI Recommendation belum tersedia</p>
          <p className="text-xs text-slate-400 mt-1">Jalankan analisis dari halaman Rekomendasi Supplier</p>
        </div>
        <Link
          href="/rekomendasi"
          className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors"
        >
          Buka Rekomendasi <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  const totalEvaluated = dataset.alternatives.length;

  // Best supplier across all presets (most frequently #1)
  const rankOneMap = new Map<string, number>();
  for (const preset of dataset.presets) {
    const top = preset.rankedSuppliers[0];
    if (top) {
      rankOneMap.set(top.name, (rankOneMap.get(top.name) ?? 0) + 1);
    }
  }
  const bestSupplier = [...rankOneMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Average score across balanced preset — only include valid (> 0) scores
  const balancedPreset = dataset.presets.find((p) => p.key === "balanced");
  const validBalancedSuppliers = (balancedPreset?.rankedSuppliers ?? []).filter(
    (r) => r.score != null && !Number.isNaN(r.score) && r.score > 0
  );
  const avgScore =
    validBalancedSuppliers.length > 0
      ? (
          (validBalancedSuppliers.reduce((s, r) => s + r.score, 0) /
            validBalancedSuppliers.length) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 flex flex-col gap-1">
          <Brain size={15} className="text-blue-500" />
          <p className="text-xl font-bold text-blue-700">{totalEvaluated}</p>
          <p className="text-[11px] text-blue-500 font-medium">Supplier Dievaluasi</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 flex flex-col gap-1">
          <Trophy size={15} className="text-amber-500" />
          <p className="text-sm font-bold text-amber-700 leading-tight line-clamp-2">{bestSupplier}</p>
          <p className="text-[11px] text-amber-500 font-medium">Supplier Terbaik</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 flex flex-col gap-1">
          <Star size={15} className="text-emerald-500" />
          <p className="text-xl font-bold text-emerald-700">
            {avgScore != null ? `${avgScore}%` : "—"}
          </p>
          <p className="text-[11px] text-emerald-500 font-medium">Rata-rata Skor</p>
        </div>
      </div>

      {/* Per-preset top supplier */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Sliders size={11} /> Hasil per Preset
        </p>
        <div className="space-y-2">
          {dataset.presets.map((preset) => {
            // Only show the top supplier if it has a valid, non-zero score
            const top = preset.rankedSuppliers.find(
              (r) => r.score != null && !Number.isNaN(r.score) && r.score > 0
            );
            const colors = PRESET_COLORS[preset.key] ?? PRESET_COLORS.balanced;
            return (
              <div
                key={preset.key}
                className={`flex items-center justify-between rounded-xl border ${colors.border} ${colors.bg} px-3.5 py-2.5`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{preset.icon}</span>
                  <div>
                    <p className={`text-xs font-bold ${colors.text}`}>{preset.label}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
                      {top ? `#1 ${top.name}` : "Belum ada rekomendasi"}
                    </p>
                  </div>
                </div>
                {top && (
                  <span className={`text-xs font-bold ${colors.text}`}>
                    {(top.score * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Criteria weights from balanced preset */}
      {balancedPreset && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Bobot Kriteria (Balanced)
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(balancedPreset.weights).map(([criterion, weight]) => {
              const pct = Math.round(weight * 100);
              const labels: Record<string, string> = {
                avg_price:            "Harga Rata-rata",
                lead_time:            "Lead Time",
                on_time_rate:         "On-Time Rate",
                delivery_punctuality: "Ketepatan Waktu",
                return_rate:          "Tingkat Retur",
              };
              return (
                <div key={criterion} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-slate-500 w-32 shrink-0 truncate">{labels[criterion] ?? criterion}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link
        href="/rekomendasi"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors"
      >
        <Brain size={14} />
        Lihat Analisis Lengkap
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
