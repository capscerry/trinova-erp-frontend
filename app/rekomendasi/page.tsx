"use client";

import { useState, useCallback, useEffect } from "react";
import { Brain, RefreshCw, Download, Info, AlertTriangle, ShieldAlert, Zap, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Button, Card, Tooltip } from "@/components/ui";
import { AhpCriteriaPanel } from "@/components/modules/rekomendasi/AhpCriteriaPanel";
import { TopsisResultsPanel } from "@/components/modules/rekomendasi/TopsisResultsPanel";
import { RiskPredictionPanel } from "@/components/modules/rekomendasi/RiskPredictionPanel";
import { topsis, calcOnTimeRates, calcDeliveryPunctuality } from "@/lib/ahp-topsis";
import { cn } from "@/lib/utils";
import type { Criterion, Alternative, TopsisResult } from "@/lib/ahp-topsis";

// ─── Display stats attached to each alternative (not used in TOPSIS math) ────
export interface SupplierStats {
  avgPrice:         number;   // Rp — avg unit price from catalog/invoices
  avgLeadTimeDays:  number;   // actual avg days PO→GR
  totalGRs:         number;   // count of GRs received
  onTimeGRs:        number;   // GRs that arrived ≤ expected_date
  grsWithExpected:  number;   // GRs that had an expected_date to compare against
  totalReturns:     number;   // return transactions
  punctualityScore: number;   // delivery_punctuality raw (−1 to +1)
}
import type { RiskResult } from "@/lib/xgboost-risk";

import { getPurchaseOrders } from "@/lib/services/po.service";
import { getGoodsReceipts } from "@/lib/services/gr.service";
import { getSupplierProducts } from "@/lib/services/supplier-product.service";
import { getSuppliers } from "@/lib/services/supplier.service";
import { getPurchaseReturns } from "@/lib/services/purchase-return.service";
import {
  predictSupplierRiskRaw,
  predictAllSuppliers,
  trainFromServerCsv,
  trainFromErp,
  trainFromCsvUpload,
  getModelMetrics,
  normalizeRiskLevel,
  buildMetricsFromTrainResponse,
  type SupplierRiskPredictResponse,
  type BackendModelMetrics,
} from "@/lib/services/supplier-risk.service";

// ─── AHP-TOPSIS criteria ──────────────────────────────────────────────────────
// Column order must match preset matrices in lib/ahp-topsis.ts:
//   0: avg_price            (Cost ↓)
//   1: lead_time            (Cost ↓)
//   2: on_time_rate         (Benefit ↑)
//   3: delivery_punctuality (Benefit ↑)
//   4: return_rate          (Cost ↓)

const CRITERIA: Criterion[] = [
  {
    id: "avg_price",
    label: "Harga Rata-rata",
    description: "Rata-rata harga satuan dari invoice pembelian sebelumnya — lebih rendah lebih baik",
    weight: 0,
    benefit: false,
  },
  {
    id: "lead_time",
    label: "Lead Time",
    description: "Rata-rata hari aktual dari tanggal PO ke tanggal GR — lebih cepat lebih baik",
    weight: 0,
    benefit: false,
  },
  {
    id: "on_time_rate",
    label: "On-Time Rate",
    description: "Proporsi GR yang tiba sebelum atau tepat pada expected_date PO — semakin tinggi semakin andal",
    weight: 0,
    benefit: true,
  },
  {
    id: "delivery_punctuality",
    label: "Ketepatan Waktu",
    description: "Skor ketepatan berbobot: GR lebih awal dari expected_date menaikkan skor, GR terlambat menurunkannya — positif = cenderung lebih cepat dari tenggat",
    weight: 0,
    benefit: true,
  },
  {
    id: "return_rate",
    label: "Tingkat Retur",
    description: "Rasio retur pembelian terhadap total GR — lebih sedikit retur lebih baik",
    weight: 0,
    benefit: false,
  },
];

// ─── Extended Alternative with display stats ─────────────────────────────────
// Alternative.values holds normalised numbers for TOPSIS math.
// stats holds the raw counts/amounts shown in the preview table.
// We use intersection type so AltWithStats is assignable to Alternative.
type AltWithStats = Alternative & { stats: SupplierStats };

// ─── Build TOPSIS alternatives from ERP data ─────────────────────────────────

