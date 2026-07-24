"use client";

import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Tag, ShieldAlert, ShieldCheck, Shield, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import type { Criterion, TopsisResult } from "@/lib/ahp-topsis";
import type { RiskResult, RiskLevel } from "@/lib/xgboost-risk";

// ─── Re-export Alternative so page.tsx can import from here ──────────────────
export interface Alternative {
  id: string;
  name: string;
  code?: string;
  values: Record<string, number>;
}

// Re-export TopsisResult for page.tsx convenience
export type { TopsisResult };

// ─── Props ───────────────────────────────────────────────────────────────────

interface TopsisResultsPanelProps {
  results: TopsisResult[];
  criteria?: Criterion[];
  /** XGBoost risk results to co-display alongside TOPSIS scores */
  riskResults?: RiskResult[];
  isLoading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "from-green-400 to-green-600"
    : pct >= 40 ? "from-amber-400 to-amber-600"
    : "from-rose-400 to-rose-600";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[50px]">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-bold tabular-nums text-slate-700 w-12 text-right shrink-0">
        {score.toFixed(4)}
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900 text-[11px] font-extrabold shadow-sm">
        <Trophy size={10} />1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[11px] font-extrabold">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-[11px] font-bold">
      {rank}
    </span>
  );
}

function TrendIcon({ score }: { score: number }) {
  if (score >= 0.7) return <TrendingUp size={13} className="text-green-500" />;
  if (score >= 0.4) return <Minus size={13} className="text-amber-500" />;
  return <TrendingDown size={13} className="text-rose-500" />;
}

function ReasonTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-900/10 text-navy-900 text-[10px] font-semibold border border-navy-900/10">
      <Tag size={8} />
      {label}
    </span>
  );
}

// ─── Inline risk badge for TOPSIS rows ───────────────────────────────────────

