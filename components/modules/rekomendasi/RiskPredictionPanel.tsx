"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import {
  ShieldAlert, ShieldCheck, ShieldX, Shield,
  ChevronDown, ChevronUp, Info, Zap,
  FlaskConical, TrendingDown, BarChart3,
  RefreshCw, UploadCloud, Database, Server, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskResult, RiskLevel } from "@/lib/xgboost-risk";
import { FEATURE_RISK_DIR } from "@/lib/xgboost-risk";
import type {
  BackendModelMetrics,
  BackendSplitMetrics,
  BackendRoundMetrics,
  BackendFoldResult,
  ProductionModelType,
} from "@/lib/services/supplier-risk.service";
import { getActiveModel } from "@/lib/services/supplier-risk.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskPredictionPanelProps {
  results:         RiskResult[];
  backendMetrics?: BackendModelMetrics | null;
  isLoading?:      boolean;
  riskSource?:     "backend" | "client";
  isTraining?:     boolean;
  trainMessage?:   string | null;
  trainError?:     string | null;
  onTrainFromErp?:       () => void;
  onTrainFromServerCsv?: () => void;
  onTrainFromCsvUpload?: (file: File) => void;
  /** Currently active production model. Defaults to env-var / "xgboost". */
  activeModel?:    ProductionModelType;
  /** Called when the user toggles the model. */
  onModelChange?:  (model: ProductionModelType) => void;
}

// ─── Inline term tooltip ──────────────────────────────────────────────────────
// Replicates the same portal+navy popover pattern as ui/Tooltip but
// designed for dense table/chip contexts: dotted underline, no external dep.

const GLOSSARY: Record<string, string> = {
  "XGBoost":          "eXtreme Gradient Boosting — algoritma ensemble yang melatih banyak decision tree secara berurutan, tiap tree memperbaiki kesalahan tree sebelumnya.",
  "Linear Regression": "Model regresi linear baseline akademik — memprediksi probabilitas keterlambatan (kontinu 0–1) dengan ambang batas klasifikasi 0.50.",
  "SHAP":             "SHapley Additive exPlanations — metode matematis untuk menghitung kontribusi tiap fitur terhadap prediksi model. Nilai positif = menambah risiko.",
  "Risk Score":       "Skor risiko supplier ∈ [0, 1]. Dihitung dari output model machine learning terpilih (XGBoost / Linear Regression). Semakin mendekati 1 = semakin berisiko.",
  "Log-Loss":         "Binary cross-entropy loss — mengukur seberapa 'yakin' model terhadap prediksinya. Nilai lebih kecil = model lebih akurat.",
  "Precision": "Precision = TP / (TP + FP). Mengukur seberapa banyak prediksi positif yang benar.",
  "Recall": "Recall = TP / (TP + FN). Mengukur seberapa banyak kasus positif berhasil dideteksi.",
  "F1 Score": "Harmonic mean antara Precision dan Recall. Cocok digunakan pada dataset yang tidak seimbang.",
  "AUC-ROC":          "Area Under the ROC Curve — mengukur kemampuan model memisahkan kelas risiko tinggi vs rendah. AUC=1 sempurna, AUC=0.5 acak.",
  "Accuracy":         "Proporsi prediksi kelas yang benar pada threshold 0.5. Kurang informatif jika label tidak seimbang.",
  "Early Stopping":   "Pelatihan dihentikan lebih awal saat val loss tidak membaik selama N round (patience). Mencegah overfitting.",
  "Learning Curve":   "Grafik log-loss per boosting round. Kurva val yang naik setelah turun mengindikasikan overfitting.",
  "5-Fold CV":        "5-Fold Cross-Validation — dataset dibagi 5 bagian; tiap fold digunakan sekali sebagai test set. Mengukur generalisasi secara robust.",
  "On-Time Rate":     "Proporsi Goods Receipt yang tiba pada atau sebelum expected_date Purchase Order. Dihitung dari data ERP.",
  "Lead Time CV":     "Coefficient of Variation lead time = std/mean. Nilai tinggi = lead time tidak konsisten = risiko lebih besar.",
  "Delivery Margin":  "(expected_days − actual_days) / actual_days. Positif = supplier lebih cepat dari tenggat, negatif = terlambat.",
  "Low Stock Ratio":  "Proporsi SKU katalog supplier yang stok saat ini ≤ 2 unit (dari data inventaris Excel). Tinggi = risiko stockout.",
  "Avg Stok":         "Rata-rata level stok saat ini di seluruh SKU katalog supplier (dari inventaris Excel PT. Hang Song).",
  "Hari Inaktif":     "Jumlah hari sejak Goods Receipt terakhir diterima dari supplier ini. Tinggi = supplier jarang aktif.",
  "SKU Katalog":      "Jumlah produk unik dalam katalog ERP yang ditawarkan oleh supplier ini.",
  "Order Count":      "Jumlah Purchase Order yang pernah diterbitkan ke supplier ini. Semakin banyak = track record lebih kuat.",
  "Gradient Boosting":"Teknik ensemble ML: setiap tree baru dilatih untuk memperbaiki residual (gradient) dari tree sebelumnya menggunakan optimasi gradien.",
  "Stratified Split":  "Pemecahan dataset yang mempertahankan distribusi label di tiap subset (train/val/test), agar tidak terjadi bias sampling.",
  "Data Leakage":     "Kebocoran informasi dari test/val ke training set yang menyebabkan metrik terlalu optimis. Dihindari dengan fit scaler hanya pada train.",
};

