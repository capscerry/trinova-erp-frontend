"use client";

import { useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

export interface Criterion {
  id: string;
  label: string;
  description: string;
  weight: number; 
  benefit: boolean; // true = higher is better, false = lower is better (cost)
}

interface AhpCriteriaPanelProps {
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
  onRun: () => void;
  isLoading?: boolean;
}

function totalWeightLabel(total: number) {
  if (total === 100) return { text: "Total bobot: 100% ✓", color: "text-green-600" };
  if (total < 100)  return { text: `Total bobot: ${total}% — kurang ${100 - total}%`, color: "text-amber-600" };
  return                   { text: `Total bobot: ${total}% — lebih ${total - 100}%`, color: "text-red-600" };
}

export function AhpCriteriaPanel({
  criteria,
  onChange,
  onRun,
  isLoading = false,
}: AhpCriteriaPanelProps) {
  const [showInfo, setShowInfo] = useState(false);

  const total = criteria.reduce((s, c) => s + c.weight, 0);
  const weightLabel = totalWeightLabel(total);
  const canRun = total === 100 && !isLoading;

  function setWeight(id: string, raw: string) {
    const val = Math.min(100, Math.max(0, Number(raw) || 0));
    onChange(criteria.map((c) => (c.id === id ? { ...c, weight: val } : c)));
  }

  function toggleBenefit(id: string) {
    onChange(criteria.map((c) => (c.id === id ? { ...c, benefit: !c.benefit } : c)));
  }

  function equalizeWeights() {
    const per = Math.floor(100 / criteria.length);
    const remainder = 100 - per * criteria.length;
    onChange(
      criteria.map((c, i) => ({ ...c, weight: i === 0 ? per + remainder : per }))
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-900 to-navy-600 flex items-center justify-center">
            <span className="text-gold-400 text-[11px] font-extrabold">AHP</span>
          </div>
          <div>
            <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">
              Bobot Kriteria (AHP)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tentukan bobot tiap kriteria evaluasi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            title="Info metode AHP"
          >
            <Info size={13} />
          </button>
          <Button variant="secondary" size="sm" onClick={equalizeWeights}>
            <RefreshCw size={11} />
            Ratakan
          </Button>
        </div>
      </div>

      {/* Info banner */}
      {showInfo && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-700 leading-relaxed">
          <strong>Analytic Hierarchy Process (AHP)</strong> mengubah pertimbangan
          subjektif menjadi bobot prioritas. Pastikan total bobot semua kriteria
          berjumlah <strong>100%</strong>. Tipe <em>Benefit</em> berarti nilai
          lebih tinggi = lebih baik; tipe <em>Cost</em> berarti nilai lebih
          rendah = lebih baik.
        </div>
      )}

      {/* Criteria rows */}
      <div className="divide-y divide-slate-50">
        {criteria.map((c) => (
          <div key={c.id} className="px-5 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-navy-900 font-serif truncate">
                {c.label}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{c.description}</p>
            </div>

            {/* Benefit / Cost toggle */}
            <button
              onClick={() => toggleBenefit(c.id)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors",
                c.benefit
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
              )}
              title={c.benefit ? "Ubah ke Cost" : "Ubah ke Benefit"}
            >
              {c.benefit ? "Benefit" : "Cost"}
            </button>

            {/* Weight input + mini bar */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-navy-600 to-gold-500 transition-all duration-300"
                  style={{ width: `${c.weight}%` }}
                />
              </div>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={c.weight}
                  onChange={(e) => setWeight(c.id, e.target.value)}
                  className="w-12 text-right text-[13px] font-semibold font-serif text-navy-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-gold-500 transition-colors"
                />
                <span className="text-[11px] text-slate-400">%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <span className={cn("text-[12px] font-semibold font-serif", weightLabel.color)}>
          {weightLabel.text}
        </span>
        <Button
          variant="primary"
          size="md"
          onClick={onRun}
          disabled={!canRun}
        >
          {isLoading ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Menghitung…
            </>
          ) : (
            "Jalankan Analisis →"
          )}
        </Button>
      </div>
    </div>
  );
}
