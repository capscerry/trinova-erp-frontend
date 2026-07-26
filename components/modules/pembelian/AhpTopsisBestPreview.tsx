"use client";

import { AlertCircle, BarChart2, CreditCard, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupplierRecommendations } from "@/lib/hooks/useSupplierRecommendations";

// --- Types --------------------------------------------------------------------

type PreviewVariant = "dark" | "light";

interface AhpTopsisBestPreviewProps {
  variant?: PreviewVariant;
  className?: string;
  showTitle?: boolean;
  /**
   * Set to false to skip the API fetch entirely (e.g. on roles that should not
   * trigger ERP data loading). Defaults to true.
   */
  enabled?: boolean;
}

// --- Per-preset display config ------------------------------------------------

const PRESET_UI: Record<string, { icon: any; dark: string; light: string; tag: string }> = {
  balanced: {
    icon: BarChart2,
    dark:  "border-l-slate-400 bg-white/5 border-white/10",
    light: "border-l-slate-400 bg-slate-50 border-slate-200",
    tag:   "SEIMBANG",
  },
  urgency_high: {
    icon: Zap,
    dark:  "border-l-rose-400 bg-rose-400/10 border-rose-300/20",
    light: "border-l-rose-400 bg-rose-50 border-rose-200",
    tag:   "URGENSI TINGGI",
  },
  budget_priority: {
    icon: CreditCard,
    dark:  "border-l-amber-400 bg-amber-400/10 border-amber-300/20",
    light: "border-l-amber-400 bg-amber-50 border-amber-200",
    tag:   "PRIORITAS BUDGET",
  },
  quality_focus: {
    icon: Trophy,
    dark:  "border-l-blue-400 bg-blue-400/10 border-blue-300/20",
    light: "border-l-blue-400 bg-blue-50 border-blue-200",
    tag:   "FOKUS KUALITAS",
  },
};

// --- Sub-components -----------------------------------------------------------

function ScoreBar({ score, variant }: { score: number; variant: PreviewVariant }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-1.5 w-16 overflow-hidden rounded-full", variant === "dark" ? "bg-white/10" : "bg-slate-200")}>
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${Math.max(8, Math.min(score * 100, 100))}%` }}
        />
      </div>
      <span className={cn("text-[10px] font-bold", variant === "dark" ? "text-white" : "text-navy-900")}>
        {score.toFixed(3)}
      </span>
    </div>
  );
}

function WinnerCard({
  presetKey, presetLabel, supplierName, score, variant,
}: {
  presetKey: string; presetLabel: string; supplierName: string; score: number; variant: PreviewVariant;
}) {
  const ui = PRESET_UI[presetKey] ?? PRESET_UI.balanced;
  const Icon = ui.icon;

  return (
    <div className={cn(
      "min-w-[170px] flex-1 rounded-xl border border-l-2 px-3 py-2.5",
      variant === "dark" ? ui.dark : ui.light,
    )}>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon size={10} className={variant === "dark" ? "text-white/50" : "text-slate-400"} />
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-widest",
          variant === "dark" ? "bg-white/10 text-white" : "bg-white/70 text-navy-800",
        )}>
          {ui.tag}
        </span>
      </div>

      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-[9px] font-extrabold text-navy-900">
          1
        </span>
        <p className={cn("truncate text-[12px] font-bold leading-tight", variant === "dark" ? "text-white" : "text-navy-900")}>
          {supplierName}
        </p>
      </div>

      <div className="mt-1.5 pl-5">
        <ScoreBar score={score} variant={variant} />
      </div>
    </div>
  );
}

function SkeletonCard({ variant }: { variant: PreviewVariant }) {
  return (
    <div className={cn(
      "min-w-[170px] flex-1 animate-pulse rounded-xl border border-l-2 px-3 py-2.5",
      variant === "dark"
        ? "border-white/10 border-l-white/20 bg-white/5"
        : "border-slate-200 border-l-slate-300 bg-slate-50",
    )}>
      <div className={cn("mb-2 h-3 w-20 rounded", variant === "dark" ? "bg-white/10" : "bg-slate-200")} />
      <div className={cn("mb-1.5 h-4 w-28 rounded", variant === "dark" ? "bg-white/10" : "bg-slate-200")} />
      <div className={cn("ml-5 h-1.5 w-16 rounded", variant === "dark" ? "bg-white/10" : "bg-slate-200")} />
    </div>
  );
}

// --- Main component -----------------------------------------------------------

export function AhpTopsisBestPreview({
  variant = "dark",
  className,
  showTitle = true,
  enabled = true,
}: AhpTopsisBestPreviewProps) {
  // Consume the shared singleton - no independent fetch or calculation here.
  const { loading, error, dataset } = useSupplierRecommendations();

  // When disabled (e.g. procurement_manager role) render nothing.
  if (!enabled) return null;

  if (error) {
    return (
      <div className={cn(
        "mt-4 flex items-center gap-2 text-[11px]",
        variant === "dark" ? "text-rose-300" : "text-rose-600",
        className,
      )}>
        <AlertCircle size={12} />
        Gagal memuat data ranking supplier.
      </div>
    );
  }

  return (
    <div className={cn(variant === "dark" ? "mt-5 border-t border-white/10 pt-4" : "mt-3", className)}>
      {showTitle && (
        <p className={cn(
          "mb-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400",
        )}>
          Supplier Terbaik per Profil AHP-TOPSIS
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} variant={variant} />)
        ) : !dataset || dataset.presets.length === 0 ? (
          <p className={cn("py-2 text-[11px]", variant === "dark" ? "text-slate-400" : "text-slate-500")}>
            Belum ada data supplier untuk diranking.
          </p>
        ) : (
          dataset.presets.map((preset) => {
            const top = preset.rankedSuppliers[0];
            return (
              <WinnerCard
                key={preset.key}
                presetKey={preset.key}
                presetLabel={preset.label}
                supplierName={top?.name ?? "-"}
                score={top?.score ?? 0}
                variant={variant}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
