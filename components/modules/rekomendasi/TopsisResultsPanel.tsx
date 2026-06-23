"use client";

import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Alternative {
  id: string;
  name: string;
  code?: string;
  values: Record<string, number>; // criterionId → raw value
}

export interface TopsisResult {
  alternativeId: string;
  name: string;
  code?: string;
  score: number;    // 0 – 1 closeness coefficient
  rank: number;
  dPlus: number;
  dMinus: number;
  normalizedValues: Record<string, number>;
}

interface TopsisResultsPanelProps {
  results: TopsisResult[];
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
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-bold tabular-nums text-slate-700 w-10 text-right shrink-0">
        <Tooltip
          term={(score).toFixed(4)}
          label="Nilai Kecocokan (Ci) — mendekati 1 berarti pilihan ini paling dekat ke kondisi ideal di semua kriteria."
        />
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-slate-50">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-slate-100 rounded w-1/3" />
            <div className="h-2.5 bg-slate-100 rounded w-1/5" />
          </div>
          <div className="h-2 bg-slate-100 rounded w-40" />
          <div className="h-3 bg-slate-100 rounded w-10" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TopsisResultsPanel({
  results,
  isLoading = false,
}: TopsisResultsPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center">
          <span className="text-navy-900 text-[10px] font-extrabold">TOP</span>
        </div>
        <div>
          <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">
            Hasil Perankingan
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Diurutkan berdasarkan nilai kecocokan tertinggi
          </p>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_160px_80px_100px] gap-0 bg-slate-50 border-b border-slate-100 px-5 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif">
          #
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif">
          Pilihan
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif">
          <Tooltip term="Nilai Kecocokan" label="Closeness Coefficient (Ci) — seberapa dekat pilihan ke kondisi ideal terbaik. Mendekati 1 = paling direkomendasikan." />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif text-center">
          Tren
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif text-right">
          <Tooltip term="Jarak ↑ / ↓" label="D+ (Jarak Terbaik) / D− (Jarak Terburuk) — jarak pilihan ke solusi ideal positif dan negatif. D+ kecil dan D− besar = terbaik." />
        </span>
      </div>

      {/* Body */}
      {isLoading ? (
        <Skeleton />
      ) : results.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Trophy size={20} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500 font-serif">
            Belum ada hasil
          </p>
          <p className="text-[12px] text-slate-400 max-w-xs">
            Atur bobot kriteria di atas lalu klik{" "}
            <strong>Jalankan Analisis</strong> untuk melihat perankingan.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {results.map((r) => (
            <div
              key={r.alternativeId}
              className={cn(
                "grid grid-cols-[40px_1fr_160px_80px_100px] gap-0 px-5 py-3.5 items-center transition-colors",
                r.rank === 1 && "bg-gold-300/10 hover:bg-gold-300/15",
                r.rank !== 1 && "hover:bg-slate-50"
              )}
            >
              {/* Rank */}
              <div>
                <RankBadge rank={r.rank} />
              </div>

              {/* Name */}
              <div className="min-w-0 pr-4">
                <p className="text-[13px] font-semibold text-navy-900 font-serif truncate">
                  {r.name}
                </p>
                {r.code && (
                  <p className="text-[11px] text-slate-400 font-mono">{r.code}</p>
                )}
              </div>

              {/* Score bar */}
              <ScoreBar score={r.score} />

              {/* Trend icon */}
              <div className="flex justify-center">
                <TrendIcon score={r.score} />
              </div>

              {/* Distance from best / worst */}
              <div className="text-right">
                <Tooltip
                  term={r.dPlus.toFixed(3)}
                  label="D+ (Jarak Terbaik) — jarak pilihan ke solusi ideal positif. Semakin kecil semakin baik."
                  className="text-[11px] tabular-nums text-rose-500 font-semibold"
                />
                <span className="text-[11px] text-slate-300 mx-1">/</span>
                <Tooltip
                  term={r.dMinus.toFixed(3)}
                  label="D− (Jarak Terburuk) — jarak pilihan ke solusi ideal negatif. Semakin besar semakin baik."
                  className="text-[11px] tabular-nums text-green-600 font-semibold"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