const RISK_MINI: Record<RiskLevel, { icon: typeof ShieldCheck; cls: string }> = {
  Low:      { icon: ShieldCheck, cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  Medium:   { icon: Shield,      cls: "text-amber-600  bg-amber-50  border-amber-200"  },
  High:     { icon: ShieldAlert, cls: "text-orange-600 bg-orange-50 border-orange-200" },
  Critical: { icon: ShieldX,     cls: "text-rose-600   bg-rose-50   border-rose-200"   },
};

function RiskMini({ level, score }: { level: RiskLevel; score: number }) {
  const { icon: Icon, cls } = RISK_MINI[level];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold", cls)}>
      <Icon size={9} />
      {score.toFixed(2)}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-slate-50">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-slate-100 rounded w-1/3" />
            <div className="h-2.5 bg-slate-100 rounded w-1/5" />
          </div>
          <div className="h-2 bg-slate-100 rounded w-36" />
          <div className="h-3 bg-slate-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// ─── Detail expandable row ───────────────────────────────────────────────────

function ResultRow({
  result,
  criteria,
  risk,
}: {
  result: TopsisResult;
  criteria: Criterion[];
  risk?: RiskResult;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Main row */}
      <div
        className={cn(
          "grid items-center gap-0 px-5 py-3.5 transition-colors cursor-pointer select-none",
          "grid-cols-[40px_1fr_170px_80px_56px_32px]",
          result.rank === 1 ? "bg-gold-300/10 hover:bg-gold-300/20" : "hover:bg-slate-50"
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Rank */}
        <div><RankBadge rank={result.rank} /></div>

        {/* Name + reasons */}
        <div className="min-w-0 pr-3">
          <p className="text-[13px] font-semibold text-navy-900 font-serif truncate">{result.name}</p>
          {result.code && (
            <p className="text-[11px] text-slate-400 font-mono">{result.code}</p>
          )}
          {result.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {result.reasons.map((r) => <ReasonTag key={r} label={r} />)}
            </div>
          )}
        </div>

        {/* Score bar */}
        <ScoreBar score={result.score} />

        {/* Risk badge */}
        <div className="flex justify-center">
          {risk ? <RiskMini level={risk.risk_level} score={risk.risk_score} /> : <span className="text-slate-200 text-[10px]">—</span>}
        </div>

        {/* Trend */}
        <div className="flex justify-center">
          <TrendIcon score={result.score} />
        </div>

        {/* Expand chevron */}
        <div className="flex justify-end text-slate-300">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Detail Nilai Terbobot per Kriteria
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {criteria.map((c) => {
              const wv = result.weightedValues?.[c.id] ?? 0;
              const nv = result.normalizedValues?.[c.id] ?? 0;
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    c.benefit ? "bg-green-400" : "bg-rose-400"
                  )} />
                  <span className="text-[12px] text-slate-600 w-28 truncate">{c.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", c.benefit ? "bg-green-400" : "bg-rose-400")}
                      style={{ width: `${Math.min(100, nv * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-slate-500 font-mono w-14 text-right shrink-0">
                    {wv.toFixed(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ─── TOPSIS Step Summary ──────────────────────────────────────────────────────

function TopsisStepSummary() {
  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        Metode Perankingan TOPSIS
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { step: "1", label: "Matriks Keputusan" },
          { step: "2", label: "Normalisasi Vektor" },
          { step: "3", label: "Matriks Terbobot AHP" },
          { step: "4", label: "Solusi Ideal Terbaik & Terburuk" },
          { step: "5", label: "Jarak ke Solusi Ideal" },
          { step: "6", label: "Skor Kedekatan (Ci)" },
          { step: "7", label: "Perankingan Akhir" },
        ].map(({ step, label }) => (
          <div
            key={step}
            className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
          >
            <span className="w-4 h-4 rounded-full bg-navy-900 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">
              {step}
            </span>
            <span className="text-[11px] text-slate-600">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
        Skor TOPSIS (Ci) mencerminkan posisi relatif supplier terhadap kondisi ideal — bukan skor risiko.
        Skor risiko ML ditampilkan secara terpisah sebagai informasi pelengkap.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TopsisResultsPanel({
  results,
  criteria = [],
  riskResults = [],
  isLoading = false,
}: TopsisResultsPanelProps) {
  // Build supplier_id → RiskResult map for O(1) lookup
  const riskMap = new Map(riskResults.map(r => [r.supplier_id, r]));
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center">
          <span className="text-navy-900 text-[9px] font-extrabold">TOP</span>
        </div>
        <div>
          <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">
            Perankingan Supplier Keseluruhan
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ranking multi-kriteria AHP + TOPSIS — klik baris untuk detail nilai terbobot
          </p>
        </div>
      </div>

      {/* Column headers */}
      {!isLoading && results.length > 0 && (
        <div className="grid grid-cols-[40px_1fr_170px_80px_56px_32px] gap-0 bg-slate-50 border-b border-slate-100 px-5 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">#</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Tooltip term="Skor TOPSIS" label="Closeness Coefficient (Ci) — seberapa dekat supplier ke solusi ideal. Mendekati 1 = peringkat terbaik di semua kriteria." />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
            <Tooltip term="Prediksi Risiko ML" label="Probabilitas keterlambatan pengiriman (0–1) dari model XGBoost. Ditampilkan sebagai pelengkap — bukan bagian dari skor TOPSIS." />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Tren</span>
          <span />
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <Skeleton />
      ) : results.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Trophy size={20} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500 font-serif">Belum ada hasil</p>
          <p className="text-[12px] text-slate-400 max-w-xs">
            Lengkapi matriks AHP, klik <strong>Hitung Bobot AHP</strong>, lalu{" "}
            <strong>Jalankan Analisis</strong>.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
          {results.map((r) => (
            <ResultRow
              key={r.alternativeId}
              result={r}
              criteria={criteria}
              risk={riskMap.get(Number(r.alternativeId))}
            />
          ))}
        </div>
      )}

      {/* TOPSIS step summary footer */}
      {results.length > 0 && !isLoading && <TopsisStepSummary />}
    </div>
  );
}