function buildAlternatives(
  suppliers: any[],
  pos: any[],
  grs: any[],
  returns: any[],
  supplierProducts: any[],
): AltWithStats[] {
  // ── Normalise raw API shapes ──────────────────────────────────────────────
  const normPos = pos.map((p: any) => ({
    purchase_order_id: Number(p.purchase_order_id),
    supplier_id:       Number(p.supplier_id ?? p.supplier?.supplier_id ?? 0),
    order_date:        p.order_date    ?? null,
    expected_date:     p.expected_date ?? null,
  }));

  const normGrs = grs.map((g: any) => ({
    goods_receipt_id:  Number(g.goods_receipt_id),
    purchase_order_id: Number(g.purchase_order_id),
    receipt_date:      g.receipt_date ?? null,
  }));

  // Returns carry supplier_id directly from the backend
  const normReturns = returns.map((r: any) => ({
    supplier_id:      Number(r.supplier_id ?? 0),
    goods_receipt_id: Number(r.goods_receipt_id ?? 0),
  }));

  const normSps = supplierProducts.map((sp: any) => ({
    supplier_id:    Number(sp.supplier_id),
    supplier_price: Number(sp.supplier_price ?? sp.price ?? 0),
    lead_time_days: sp.lead_time_days != null ? Number(sp.lead_time_days) : null,
  }));

  const normSuppliers = suppliers.map((s: any) => ({
    supplier_id:   Number(s.supplier_id ?? s.id),
    supplier_name: s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id ?? s.id}`,
    supplier_code: s.supplier_code ?? s.kode ?? `S-${s.supplier_id ?? s.id}`,
  }));

  // ── Per-supplier aggregation buckets ─────────────────────────────────────
  type Agg = {
    name: string;
    code: string;
    orderCount: number;
    actualDays: number[];
    catalogDays: number[];
    prices: number[];
    grIds: Set<number>;       // GR IDs linked to this supplier
    onTimeGRs: number;        // GRs that arrived ≤ expected_date
    grsWithExpected: number;  // GRs that had an expected_date to compare against
  };

  const agg = new Map<number, Agg>();
  for (const s of normSuppliers) {
    agg.set(s.supplier_id, {
      name: s.supplier_name,
      code: s.supplier_code,
      orderCount: 0,
      actualDays: [],
      catalogDays: [],
      prices: [],
      grIds: new Set(),
      onTimeGRs: 0,
      grsWithExpected: 0,
    });
  }

  // ── PO → order count ──────────────────────────────────────────────────────
  for (const po of normPos) {
    const a = agg.get(po.supplier_id);
    if (a) a.orderCount++;
  }

  // ── Build lookup maps ─────────────────────────────────────────────────────
  const poMap = new Map(normPos.map((p) => [p.purchase_order_id, p]));

  // ── Compute on_time_rate + delivery_punctuality from ERP data ────────────
  const onTimeMap = calcOnTimeRates(
    normPos.map((p) => ({
      purchase_order_id: p.purchase_order_id,
      supplier_id:       p.supplier_id,
      expected_date:     p.expected_date,
    })),
    normGrs.map((g) => ({
      purchase_order_id: g.purchase_order_id,
      receipt_date:      g.receipt_date,
    })),
  );

  const punctualityMap = calcDeliveryPunctuality(
    normPos.map((p) => ({
      purchase_order_id: p.purchase_order_id,
      supplier_id:       p.supplier_id,
      order_date:        p.order_date,
      expected_date:     p.expected_date,
    })),
    normGrs.map((g) => ({
      purchase_order_id: g.purchase_order_id,
      receipt_date:      g.receipt_date,
    })),
  );

  // ── Actual lead times + GR IDs per supplier ───────────────────────────────
  for (const gr of normGrs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po?.order_date || !gr.receipt_date) continue;

    const actualDays =
      (new Date(gr.receipt_date).getTime() - new Date(po.order_date).getTime()) /
      86_400_000;
    if (actualDays < 0 || actualDays > 365) continue;

    const a = agg.get(po.supplier_id);
    if (!a) continue;
    a.actualDays.push(actualDays);
    a.grIds.add(gr.goods_receipt_id);

    // Track on-time counts for display stats
    if (po.expected_date) {
      a.grsWithExpected++;
      const receipt  = new Date(gr.receipt_date).getTime();
      const expected = new Date(po.expected_date).getTime();
      if (receipt <= expected) a.onTimeGRs++;
    }
  }

  // ── Catalog prices + catalog lead times ──────────────────────────────────
  for (const sp of normSps) {
    const a = agg.get(sp.supplier_id);
    if (!a) continue;
    if (sp.lead_time_days != null) a.catalogDays.push(sp.lead_time_days);
    if (sp.supplier_price > 0)     a.prices.push(sp.supplier_price);
  }

  // ── Return count per supplier ─────────────────────────────────────────────
  // Returns are linked via supplier_id directly (most reliable join).
  const returnCountMap = new Map<number, number>();
  for (const ret of normReturns) {
    if (ret.supplier_id === 0) continue;
    returnCountMap.set(ret.supplier_id, (returnCountMap.get(ret.supplier_id) ?? 0) + 1);
  }

  // ── Build Alternative[] ───────────────────────────────────────────────────
  const alternatives: AltWithStats[] = [];

  for (const [sid, a] of agg.entries()) {
    if (a.orderCount === 0) continue;

    // Avg price: prefer actual invoice prices over catalog prices
    const avgPrice =
      a.prices.length > 0
        ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length
        : 0;

    // Lead time: prefer actual GR-based days, fall back to catalog
    const avgLeadTime =
      a.actualDays.length > 0
        ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length
        : a.catalogDays.length > 0
          ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length
          : 14;

    // Return rate = total returns / total GR count for this supplier
    const grCount    = a.grIds.size;
    const retCount   = returnCountMap.get(sid) ?? 0;
    const returnRate = grCount > 0 ? retCount / grCount : 0;

    alternatives.push({
      id:   String(sid),
      name: a.name,
      code: a.code,
      values: {
        avg_price:            Math.round(avgPrice * 100) / 100,
        lead_time:            Math.round(avgLeadTime * 10) / 10,
        on_time_rate:         Math.round((onTimeMap.get(sid) ?? 0) * 1000) / 1000,
        delivery_punctuality: Math.round((punctualityMap.get(sid) ?? 0) * 1000) / 1000,
        return_rate:          Math.round(returnRate * 1000) / 1000,
      },
      stats: {
        avgPrice:          Math.round(avgPrice),
        avgLeadTimeDays:   Math.round(avgLeadTime * 10) / 10,
        totalGRs:          a.grIds.size,
        onTimeGRs:         a.onTimeGRs,
        grsWithExpected:   a.grsWithExpected,
        totalReturns:      retCount,
        punctualityScore:  Math.round((punctualityMap.get(sid) ?? 0) * 1000) / 1000,
      },
    });
  }

  return alternatives;
}

// ─── Pipeline step indicator ──────────────────────────────────────────────────

type PipelineStep = "idle" | "training" | "predicting" | "ranking" | "done";

const PIPELINE_STEPS: { key: PipelineStep; label: string; sub: string }[] = [
  { key: "training",   label: "1. Latih Model",      sub: "XGBoost · data ERP historis"  },
  { key: "predicting", label: "2. Prediksi Risiko",  sub: "ML inference · semua supplier" },
  { key: "ranking",    label: "3. Ranking TOPSIS",   sub: "AHP weight · multi-kriteria"   },
];

function StepIndicator({ current }: { current: PipelineStep }) {
  const order: PipelineStep[] = ["training", "predicting", "ranking"];
  const currentIdx = order.indexOf(current);

  return (
    <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-slate-200 mb-5">
      {PIPELINE_STEPS.map((step, i) => {
        const stepIdx = i;
        const isActive    = current === step.key;
        const isCompleted = currentIdx > stepIdx && current !== "idle";
        const isPending   = currentIdx < stepIdx || current === "idle";

        return (
          <div
            key={step.key}
            className={cn(
              "flex-1 flex items-center gap-2.5 px-4 py-3 transition-all",
              i > 0 && "border-l border-slate-200",
              isActive    && "bg-navy-900",
              isCompleted && "bg-emerald-50",
              isPending   && "bg-white",
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              isActive    && "bg-gold-400",
              isCompleted && "bg-emerald-500",
              isPending   && "bg-slate-100",
            )}>
              {isCompleted
                ? <CheckCircle2 size={13} className="text-white" />
                : isActive
                  ? <RefreshCw size={11} className="text-navy-900 animate-spin" />
                  : <span className={cn("text-[10px] font-bold", isPending && "text-slate-400")}>{i + 1}</span>
              }
            </div>
            <div className="min-w-0">
              <p className={cn(
                "text-[11px] font-bold leading-none truncate",
                isActive    && "text-white",
                isCompleted && "text-emerald-700",
                isPending   && "text-slate-400",
              )}>{step.label}</p>
              <p className={cn(
                "text-[9px] mt-0.5 truncate",
                isActive    && "text-slate-400",
                isCompleted && "text-emerald-500",
                isPending   && "text-slate-300",
              )}>{step.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function RekomendasiPage() {
  const [criteria, setCriteria]         = useState<Criterion[]>(CRITERIA);
  const [alternatives, setAlternatives] = useState<AltWithStats[]>([]);
  const [results, setResults]           = useState<TopsisResult[]>([]);
  const [riskResults, setRiskResults]   = useState<RiskResult[]>([]);
  const [backendMetrics, setBackendMetrics] = useState<BackendModelMetrics | null>(null);
  const [isRunning, setIsRunning]       = useState(false);
  const [isFetching, setIsFetching]     = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [hasRun, setHasRun]             = useState(false);
  const [activeTab, setActiveTab]       = useState<"topsis" | "risk">("risk");
  const [dataInfo, setDataInfo]         = useState<{ suppliers: number; pos: number; grs: number } | null>(null);

  // ── 3-step pipeline state ─────────────────────────────────────────────
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [trainDone, setTrainDone]       = useState(false);
  const [mlDone, setMlDone]             = useState(false);

  // ── Backend ML train state ────────────────────────────────────────────
  const [isTraining, setIsTraining]     = useState(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);
  const [trainError, setTrainError]     = useState<string | null>(null);
  const [riskSource, setRiskSource]     = useState<"backend" | "client">("backend");

  // Raw ERP supplier IDs kept for predict-all call
  const [supplierIds, setSupplierIds] = useState<number[]>([]);
  // Map from supplier_id → supplier_name for enriching predict responses
  const [supplierNameMap, setSupplierNameMap] = useState<Map<number, string>>(new Map());

  // ── Fetch ERP data + initial metrics on mount ────────────────────────
  useEffect(() => {
    async function load() {
      setIsFetching(true); setFetchError(null);
      try {
        const [suppRes, poRes, grRes, retRes, spRes, metrics] = await Promise.all([
          getSuppliers(), getPurchaseOrders(), getGoodsReceipts(),
          getPurchaseReturns(), getSupplierProducts(),
          getModelMetrics(),
        ]);
        const norm = (r: any) => Array.isArray(r) ? r : r?.data ?? [];
        const suppliers = norm(suppRes), pos = norm(poRes), grs = norm(grRes);
        const returns   = norm(retRes),  sps = norm(spRes);

        setDataInfo({ suppliers: suppliers.length, pos: pos.length, grs: grs.length });
        setSupplierIds(suppliers.map((s: any) => Number(s.supplier_id ?? s.id)));
        setSupplierNameMap(new Map(
          suppliers.map((s: any) => [
            Number(s.supplier_id ?? s.id),
            String(s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id ?? s.id}`),
          ])
        ));
        if (metrics) setBackendMetrics(metrics);

        const alts = buildAlternatives(suppliers, pos, grs, returns, sps);
        setAlternatives(alts);
      } catch (e: any) {
        setFetchError(e?.message ?? "Gagal memuat data ERP.");
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, []);

  // ── 3-step pipeline: Train → Predict (ML first) → TOPSIS rank ───────
  const handleRun = useCallback(async () => {
    if (alternatives.length === 0) return;

    setIsRunning(true);
    setResults([]);
    setRiskResults([]);
    setTrainDone(false);
    setMlDone(false);
    setTrainMessage(null);
    setTrainError(null);

    // ── Step 1: Train XGBoost on historical ERP data ─────────────────────
    setPipelineStep("training");
    await new Promise(r => setTimeout(r, 100)); // yield for paint
    try {
      const trainRes = await trainFromErp(true);
      setBackendMetrics(buildMetricsFromTrainResponse(trainRes));
      setTrainMessage(trainRes.message ?? "Model berhasil dilatih dari data ERP historis.");
      setTrainDone(true);
    } catch (e: any) {
      // Training failure is non-fatal — warn but continue with existing model
      setTrainError(e?.message ?? "Pelatihan gagal, menggunakan model sebelumnya.");
    }

    // ── Step 2: Batch predict all suppliers → show ML results first ───────
    setPipelineStep("predicting");
    setActiveTab("risk"); // switch to risk tab so ML results are visible immediately
    await new Promise(r => setTimeout(r, 80));

    const altMap = new Map(alternatives.map((a) => [Number(a.id), a.values]));

    try {
      const batchRes = await predictAllSuppliers();

      const backendResults: RiskResult[] = batchRes.results
        .filter(v => v.supplier_id != null && v.supplier_id !== 0)
        .map((v) => {
          const sid       = Number(v.supplier_id);
          const altValues = altMap.get(sid) ?? {};
          return {
            supplier_id:   sid,
            supplier_name: v.supplier_name ?? supplierNameMap.get(sid) ?? `Supplier ${sid}`,
            risk_score:    Number(v.delay_probability ?? 0),
            risk_level:    normalizeRiskLevel(String(v.risk_level ?? "low")),
            contributions: {},
            features: {
              supplier_id:        sid,
              supplier_name:      v.supplier_name ?? supplierNameMap.get(sid) ?? `Supplier ${sid}`,
              on_time_rate:       Number(altValues.on_time_rate         ?? 0),
              avg_lead_time:      Number(altValues.lead_time            ?? 0),
              delivery_margin:    Number(altValues.delivery_punctuality ?? 0),
              order_count:        0,
              lead_time_cv:       0,
              low_stock_ratio:    0,
              avg_stock_level:    0,
              days_since_last_gr: 0,
              catalog_sku_count:  0,
              avg_price:          Number(altValues.avg_price            ?? 0),
            },
          };
        });

      backendResults.sort((a, b) => b.risk_score - a.risk_score);
      setRiskResults(backendResults);
      setRiskSource("backend");
      setMlDone(true);
    } catch {
      // Batch-predict failed — fall back to individual per-supplier calls
      try {
        const settled = await Promise.allSettled(
          supplierIds.map((id) => predictSupplierRiskRaw(id))
        );
        const fallback: RiskResult[] = settled
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r) => {
            const v   = r.value;
            const sid = Number(v.supplier_id ?? 0);
            const altValues = altMap.get(sid) ?? {};
            return {
              supplier_id:   sid,
              supplier_name: supplierNameMap.get(sid) ?? `Supplier ${sid}`,
              risk_score:    Number(v.delay_probability ?? 0),
              risk_level:    normalizeRiskLevel(String(v.risk_level ?? "low")),
              contributions: {},
              features: {
                supplier_id:        sid,
                supplier_name:      supplierNameMap.get(sid) ?? `Supplier ${sid}`,
                on_time_rate:       Number(altValues.on_time_rate         ?? 0),
                avg_lead_time:      Number(altValues.lead_time            ?? 0),
                delivery_margin:    Number(altValues.delivery_punctuality ?? 0),
                order_count:        0,
                lead_time_cv:       0,
                low_stock_ratio:    0,
                avg_stock_level:    0,
                days_since_last_gr: 0,
                catalog_sku_count:  0,
                avg_price:          Number(altValues.avg_price            ?? 0),
              },
            };
          });
        fallback.sort((a, b) => b.risk_score - a.risk_score);
        setRiskResults(fallback);
        setMlDone(true);
      } catch {
        // both approaches failed — proceed to ranking with empty risk results
      }
      setRiskSource("backend");
    }

    // ── Step 3: AHP-TOPSIS ranking ────────────────────────────────────────
    setPipelineStep("ranking");
    await new Promise(r => setTimeout(r, 80)); // yield for paint

    const ranked = topsis(alternatives, criteria);
    ranked.sort((a, b) => a.rank - b.rank);
    setResults(ranked);

    // After ranking is done switch to TOPSIS tab
    setActiveTab("topsis");
    setPipelineStep("done");
    setHasRun(true);
    setIsRunning(false);
  }, [alternatives, criteria, supplierIds, supplierNameMap]);

  // ── Train handlers ────────────────────────────────────────────────────

  const handleTrainFromErp = useCallback(async () => {
    setIsTraining(true); setTrainMessage(null); setTrainError(null);
    try {
      const res = await trainFromErp();
      setTrainMessage(res.message ?? "Model berhasil dilatih dari data ERP.");
      setBackendMetrics(buildMetricsFromTrainResponse(res));
    } catch (e: any) {
      setTrainError(e?.message ?? "Gagal melatih model dari ERP.");
    } finally {
      setIsTraining(false);
    }
  }, []);

  const handleTrainFromServerCsv = useCallback(async () => {
    setIsTraining(true); setTrainMessage(null); setTrainError(null);
    try {
      const res = await trainFromServerCsv();
      setTrainMessage(res.message ?? "Model berhasil dilatih dari CSV server.");
      setBackendMetrics(buildMetricsFromTrainResponse(res));
    } catch (e: any) {
      setTrainError(e?.message ?? "Gagal melatih model dari CSV server.");
    } finally {
      setIsTraining(false);
    }
  }, []);

  const handleTrainFromCsvUpload = useCallback(async (file: File) => {
    setIsTraining(true); setTrainMessage(null); setTrainError(null);
    try {
      const res = await trainFromCsvUpload(file);
      setTrainMessage(res.message ?? "Model berhasil dilatih dari file CSV.");
      setBackendMetrics(buildMetricsFromTrainResponse(res));
    } catch (e: any) {
      setTrainError(e?.message ?? "Gagal melatih model dari file CSV.");
    } finally {
      setIsTraining(false);
    }
  }, []);
  function exportCsv() {
    if (results.length === 0) return;
    const riskMap = new Map(riskResults.map(r => [r.supplier_id, r]));
    const critHeaders = criteria.map(c => c.label);
    const header = ["Rank","Kode","Nama","Ci","D+","D−",...critHeaders,"Risk Score","Risk Level","Alasan"].join(",");
    const rows = results.map(r => {
      const risk = riskMap.get(Number(r.alternativeId));
      const critVals = criteria.map(c => (r.weightedValues?.[c.id] ?? 0).toFixed(6));
      return [
        r.rank, r.code ?? "", `"${r.name}"`,
        r.score.toFixed(6), r.dPlus.toFixed(6), r.dMinus.toFixed(6),
        ...critVals,
        risk?.risk_score.toFixed(3) ?? "—",
        risk?.risk_level ?? "—",
        `"${r.reasons.join("; ")}"`,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `rekomendasi-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppShell
      title="Rekomendasi Supplier"
      subtitle="AHP + TOPSIS · XGBoost Risk Prediction — analisis multi-kriteria berbasis data ERP"
    >
      {/* ── Top action bar ──────────────────────────────────────────────── */}
      {hasRun && results.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button variant="secondary" size="md" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      )}

      {/* ── Method info banner ──────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-6">
        <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="text-[12px] text-blue-700 leading-relaxed space-y-1">
          <p className="font-bold text-blue-800">Alur Analisis 3 Langkah</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[9px] font-extrabold mr-1">1</span>
              <strong>Latih XGBoost</strong> — model dilatih ulang dari data ERP historis (PO, GR, Retur) yang digabung dengan CSV historis bawaan.
            </span>
            <span>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[9px] font-extrabold mr-1">2</span>
              <strong>Prediksi Risiko</strong> — semua supplier diprediksi sekaligus · hasilnya tampil terlebih dahulu di tab <em>XGBoost Risk</em>.
            </span>
            <span>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[9px] font-extrabold mr-1">3</span>
              <strong>Ranking AHP · TOPSIS</strong> — bobot dari matriks Saaty diterapkan ke data ERP nyata · hasil akhir di tab <em>AHP · TOPSIS</em>.
            </span>
          </div>
        </div>
      </div>

      {/* ── Data status ─────────────────────────────────────────────────── */}
      {isFetching && (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 mb-5 text-[12px] text-slate-500">
          <RefreshCw size={13} className="animate-spin text-slate-400" />
          Memuat data supplier dari ERP…
        </div>
      )}
      {fetchError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-5 py-3 mb-5">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-700">{fetchError}</p>
        </div>
      )}
      {!isFetching && !fetchError && dataInfo && (
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            { label: "Supplier",       value: dataInfo.suppliers  },
            { label: "Purchase Order", value: dataInfo.pos        },
            { label: "Goods Receipt",  value: dataInfo.grs        },
            { label: "Alternatif",     value: alternatives.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
              <p className="text-xl font-bold font-serif text-navy-900 leading-none mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}
      {!isFetching && !fetchError && alternatives.length === 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-700">
            Belum ada supplier dengan riwayat Purchase Order. Buat PO terlebih dahulu.
          </p>
        </div>
      )}

      {/* ── Pipeline step indicator (shown while running or after first run) */}
      {(isRunning || hasRun) && pipelineStep !== "idle" && (
        <StepIndicator current={pipelineStep === "done" ? "ranking" : pipelineStep} />
      )}

      {/* ── Train/step status messages ───────────────────────────────────── */}
      {trainMessage && !isRunning && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-3 text-[12px] text-emerald-700">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          {trainMessage}
        </div>
      )}
      {trainError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3 text-[12px] text-amber-700">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          {trainError}
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">

        {/* LEFT — AHP panel + data preview */}
        <div className="flex flex-col gap-6">
          <AhpCriteriaPanel
            criteria={criteria}
            onChange={setCriteria}
            onRun={handleRun}
            isLoading={isRunning}
          />

          {alternatives.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Brain size={13} className="text-slate-500" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">Data Supplier (dari ERP)</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{alternatives.length} supplier dengan riwayat transaksi</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 min-w-[140px]">Supplier</th>
                      <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 min-w-[110px]">
                        <Tooltip term="Harga Rata-rata" label="Rata-rata harga satuan dari katalog supplier (Rp) — lebih rendah lebih baik ↓" />
                        <span className="ml-1 text-[9px] text-rose-400">↓</span>
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 min-w-[90px]">
                        <Tooltip term="Lead Time" label="Rata-rata hari aktual dari PO ke GR — lebih cepat lebih baik ↓" />
                        <span className="ml-1 text-[9px] text-rose-400">↓</span>
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 min-w-[110px]">
                        <Tooltip term="On-Time" label="Jumlah GR tepat waktu dari total GR yang punya expected_date — lebih tinggi lebih baik ↑" />
                        <span className="ml-1 text-[9px] text-green-500">↑</span>
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 min-w-[110px]">
                        <Tooltip term="Ketepatan Waktu" label="Skor rata-rata ketepatan pengiriman: positif = cenderung lebih awal dari tenggat, negatif = cenderung terlambat ↑" />
                        <span className="ml-1 text-[9px] text-green-500">↑</span>
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 min-w-[100px]">
                        <Tooltip term="Retur" label="Jumlah retur dari total GR yang diterima — lebih sedikit lebih baik ↓" />
                        <span className="ml-1 text-[9px] text-rose-400">↓</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {alternatives.map(alt => {
                      const s = alt.stats;
                      const onTimeLabel = s.totalGRs === 0
                        ? <span className="text-slate-300">—</span>
                        : s.grsWithExpected === 0
                          ? <span className="text-slate-400 text-[10px]">{s.totalGRs} GR<br/><span className="text-slate-300">no expected</span></span>
                          : (
                            <span>
                              <span className="font-semibold text-navy-900">{s.onTimeGRs}</span>
                              <span className="text-slate-400"> / {s.grsWithExpected}</span>
                              <span className={cn(
                                "ml-1 text-[10px] font-bold",
                                s.onTimeGRs === s.grsWithExpected ? "text-emerald-600"
                                : s.onTimeGRs > 0 ? "text-amber-600"
                                : "text-rose-500"
                              )}>
                                ({s.grsWithExpected > 0 ? Math.round(s.onTimeGRs / s.grsWithExpected * 100) : 0}%)
                              </span>
                            </span>
                          );

                      const punctLabel = s.totalGRs === 0
                        ? <span className="text-slate-300">—</span>
                        : (
                          <span className={cn(
                            "font-semibold",
                            s.punctualityScore > 0 ? "text-emerald-600"
                            : s.punctualityScore < 0 ? "text-rose-500"
                            : "text-slate-400"
                          )}>
                            {s.punctualityScore >= 0 ? "+" : ""}{(s.punctualityScore * 100).toFixed(1)}%
                            <span className="block text-[9px] font-normal text-slate-400">
                              {s.punctualityScore > 0.05 ? "lebih awal" : s.punctualityScore < -0.05 ? "terlambat" : "tepat waktu"}
                            </span>
                          </span>
                        );

                      const returLabel = (
                        <span>
                          <span className={cn(
                            "font-semibold",
                            s.totalReturns === 0 ? "text-emerald-600" : "text-rose-500"
                          )}>{s.totalReturns}</span>
                          {s.totalGRs > 0 && (
                            <span className="text-slate-400"> / {s.totalGRs} GR</span>
                          )}
                        </span>
                      );

                      return (
                        <tr key={alt.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-navy-900 text-[12px] truncate max-w-[136px]">{alt.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{alt.code}</p>
                          </td>
                          {/* Harga Rata-rata */}
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                            {s.avgPrice === 0
                              ? <span className="text-slate-300">—</span>
                              : <span>Rp {s.avgPrice.toLocaleString("id-ID")}</span>}
                          </td>
                          {/* Lead Time */}
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                            {s.avgLeadTimeDays === 0 && s.totalGRs === 0
                              ? <span className="text-slate-300">—</span>
                              : <span><span className="font-semibold text-navy-900">{s.avgLeadTimeDays}</span> <span className="text-slate-400">hari</span></span>}
                          </td>
                          {/* On-Time */}
                          <td className="px-3 py-2.5 text-center tabular-nums">{onTimeLabel}</td>
                          {/* Ketepatan Waktu */}
                          <td className="px-3 py-2.5 text-center tabular-nums">{punctLabel}</td>
                          {/* Retur */}
                          <td className="px-3 py-2.5 text-center tabular-nums">{returLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — tabbed results panel */}
        <div className="flex flex-col gap-6">

          {/* Tab switcher — XGBoost first, TOPSIS second */}
          {(hasRun || isRunning) && (
            <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm">

              {/* LEFT — XGBoost Risk (primary, shown first) */}
              <button
                onClick={() => setActiveTab("risk")}
                disabled={isRunning && pipelineStep === "training"}
                className={cn(
                  "relative flex items-center gap-3 px-5 py-4 transition-all",
                  activeTab === "risk"
                    ? "bg-rose-600 text-white"
                    : "bg-white text-slate-500 hover:bg-rose-50",
                  isRunning && pipelineStep === "training" && "opacity-40 cursor-not-allowed",
                )}
              >
                {activeTab === "risk" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-300" />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  activeTab === "risk" ? "bg-white/20" : "bg-rose-50",
                )}>
                  {isRunning && (pipelineStep === "predicting") ? (
                    <RefreshCw size={13} className={activeTab === "risk" ? "text-white animate-spin" : "text-rose-500 animate-spin"} />
                  ) : (
                    <ShieldAlert size={15} className={activeTab === "risk" ? "text-white" : "text-rose-500"} />
                  )}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-[13px] font-bold leading-none", activeTab === "risk" ? "text-white" : "text-slate-700")}>
                      XGBoost Risk
                    </p>
                    {/* Step badge */}
                    {isRunning && pipelineStep === "predicting" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-600 border border-rose-200 animate-pulse">
                        MENGHITUNG…
                      </span>
                    )}
                    {!isRunning && riskResults.some(r => r.risk_level === "Critical") && (
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                        activeTab === "risk" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-600 border border-rose-200",
                      )}>KRITIS</span>
                    )}
                  </div>
                  <p className={cn("text-[10px] mt-0.5", activeTab === "risk" ? "text-rose-200" : "text-slate-400")}>
                    {isRunning && pipelineStep === "predicting"
                      ? "Langkah 2 — inferensi ML…"
                      : "ML · Prediksi risiko supplier"}
                  </p>
                </div>
                {activeTab !== "risk" && riskResults.length > 0 && !isRunning && (
                  <div className="shrink-0 flex flex-col items-center">
                    <span className="text-[16px] font-extrabold text-rose-500 leading-none">
                      {riskResults.filter(r => r.risk_level === "High" || r.risk_level === "Critical").length}
                    </span>
                    <span className="text-[9px] text-rose-400 font-semibold">risiko</span>
                  </div>
                )}
              </button>

              {/* RIGHT — AHP · TOPSIS (shown after ranking completes) */}
              <button
                onClick={() => setActiveTab("topsis")}
                disabled={isRunning}
                className={cn(
                  "relative flex items-center gap-3 px-5 py-4 transition-all border-l",
                  activeTab === "topsis"
                    ? "bg-navy-900 text-white border-navy-900"
                    : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200",
                  isRunning && "opacity-40 cursor-not-allowed",
                )}
              >
                {activeTab === "topsis" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400" />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-extrabold",
                  activeTab === "topsis" ? "bg-gold-400 text-navy-900" : "bg-slate-100 text-slate-500",
                )}>
                  {isRunning && pipelineStep === "ranking"
                    ? <RefreshCw size={11} className="text-navy-900 animate-spin" />
                    : "TOP"
                  }
                </div>
                <div className="text-left min-w-0">
                  <p className={cn("text-[13px] font-bold leading-none", activeTab === "topsis" ? "text-white" : "text-slate-700")}>
                    AHP · TOPSIS
                  </p>
                  <p className={cn("text-[10px] mt-0.5", activeTab === "topsis" ? "text-slate-400" : "text-slate-400")}>
                    {isRunning && pipelineStep === "ranking"
                      ? "Langkah 3 — ranking…"
                      : "Perankingan multi-kriteria"}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* XGBoost Risk panel — shown first (step 2 result) */}
          <div className={activeTab === "risk" ? "flex flex-col gap-6" : "hidden"}>
            <RiskPredictionPanel
              results={riskResults}
              backendMetrics={backendMetrics}
              isLoading={isRunning && (pipelineStep === "training" || pipelineStep === "predicting")}
              riskSource={riskSource}
              isTraining={isTraining}
              trainMessage={trainMessage}
              trainError={trainError}
              onTrainFromErp={handleTrainFromErp}
              onTrainFromServerCsv={handleTrainFromServerCsv}
              onTrainFromCsvUpload={handleTrainFromCsvUpload}
            />
          </div>

          {/* TOPSIS panel — shown after step 3 completes */}
          <div className={activeTab === "topsis" ? "flex flex-col gap-6" : "hidden"}>
            <TopsisResultsPanel
              results={results}
              criteria={criteria}
              riskResults={riskResults}
              isLoading={isRunning && pipelineStep === "ranking"}
            />

            {/* Summary card */}
            {hasRun && results.length > 0 && !isRunning && (() => {
              const top = results[0];
              const topRisk = riskResults.find(r => r.supplier_id === Number(top.alternativeId));
              return (
                <Card title="Ringkasan Analisis">
                  <div className="flex flex-col gap-3">
                    {/* Top recommendation */}
                    <div className="bg-gradient-to-br from-navy-900 to-navy-700 rounded-xl p-5 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shrink-0 shadow-lg">
                        <span className="text-navy-900 text-base font-extrabold">1</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gold-400 font-bold mb-0.5">Rekomendasi Terbaik (TOPSIS)</p>
                        <p className="text-white font-bold font-serif text-[15px] leading-tight truncate">{top.name}</p>
                        <p className="text-slate-400 text-[11px] font-mono">
                          {top.code} — Ci: <strong className="text-gold-400">{top.score.toFixed(4)}</strong>
                          {topRisk && (
                            <span className={cn(
                              "ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
                              topRisk.risk_level === "Low"      ? "bg-emerald-500/30 text-emerald-300"
                              : topRisk.risk_level === "Medium" ? "bg-amber-500/30 text-amber-300"
                              : topRisk.risk_level === "High"   ? "bg-orange-500/30 text-orange-300"
                              : "bg-rose-500/30 text-rose-300",
                            )}>
                              Risk: {topRisk.risk_level}
                            </span>
                          )}
                        </p>
                        {top.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {top.reasons.map(r => (
                              <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-semibold">
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Runner-up */}
                    {results[1] && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-[12px] font-extrabold flex items-center justify-center shrink-0">2</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-navy-900 font-serif truncate">{results[1].name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">Ci: {results[1].score.toFixed(4)}</p>
                        </div>
                      </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Supplier",    value: String(results.length),          sub: "dievaluasi"     },
                        { label: "Kriteria",    value: String(criteria.length),         sub: "terbobot AHP"   },
                        { label: "Ci Terbaik",  value: results[0].score.toFixed(3),     sub: "TOPSIS score"   },
                        { label: "Kritis",      value: String(riskResults.filter(r => r.risk_level === "Critical").length), sub: "supplier risiko" },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif mb-1">{s.label}</p>
                          <p className="text-xl font-bold text-navy-900 font-serif leading-none">{s.value}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* XGBoost highest-risk warning */}
                    {riskResults.length > 0 && riskResults[0].risk_level !== "Low" && riskResults[0].risk_score != null && (
                      <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                        <ShieldAlert size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[12px] font-bold text-rose-700">Perhatian Risiko Tertinggi</p>
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            <strong>{riskResults[0].supplier_name}</strong> memiliki skor risiko{" "}
                            <strong>{Number(riskResults[0].risk_score).toFixed(3)}</strong> ({riskResults[0].risk_level}).
                            Lihat tab <em>XGBoost Risk</em> untuk detail SHAP.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