function TermTip({ term, children }: { term: string; children?: React.ReactNode }) {
  const [open, setOpen]     = useState(false);
  const [pos, setPos]       = useState<{ top: number; left: number; side: "top" | "bottom" } | null>(null);
  const ref                 = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const def = GLOSSARY[term];

  useEffect(() => { setMounted(true); }, []);

  const compute = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const side: "top" | "bottom" = r.top > 120 ? "top" : "bottom";
    setPos({
      top:  side === "top" ? r.top + window.scrollY - 8 : r.bottom + window.scrollY + 8,
      left: r.left + window.scrollX + r.width / 2,
      side,
    });
  }, []);

  if (!def) return <span>{children ?? term}</span>;

  return (
    <span
      ref={ref}
      className="inline-flex items-center gap-0.5 cursor-help"
      onMouseEnter={() => { compute(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => { compute(); setOpen(true); }}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <span className="border-b border-dotted border-slate-400 leading-none">{children ?? term}</span>
      {mounted && open && pos && createPortal(
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: pos.top, left: pos.left, zIndex: 9999, pointerEvents: "none",
            transform: pos.side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          }}
          className="w-max max-w-[260px] bg-navy-900 text-white text-[11px] font-serif font-normal leading-relaxed px-3 py-2 rounded-xl shadow-xl border border-navy-700"
        >
          <span style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)", width: 0, height: 0,
            ...(pos.side === "top"
              ? { top: "100%", borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #0d1b2a" }
              : { bottom: "100%", borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "4px solid #0d1b2a" }),
          }} />
          <span className="text-gold-400 font-bold block mb-0.5">{term}</span>
          {def}
        </span>,
        document.body,
      )}
    </span>
  );
}

// ─── Risk level config ────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, {
  label: string; icon: typeof ShieldCheck;
  bg: string; text: string; bar: string; border: string; badge: string;
}> = {
  Low: {
    label: "Risiko Rendah", icon: ShieldCheck,
    bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500",
    border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  Medium: {
    label: "Risiko Sedang", icon: Shield,
    bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-400",
    border: "border-amber-200", badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  High: {
    label: "Risiko Tinggi", icon: ShieldAlert,
    bg: "bg-orange-50", text: "text-orange-700", bar: "bg-orange-500",
    border: "border-orange-200", badge: "bg-orange-100 text-orange-700 border-orange-200",
  },
  Critical: {
    label: "Kritis", icon: ShieldX,
    bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-600",
    border: "border-rose-200", badge: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

// ─── Risk score bar ───────────────────────────────────────────────────────────

function RiskScoreBar({ score, level }: { score: number; level: RiskLevel }) {
  const cfg = RISK_CONFIG[level];
  const s = Number(score ?? 0);
  const pct = Math.round(s * 100);
  return (
    <div className="flex items-center gap-2 min-w-0 pr-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={cn("h-full rounded-full transition-all duration-700", cfg.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-bold tabular-nums text-slate-700 w-12 text-right shrink-0">
        {s.toFixed(3)}
      </span>
    </div>
  );
}

// ─── Risk level badge ─────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG["Low"];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
      cfg.badge,
    )}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

// ─── SHAP contribution bar ────────────────────────────────────────────────────

function ContribBar({ name, value }: { name: string; value: number }) {
  const dir = FEATURE_RISK_DIR[name] ?? "increases";
  // Positive contribution in risk-increasing direction = red
  // Positive contribution in risk-decreasing direction = green
  const isRiskUp = (dir === "increases" && value > 0) || (dir === "decreases" && value < 0);
  const abs = Math.abs(value);
  const maxBar = 0.15; // cap for visual scaling
  const pct = Math.min(100, (abs / maxBar) * 100);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-600 w-40 shrink-0 truncate">
        <TermTip term={name}>{name}</TermTip>
      </span>
      <div className="flex-1 flex items-center gap-1 min-w-0">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isRiskUp ? "bg-rose-400" : "bg-emerald-400")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn(
          "text-[10px] font-mono font-semibold w-14 text-right shrink-0",
          isRiskUp ? "text-rose-500" : "text-emerald-600",
        )}>
          {value > 0 ? "+" : ""}{value.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

// ─── Feature value display ────────────────────────────────────────────────────

function FeatureChip({ label, value, warn, tip }: { label: string; value: string; warn?: boolean; tip?: string }) {
  return (
    <div className={cn(
      "flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-center min-w-[72px]",
      warn ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200",
    )}>
      <span className={cn("text-[9px] font-bold uppercase tracking-wide", warn ? "text-rose-400" : "text-slate-400")}>
        {tip ? <TermTip term={tip}>{label}</TermTip> : label}
      </span>
      <span className={cn("text-[12px] font-bold tabular-nums mt-0.5", warn ? "text-rose-600" : "text-slate-700")}>
        {value}
      </span>
    </div>
  );
}

// ─── Expandable supplier risk row ─────────────────────────────────────────────

function RiskRow({ result, rank }: { result: RiskResult; rank: number }) {
  const [open, setOpen] = useState(false);
  const cfg = RISK_CONFIG[result.risk_level];

  // Top contributing features (by absolute value)
  const sortedContribs = Object.entries(result.contributions)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6);

  const f = result.features ?? {} as any;
  // Safely coerce all feature values — backend may omit some fields
  const onTimeRate     = Number(f.on_time_rate    ?? 0);
  const avgLeadTime    = Number(f.avg_lead_time   ?? 0);
  const orderCount     = Number(f.order_count     ?? 0);
  const leadTimeCv     = Number(f.lead_time_cv    ?? 0);
  const deliveryMargin = Number(f.delivery_margin ?? 0);
  const lowStockRatio  = Number(f.low_stock_ratio ?? 0);
  const avgStockLevel  = Number(f.avg_stock_level ?? 0);
  const daysSinceGr    = Number(f.days_since_last_gr ?? 0);
  const catalogSku     = Number(f.catalog_sku_count  ?? 0);
  const avgPrice       = Number(f.avg_price       ?? 0);

  return (
    <>
      <div
        onClick={() => setOpen(v => !v)}
        className={cn(
          "grid items-center gap-0 px-5 py-3.5 cursor-pointer select-none transition-colors",
          "grid-cols-[32px_1fr_200px_150px_32px]",
          result.risk_level === "Critical" ? "bg-rose-50/40 hover:bg-rose-50/70"
          : result.risk_level === "High"   ? "bg-orange-50/30 hover:bg-orange-50/60"
          : "hover:bg-slate-50",
        )}
      >
        {/* Rank */}
        <span className="text-[11px] font-bold text-slate-400 tabular-nums">{rank}</span>

        {/* Name */}
        <div className="min-w-0 pr-3">
          <p className="text-[13px] font-semibold text-navy-900 font-serif truncate">{result.supplier_name}</p>
          <div className="mt-0.5">
            <RiskBadge level={result.risk_level} />
          </div>
        </div>

        {/* Score bar */}
        <RiskScoreBar score={result.risk_score} level={result.risk_level} />

        {/* On-time + lead time chips */}
        <div className="flex gap-1.5 justify-end">
          <FeatureChip
            label="On-Time"
            value={`${(onTimeRate * 100).toFixed(0)}%`}
            warn={onTimeRate < 0.7}
          />
          <FeatureChip
            label="Lead (d)"
            value={String(Math.round(avgLeadTime))}
            warn={avgLeadTime > 21}
          />
        </div>

        {/* Expand */}
        <div className="flex justify-end text-slate-300">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className={cn("border-t px-5 py-4 space-y-4", cfg.border, cfg.bg + "/30")}>

          {/* Feature chips row */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Nilai Fitur
            </p>
            <div className="flex flex-wrap gap-2">
              <FeatureChip label="Order Count" value={String(orderCount)}             warn={orderCount < 3}          tip="Order Count"      />
              <FeatureChip label="LT CV"       value={leadTimeCv.toFixed(2)}          warn={leadTimeCv > 0.5}        tip="Lead Time CV"     />
              <FeatureChip label="Margin"      value={`${(deliveryMargin * 100).toFixed(1)}%`} warn={deliveryMargin < -0.1} tip="Delivery Margin"  />
              <FeatureChip label="Low Stock"   value={`${(lowStockRatio * 100).toFixed(0)}%`}  warn={lowStockRatio > 0.4}   tip="Low Stock Ratio"  />
              <FeatureChip label="Avg Stok"    value={avgStockLevel.toFixed(1)}        warn={avgStockLevel < 3}       tip="Avg Stok"         />
              <FeatureChip label="Hari Inaktif" value={String(Math.round(daysSinceGr))} warn={daysSinceGr > 90}       tip="Hari Inaktif"     />
              <FeatureChip label="SKU Katalog" value={String(catalogSku)}                                             tip="SKU Katalog"      />
              <FeatureChip
                label="Harga Avg"
                value={avgPrice > 0 ? `${(avgPrice / 1000).toFixed(0)}k` : "—"}
              />
            </div>
          </div>

          {/* SHAP contributions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Kontribusi Fitur (<TermTip term="SHAP">SHAP</TermTip>)
              <span className="ml-2 normal-case text-slate-300 font-normal tracking-normal">
                merah = menambah risiko · hijau = mengurangi risiko
              </span>
            </p>
            <div className="space-y-1.5">
              {sortedContribs.map(([name, val]) => (
                <ContribBar key={name} name={name} value={val} />
              ))}
            </div>
          </div>

          {/* Risk score breakdown */}
          <div className="flex gap-3">
            <div className={cn("flex-1 rounded-xl border p-3 text-center", cfg.border, cfg.bg)}>
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-1">Probabilitas Keterlambatan</p>
              <p className={cn("text-xl font-bold font-mono", cfg.text)}>{Number(result.risk_score ?? 0).toFixed(3)}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">0 = aman · 1 = kritis</p>
            </div>
            <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-1">Level</p>
              <p className={cn("text-base font-bold font-serif", cfg.text)}>{cfg.label}</p>
              <div className="mt-1 flex justify-center">
                <RiskBadge level={result.risk_level} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-slate-50">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
          <div className="w-5 h-4 bg-slate-100 rounded" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-slate-100 rounded w-2/5" />
            <div className="h-2.5 bg-slate-100 rounded w-1/4" />
          </div>
          <div className="h-2 bg-slate-100 rounded w-36" />
          <div className="flex gap-1.5">
            <div className="h-8 w-14 bg-slate-100 rounded-lg" />
            <div className="h-8 w-14 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Distribution summary bar ─────────────────────────────────────────────────

function RiskDistribution({ results }: { results: RiskResult[] }) {
  const counts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const r of results) counts[r.risk_level]++;
  const total = results.length;

  return (
    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        Distribusi Risiko
      </p>
      <div className="flex gap-3 flex-wrap">
        {(["Low", "Medium", "High", "Critical"] as RiskLevel[]).map(level => {
          const cfg = RISK_CONFIG[level];
          const Icon = cfg.icon;
          const count = counts[level];
          if (count === 0) return null;
          return (
            <div key={level} className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold",
              cfg.badge,
            )}>
              <Icon size={11} />
              {count} {cfg.label}
              <span className="font-normal opacity-60">
                ({Math.round((count / total) * 100)}%)
              </span>
            </div>
          );
        })}
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden mt-2 gap-px">
        {(["Low", "Medium", "High", "Critical"] as RiskLevel[]).map(level => {
          const pct = (counts[level] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={level}
              className={cn("h-full transition-all", RISK_CONFIG[level].bar)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── ML Metrics card ─────────────────────────────────────────────────────────

function MetricCell({
  label, value, good, bad, tip,
}: {
  label: string; value: string | number;
  good?: boolean; bad?: boolean; tip?: string;
}) {
  return (
    <div className="flex flex-col items-center bg-white border border-slate-100 rounded-xl p-3 text-center min-w-[72px]">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        {tip ? <TermTip term={tip}>{label}</TermTip> : label}
      </span>
      <span className={cn(
        "text-[14px] font-bold tabular-nums font-mono",
        good ? "text-emerald-600" : bad ? "text-rose-500" : "text-navy-900",
      )}>
        {typeof value === "number"
          ? Number.isInteger(value)
            ? value.toLocaleString("id-ID")
            : value.toFixed(4)
          : value}
      </span>
    </div>
  );
}

function SplitMetricsRow({
  label, m, color,
}: {
  label: string; m: BackendSplitMetrics; color: "blue" | "amber" | "emerald";
}) {
  const cls = {
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  }[color];
  return (
    <div className="space-y-1.5">
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold", cls)}>
        {label}
        <span className="font-normal opacity-70">n={m.n}</span>
      </div>
        <div className="flex flex-wrap gap-1.5">
          <MetricCell label="Precision" value={`${(m.precision * 100).toFixed(1)}%`} good={m.precision > 0.85} bad={m.precision < 0.65} tip="Precision" />
          <MetricCell label="Recall"    value={`${(m.recall * 100).toFixed(1)}%`}    good={m.recall > 0.85}    bad={m.recall < 0.65}    tip="Recall" />
          <MetricCell label="F1 Score"  value={`${(m.f1_score * 100).toFixed(1)}%`}  good={m.f1_score > 0.85}  bad={m.f1_score < 0.65}  tip="F1 Score" />
          <MetricCell label="Accuracy"  value={`${(m.accuracy * 100).toFixed(1)}%`}  good={m.accuracy > 0.85}  bad={m.accuracy < 0.65}  tip="Accuracy" />
          <MetricCell label="AUC-ROC"   value={m.auc} good={m.auc > 0.85} bad={m.auc < 0.65} tip="AUC-ROC" />
        </div>
    </div>
  );
}

// Micro SVG learning curve — no external chart lib needed
function LearningCurveChart({ curve }: { curve: BackendRoundMetrics[] }) {
  if (curve.length < 2) return null;

  const W = 400, H = 100, PAD = { t: 8, r: 8, b: 20, l: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const allLoss = curve.flatMap(r => [r.trainLoss, r.valLoss]);
  const minL = Math.min(...allLoss) * 0.95;
  const maxL = Math.max(...allLoss) * 1.05;
  const rounds = curve.length;

  const xPos = (i: number) => PAD.l + (i / (rounds - 1)) * innerW;
  const yPos = (v: number) => PAD.t + innerH - ((v - minL) / (maxL - minL || 1)) * innerH;

  const trainPath = curve.map((r, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(r.trainLoss).toFixed(1)}`).join(" ");
  const valPath   = curve.map((r, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(r.valLoss).toFixed(1)}`).join(" ");

  // Y axis ticks
  const ticks = [minL, (minL + maxL) / 2, maxL];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280, maxHeight: 110 }}>
        {/* Grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yPos(t)} y2={yPos(t)} stroke="#e2e8f0" strokeWidth="0.5" />
            <text x={PAD.l - 3} y={yPos(t) + 3} textAnchor="end" fontSize="7" fill="#94a3b8">
              {t.toFixed(3)}
            </text>
          </g>
        ))}
        {/* X axis label */}
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="7" fill="#94a3b8">Round</text>

        {/* Train line */}
        <path d={trainPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Val line */}
        <path d={valPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3,2" />

        {/* Legend */}
        <rect x={PAD.l} y={PAD.t} width="8" height="2" fill="#3b82f6" rx="1" />
        <text x={PAD.l + 10} y={PAD.t + 3} fontSize="7" fill="#3b82f6">Train</text>
        <rect x={PAD.l + 38} y={PAD.t} width="8" height="2" fill="#f59e0b" rx="1" />
        <text x={PAD.l + 48} y={PAD.t + 3} fontSize="7" fill="#f59e0b">Val</text>
      </svg>
    </div>
  );
}

function CVFoldsTable({ folds, mean, std }: {
  folds: BackendFoldResult[]; mean: BackendSplitMetrics; std: BackendSplitMetrics;
}) {
  const metrics: { key: keyof BackendSplitMetrics; label: string; tip: string }[] = [
    { key: "precision", label: "Precision", tip: "Precision" },
    { key: "recall",    label: "Recall",    tip: "Recall" },
    { key: "f1_score",  label: "F1 Score",  tip: "F1 Score" },
    { key: "accuracy",  label: "Accuracy",  tip: "Accuracy" },
    { key: "auc",       label: "AUC-ROC",   tip: "AUC-ROC" },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wide">Fold</th>
            {metrics.map(m => (
              <th key={m.key} className="px-3 py-2 text-center font-bold text-slate-400 uppercase tracking-wide">
                <TermTip term={m.tip}>{m.label}</TermTip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {folds.map(({ fold, metrics: fm }) => (
            <tr key={fold} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-1.5 font-semibold text-slate-600">
                Fold {fold}
              </td>

              {metrics.map(({ key }) => {
                const value = Number(fm[key] ?? 0);

                return (
                  <td
                    key={key}
                    className="px-3 py-1.5 text-center tabular-nums text-slate-600 font-mono"
                  >
                    {key === "accuracy"
                      ? `${(value * 100).toFixed(1)}%`
                      : value.toFixed(4)}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Mean row */}
          <tr className="bg-navy-900/5 border-t border-navy-900/10">
            <td className="px-3 py-1.5 font-bold text-navy-900">Mean</td>
            {metrics.map(({ key }) => {
              const value = Number(mean[key] ?? 0);

              return (
                <td key={key} className="px-3 py-1.5 text-center tabular-nums font-bold text-navy-900 font-mono">
                  {key === "accuracy"
                    ? `${(value * 100).toFixed(1)}%`
                    : value.toFixed(4)}
                </td>
              );
            })}
          </tr>
          {/* Std row */}
          <tr className="bg-slate-50/60">
            <td className="px-3 py-1.5 font-semibold text-slate-400">±Std</td>
              {metrics.map(({ key }) => {
              const value = Number(std[key] ?? 0);

              return (
                <td key={key} className="px-3 py-1.5 text-center tabular-nums text-slate-400 font-mono">
                  ±{key === "accuracy"
                    ? `${(value * 100).toFixed(1)}%`
                    : value.toFixed(4)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BackendMetricsCard({ m }: { m: BackendModelMetrics }) {
  const [open, setOpen] = useState(true);
  const hasCurve = m.learningCurve.length >= 2;
  const hasCv    = m.cvFolds.length > 0;
  const hasSplit = m.testMetrics.n > 0 || m.trainMetrics.n > 0;
  const modelLabel = m.model_type === "linear_regression" ? "Linear Regression" : "XGBoost";

  // Decide which tabs to show based on available data
  const tabs = [
    hasSplit || (m.accuracy != null)
      ? { key: "summary" as const, label: "Ringkasan",      icon: BarChart3    }
      : null,
    hasCurve
      ? { key: "curve"   as const, label: "Learning Curve", icon: TrendingDown }
      : null,
    hasCv
      ? { key: "cv"      as const, label: `${m.cvFolds.length}-Fold CV`, icon: FlaskConical }
      : null,
  ].filter(Boolean) as { key: "summary" | "curve" | "cv"; label: string; icon: any }[];

  const [tab, setTab] = useState<"summary" | "curve" | "cv">(tabs[0]?.key ?? "summary");

  return (
    <div className="border-t border-slate-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <FlaskConical size={13} className="text-blue-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Metrik Model ML ({modelLabel})
          </span>
          {m.samples_trained != null && m.samples_trained > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200">
              {m.samples_trained} sampel latih · {m.samples_tested ?? 0} sampel uji
            </span>
          )}
          {m.data_source && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] border border-slate-200">
              {m.data_source}
            </span>
          )}
          {m.trainedAt && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] border border-slate-200">
              {new Date(m.trainedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 py-4 space-y-4 bg-slate-50/30">

          {/* Tab switcher — only shown when multiple tabs exist */}
          {tabs.length > 1 && (
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-fit">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                    tab === key ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  <Icon size={11} />
                  {key === "curve" ? <TermTip term="Learning Curve">{label}</TermTip>
                    : key === "cv"  ? <TermTip term="5-Fold CV">{label}</TermTip>
                    : label}
                </button>
              ))}
            </div>
          )}

          {/* Summary — accuracy, ROC-AUC, sample counts */}
          {(tab === "summary" || tabs.length === 1) && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {m.accuracy != null && (
                  <MetricCell
                    label="Accuracy"
                    value={`${(m.accuracy * 100).toFixed(1)}%`}
                    good={m.accuracy > 0.85}
                    bad={m.accuracy < 0.65}
                    tip="Accuracy"
                  />
                )}
                {m.roc_auc != null && (
                  <MetricCell
                    label="AUC-ROC"
                    value={m.roc_auc}
                    good={m.roc_auc > 0.85}
                    bad={m.roc_auc < 0.65}
                    tip="AUC-ROC"
                  />
                )}
                {m.samples_trained != null && (
                  <MetricCell label="Sampel Latih" value={m.samples_trained} />
                )}
                {m.samples_tested != null && (
                  <MetricCell label="Sampel Uji"   value={m.samples_tested}  />
                )}
              </div>
              {/* Full split rows — only if the backend returns them */}
              {m.trainMetrics.n > 0 && (
                <SplitMetricsRow label="Training Set"   m={m.trainMetrics} color="blue"    />
              )}
              {m.valMetrics.n > 0 && (
                <SplitMetricsRow label="Validation Set" m={m.valMetrics}   color="amber"   />
              )}
              {m.testMetrics.n > 0 && (
                <SplitMetricsRow label="Test Set"       m={m.testMetrics}  color="emerald" />
              )}
            </div>
          )}

          {/* Learning curve */}
          {tab === "curve" && hasCurve && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500">
                  <TermTip term="Log-Loss">Log-loss</TermTip> per boosting round —
                  kurva <TermTip term="Early Stopping">val naik</TermTip> = mulai overfitting
                </p>
                <span className="text-[10px] font-mono text-slate-400">
                  {m.learningCurve.length} rounds{m.bestRound > 0 ? ` · best @ ${m.bestRound}` : ""}
                </span>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-3">
                <LearningCurveChart curve={m.learningCurve} />
              </div>
            </div>
          )}

          {/* Cross-validation */}
          {tab === "cv" && hasCv && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500">
                <TermTip term="5-Fold CV">{m.cvFolds.length}-fold CV</TermTip>
                {" "}— setiap fold melatih model independen
              </p>
              <CVFoldsTable folds={m.cvFolds} mean={m.cvMean} std={m.cvStd} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoMetricsPrompt({ activeModel }: { activeModel: ProductionModelType }) {
  const modelLabel = activeModel === "xgboost" ? "XGBoost" : "Linear Regression";
  return (
    <div className="border-t border-slate-100 px-5 py-8 flex flex-col items-center gap-3 text-center bg-slate-50/40">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
        <FlaskConical size={17} className="text-slate-300" />
      </div>
      <p className="text-[13px] font-semibold text-slate-500 font-serif">Metrik model belum tersedia</p>
      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
        Model belum pernah dilatih. Gunakan tombol di bawah untuk melatih model {modelLabel} —
        metrik Train / Val / Test, Learning Curve, dan CV Folds akan tampil di sini setelah selesai.
      </p>
    </div>
  );
}

// ─── Train Controls ───────────────────────────────────────────────────────────

function TrainControls({
  isTraining,
  trainMessage,
  trainError,
  onTrainFromErp,
  onTrainFromServerCsv,
  onTrainFromCsvUpload,
  activeModel,
  onModelChange,
}: {
  isTraining: boolean;
  trainMessage: string | null;
  trainError: string | null;
  onTrainFromErp?: () => void;
  onTrainFromServerCsv?: () => void;
  onTrainFromCsvUpload?: (file: File) => void;
  activeModel: ProductionModelType;
  onModelChange?: (model: ProductionModelType) => void;
}) {
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onTrainFromCsvUpload) {
      onTrainFromCsvUpload(file);
    }
    // Reset so the same file can be re-uploaded if needed
    e.target.value = "";
  }

  const btnBase =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border disabled:opacity-50 disabled:cursor-not-allowed";

  // ── Model toggle labels ──────────────────────────────────────────────
  const MODEL_LABELS: Record<ProductionModelType, string> = {
    xgboost:           "XGBoost",
    linear_regression: "Linear Regression",
  };

  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40 space-y-3">

      {/* ── Production Model selector ──────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Model Produksi
        </p>
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
          {(["xgboost", "linear_regression"] as ProductionModelType[]).map((m) => {
            const isActive = activeModel === m;
            return (
              <button
                key={m}
                disabled={isTraining}
                onClick={() => onModelChange?.(m)}
                title={
                  m === "xgboost"
                    ? "XGBoost Classifier — model produksi default"
                    : "Linear Regression — baseline akademik"
                }
                className={cn(
                  "px-4 py-2 text-[11px] font-semibold transition-all border-r last:border-r-0 border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed",
                  isActive
                    ? "bg-navy-900 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                {MODEL_LABELS[m]}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Model yang dipilih digunakan untuk semua pelatihan dan prediksi risiko.
          Untuk memuatnya, klik <em>Latih</em> lalu <em>Jalankan Analisis</em>.
        </p>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Latih Ulang Model — Backend {MODEL_LABELS[activeModel]}
      </p>

      <div className="flex flex-wrap gap-2">
        {/* Train from live ERP */}
        <button
          disabled={isTraining}
          onClick={onTrainFromErp}
          className={cn(
            btnBase,
            "bg-navy-900 text-white border-navy-800 hover:bg-navy-800 active:scale-95",
          )}
        >
          {isTraining
            ? <RefreshCw size={11} className="animate-spin" />
            : <Database size={11} />}
          Latih dari ERP
        </button>

        {/* Train from server-bundled CSV */}
        <button
          disabled={isTraining}
          onClick={onTrainFromServerCsv}
          className={cn(
            btnBase,
            "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 active:scale-95",
          )}
        >
          {isTraining
            ? <RefreshCw size={11} className="animate-spin text-slate-400" />
            : <Server size={11} className="text-slate-500" />}
          Latih dari CSV Server
        </button>

        {/* Train from CSV upload */}
        <button
          disabled={isTraining}
          onClick={() => fileRef.current?.click()}
          className={cn(
            btnBase,
            "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 active:scale-95",
          )}
        >
          {isTraining
            ? <RefreshCw size={11} className="animate-spin text-slate-400" />
            : <UploadCloud size={11} className="text-slate-500" />}
          Upload CSV
        </button>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          id={fileInputId}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Template CSV download */}
        <a
          href={(() => {
            const header = "supplier_price,lead_time_days,claim_rate,on_time_rate,order_frequency,late_delivery";
            const rows = [
              "320000,5,0.05,0.88,12,1",
              "150000,2,0.01,0.98,30,0",
              "500000,3,0.02,0.95,24,0",
              "610000,6,0.07,0.80,10,1",
            ].join("\n");
            const blob = new Blob([header + "\n" + rows], { type: "text/csv;charset=utf-8;" });
            return URL.createObjectURL(blob);
          })()}
          download="supplier_risk_template.csv"
          className={cn(
            btnBase,
            "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 active:scale-95 text-[10px]",
          )}
          title="Download template CSV dengan kolom yang benar"
        >
          ↓ Template CSV
        </a>
      </div>

      {/* Required columns hint */}
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Kolom wajib CSV:</span>
        {[
          "supplier_price",
          "lead_time_days",
          "claim_rate",
          "on_time_rate",
          "order_frequency",
          "late_delivery",
        ].map((col) => (
          <code
            key={col}
            className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-600"
          >
            {col}
          </code>
        ))}
      </div>

      {/* Feedback */}
      {isTraining && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <RefreshCw size={11} className="animate-spin text-navy-400 shrink-0" />
          Melatih model, mohon tunggu…
        </div>
      )}
      {!isTraining && trainMessage && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[11px] text-emerald-700">
          <CheckCircle2 size={12} className="shrink-0 mt-0.5 text-emerald-500" />
          {trainMessage}
        </div>
      )}
      {!isTraining && trainError && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-[11px] text-rose-700">
          <XCircle size={12} className="shrink-0 mt-0.5 text-rose-500" />
          {trainError}
        </div>
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed">
        <strong>Latih dari ERP</strong> — server membaca data live dan menghasilkan label otomatis.{" "}
        <strong>CSV Server</strong> — menggunakan file CSV yang sudah dibundel di server.{" "}
        <strong>Upload CSV</strong> — kirim file CSV berlabel dari komputer lokal.
        Setelah melatih, klik <em>Jalankan Analisis</em> untuk memperbarui prediksi.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RiskPredictionPanel({
  results,
  backendMetrics,
  isLoading = false,
  riskSource = "backend",
  isTraining = false,
  trainMessage = null,
  trainError = null,
  onTrainFromErp,
  onTrainFromServerCsv,
  onTrainFromCsvUpload,
  activeModel: activeModelProp,
  onModelChange,
}: RiskPredictionPanelProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Resolve the active model: prop → env var → default "xgboost"
  const activeModel: ProductionModelType =
    activeModelProp ?? getActiveModel();

  const MODEL_DISPLAY: Record<ProductionModelType, string> = {
    xgboost:           "XGBoost",
    linear_regression: "Linear Regression",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header — navy+gold to match TOPSIS panel design */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-navy-900 to-navy-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/80 flex items-center justify-center">
            <ShieldAlert size={13} className="text-white" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-white text-[15px] leading-none">
              Prediksi Risiko ML
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Probabilitas keterlambatan pengiriman per supplier —{" "}
              <TermTip term={activeModel === "xgboost" ? "XGBoost" : "Linear Regression"}>{MODEL_DISPLAY[activeModel]}</TermTip>
              {" · "}
              <TermTip term="SHAP">SHAP</TermTip>
              {" Attribution"}
              {" · "}
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                riskSource === "backend"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30",
              )}>
                {riskSource === "backend" ? "Backend API" : "Client-side"}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(v => !v)}
          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
          title="Keterangan model"
        >
          <Info size={13} />
        </button>
      </div>

      {/* Info banner */}
      {showInfo && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-700 leading-relaxed space-y-1">
          <p>
            <strong>Panel ini menampilkan Prediksi Risiko ML</strong> — seberapa besar kemungkinan
            setiap supplier mengalami keterlambatan pengiriman, berdasarkan data historis ERP.
            Skor mendekati 1 = risiko tinggi.
          </p>
          {activeModel === "xgboost" ? (
            <>
              <p>
                <TermTip term="XGBoost"><strong>XGBoost</strong></TermTip> melatih pohon{" "}
                <TermTip term="Gradient Boosting">CART secara berurutan</TermTip>.
                Split <TermTip term="Stratified Split"><strong>60/20/20</strong></TermTip> (train/val/test) —
                scaler difit hanya pada train set untuk menghindari{" "}
                <TermTip term="Data Leakage">data leakage</TermTip>.
              </p>
              <p>
                <TermTip term="Early Stopping"><strong>Early stopping</strong></TermTip> memantau val loss setiap round (patience 8).
                Model terbaik disimpan saat val loss minimum.
              </p>
              <p>
                <TermTip term="5-Fold CV"><strong>5-Fold CV</strong></TermTip> mengevaluasi generalisasi model secara robust.
                Setiap fold melatih model independen dengan scaler-nya sendiri.
              </p>
            </>
          ) : (
            <p>
              <strong>Linear Regression</strong> digunakan sebagai baseline akademik perbandingan.
              Output kontinu diperlakukan sebagai skor keterlambatan — nilai ≥ 0.50 diklasifikasikan
              sebagai delay = 1 (threshold baku 0.50). Skor risiko yang ditampilkan adalah nilai
              prediksi kontinu dari model.
            </p>
          )}
          <p>
            <TermTip term="SHAP"><strong>SHAP</strong></TermTip> menghitung kontribusi tiap fitur.
            Merah = menambah risiko keterlambatan, Hijau = mengurangi.
          </p>
          <p className="border-t border-blue-200 pt-1 text-blue-600">
            Hasil prediksi ini <strong>berbeda dari Perankingan TOPSIS</strong> — TOPSIS menggabungkan
            berbagai kriteria (harga, lead time, on-time rate, retur) untuk ranking keseluruhan.
          </p>
        </div>
      )}

      {/* Distribution */}
      {!isLoading && results.length > 0 && <RiskDistribution results={results} />}

      {/* Column headers */}
      {!isLoading && results.length > 0 && (
        <div className="grid grid-cols-[32px_1fr_200px_150px_32px] gap-0 bg-slate-50 border-b border-slate-100 px-5 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">#</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <TermTip term="Risk Score">Probabilitas Keterlambatan</TermTip>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Indikator</span>
          <span />
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <Skeleton />
      ) : results.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <ShieldAlert size={20} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500 font-serif">Belum ada prediksi risiko</p>
          <p className="text-[12px] text-slate-400 max-w-xs">
            Jalankan analisis terlebih dahulu. Model {MODEL_DISPLAY[activeModel]} akan melatih dan memprediksi risiko
            secara otomatis setelah data ERP dimuat.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {results.map((r, i) => (
            <RiskRow key={r.supplier_id || i} result={r} rank={i + 1} />
          ))}
        </div>
      )}

      {/* ML Metrics card — backend data or empty prompt */}
      {!isLoading && (
        backendMetrics
          ? <BackendMetricsCard m={backendMetrics} />
          : <NoMetricsPrompt activeModel={activeModel} />
      )}

      {/* Train controls */}
      <TrainControls
        isTraining={isTraining}
        trainMessage={trainMessage}
        trainError={trainError}
        onTrainFromErp={onTrainFromErp}
        onTrainFromServerCsv={onTrainFromServerCsv}
        onTrainFromCsvUpload={onTrainFromCsvUpload}
        activeModel={activeModel}
        onModelChange={onModelChange}
      />
    </div>
  );
}
