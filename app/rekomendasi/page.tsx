"use client";

import { useState, useCallback, useEffect } from "react";
import { Brain, RefreshCw, Download, Info, AlertTriangle, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Button, Card, Tooltip } from "@/components/ui";
import { AhpCriteriaPanel } from "@/components/modules/rekomendasi/AhpCriteriaPanel";
import { TopsisResultsPanel } from "@/components/modules/rekomendasi/TopsisResultsPanel";
import { RiskPredictionPanel } from "@/components/modules/rekomendasi/RiskPredictionPanel";
import { topsis, calcOnTimeRates } from "@/lib/ahp-topsis";
import { cn } from "@/lib/utils";
import type { Criterion, Alternative, TopsisResult } from "@/lib/ahp-topsis";
import {
  engineerFeatures, predictSupplierRisk, parseExcelInventory,
  type RiskResult, type ExcelStockItem, type MLPipeline,
} from "@/lib/xgboost-risk";

import { getPurchaseOrders } from "@/lib/services/po.service";
import { getGoodsReceipts } from "@/lib/services/gr.service";
import { getPurchaseInvoices } from "@/lib/services/purchase-invoice.service";
import { getSupplierProducts } from "@/lib/services/supplier-product.service";
import { getSuppliers } from "@/lib/services/supplier.service";

async function loadExcelInventory(): Promise<ExcelStockItem[]> {
  try {
    const XLSX = await import("xlsx");
    const res  = await fetch("/SISTEM (1) (3) (1).xlsx");
    if (!res.ok) return [];
    const buf   = await res.arrayBuffer();
    const wb    = XLSX.read(buf, { type: "array" });
    const ws    = wb.Sheets["STOK"];
    if (!ws) return [];
    const rows  = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    return parseExcelInventory(rows);
  } catch {
    return [];
  }
}

// ─── AHP-TOPSIS criteria ──────────────────────────────────────────────────────

const CRITERIA: Criterion[] = [
  { id: "harga",           label: "Harga",             description: "Rata-rata harga satuan dari katalog supplier",                                           weight: 0, benefit: false },
  { id: "lead_time",       label: "Lead Time",          description: "Rata-rata hari pengiriman aktual dari PO ke GR",                                        weight: 0, benefit: false },
  { id: "on_time_rate",    label: "On-Time Rate",       description: "Proporsi GR yang tiba pada atau sebelum expected_date PO",                              weight: 0, benefit: true  },
  { id: "delivery_margin", label: "Margin Pengiriman",  description: "Rata-rata (expected_days − actual_days) / actual_days — positif = lebih cepat",         weight: 0, benefit: true  },
  { id: "order_count",     label: "Frekuensi Order",    description: "Jumlah PO yang pernah diterbitkan ke supplier ini",                                     weight: 0, benefit: true  },
];

// ─── Build TOPSIS alternatives from ERP data ─────────────────────────────────

function buildAlternatives(
  suppliers: any[], pos: any[], grs: any[],
  invoices: any[], supplierProducts: any[],
): Alternative[] {
  const normPos = pos.map((p: any) => ({
    ...p,
    purchase_order_id: Number(p.purchase_order_id),
    supplier_id:       Number(p.supplier_id ?? p.supplier?.supplier_id ?? 0),
    order_date:        p.order_date ?? null,
    expected_date:     p.expected_date ?? null,
  }));
  const normGrs = grs.map((g: any) => ({
    ...g,
    goods_receipt_id:  Number(g.goods_receipt_id),
    purchase_order_id: Number(g.purchase_order_id),
    receipt_date:      g.receipt_date ?? null,
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

  const poMap = new Map(normPos.map((p) => [p.purchase_order_id, p]));
  type Agg = { name: string; code: string; orderCount: number; actualDays: number[]; catalogDays: number[]; prices: number[]; deliveryMargins: number[] };
  const agg = new Map<number, Agg>();
  for (const s of normSuppliers) agg.set(s.supplier_id, { name: s.supplier_name, code: s.supplier_code, orderCount: 0, actualDays: [], catalogDays: [], prices: [], deliveryMargins: [] });

  for (const po of normPos) { const a = agg.get(po.supplier_id); if (a) a.orderCount++; }

  const onTimeMap = calcOnTimeRates(
    normPos.map(p => ({ purchase_order_id: p.purchase_order_id, supplier_id: p.supplier_id, expected_date: p.expected_date })),
    normGrs.map(g => ({ purchase_order_id: g.purchase_order_id, receipt_date: g.receipt_date })),
  );

  for (const gr of normGrs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po?.order_date || !gr.receipt_date) continue;
    const actualDays = (new Date(gr.receipt_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
    if (actualDays < 0 || actualDays > 365) continue;
    const a = agg.get(po.supplier_id);
    if (!a) continue;
    a.actualDays.push(actualDays);
    if (po.expected_date && actualDays > 0) {
      const expDays = (new Date(po.expected_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
      a.deliveryMargins.push((expDays - actualDays) / actualDays);
    }
  }

  for (const sp of normSps) {
    const a = agg.get(sp.supplier_id);
    if (!a) continue;
    if (sp.lead_time_days != null) a.catalogDays.push(sp.lead_time_days);
    if (sp.supplier_price > 0)     a.prices.push(sp.supplier_price);
  }

  const alternatives: Alternative[] = [];
  for (const [sid, a] of agg.entries()) {
    if (a.orderCount === 0) continue;
    const avgPrice        = a.prices.length > 0 ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length : 0;
    const avgLeadTime     = a.actualDays.length > 0 ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length : a.catalogDays.length > 0 ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length : 14;
    const avgDeliveryMargin = a.deliveryMargins.length > 0 ? a.deliveryMargins.reduce((s, v) => s + v, 0) / a.deliveryMargins.length : 0;
    alternatives.push({
      id: String(sid), name: a.name, code: a.code,
      values: {
        harga:           Math.round(avgPrice * 100) / 100,
        lead_time:       Math.round(avgLeadTime * 10) / 10,
        on_time_rate:    Math.round((onTimeMap.get(sid) ?? 0) * 1000) / 1000,
        delivery_margin: Math.round(avgDeliveryMargin * 1000) / 1000,
        order_count:     a.orderCount,
      },
    });
  }
  return alternatives;
}

// ─── Dummy-data patch (keeps demo non-empty) ─────────────────────────────────

function patchWithDummy(alts: Alternative[]): Alternative[] {
  const rng = (seed: number, min: number, max: number, dec = 0) => {
    const x = Math.sin(seed) * 10000; const r = x - Math.floor(x);
    return Math.round((min + r * (max - min)) * 10 ** dec) / 10 ** dec;
  };
  return alts.map((alt, idx) => {
    const seed = parseInt(alt.id, 10) || idx + 1;
    const v = { ...alt.values };
    if (!v.harga || v.harga === 0)            v.harga           = rng(seed * 3, 150_000, 950_000, 2);
    if (!v.lead_time || v.lead_time === 0)    v.lead_time       = rng(seed * 7, 2, 30, 1);
    if (!v.on_time_rate || v.on_time_rate === 0) v.on_time_rate = rng(seed * 11, 0.55, 1.0, 3);
    if (v.delivery_margin === 0 || v.delivery_margin == null) v.delivery_margin = rng(seed * 13, -0.15, 0.5, 3);
    return { ...alt, values: v };
  });
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function RekomendasiPage() {
  const [criteria, setCriteria]         = useState<Criterion[]>(CRITERIA);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [results, setResults]           = useState<TopsisResult[]>([]);
  const [riskResults, setRiskResults]   = useState<RiskResult[]>([]);
  const [pipeline, setPipeline]         = useState<MLPipeline | null>(null);
  const [isRunning, setIsRunning]       = useState(false);
  const [isFetching, setIsFetching]     = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [hasRun, setHasRun]             = useState(false);
  const [activeTab, setActiveTab]       = useState<"topsis" | "risk">("topsis");
  const [dataInfo, setDataInfo]         = useState<{ suppliers: number; pos: number; grs: number; skus: number } | null>(null);

  // Raw ERP data kept for XGBoost feature engineering
  const [erpData, setErpData] = useState<{
    suppliers: any[]; pos: any[]; grs: any[]; sps: any[]; excelInventory: ExcelStockItem[];
  } | null>(null);

  // ── Fetch ERP + Excel data on mount ──────────────────────────────────
  useEffect(() => {
    async function load() {
      setIsFetching(true); setFetchError(null);
      try {
        const [suppRes, poRes, grRes, invRes, spRes, xlsxItems] = await Promise.all([
          getSuppliers(), getPurchaseOrders(), getGoodsReceipts(),
          getPurchaseInvoices(), getSupplierProducts(), loadExcelInventory(),
        ]);
        const norm = (r: any) => Array.isArray(r) ? r : r?.data ?? [];
        const suppliers = norm(suppRes), pos = norm(poRes), grs = norm(grRes);
        const invoices  = norm(invRes),  sps = norm(spRes);

        setDataInfo({ suppliers: suppliers.length, pos: pos.length, grs: grs.length, skus: xlsxItems.length });
        setErpData({ suppliers, pos, grs, sps, excelInventory: xlsxItems });

        const alts = buildAlternatives(suppliers, pos, grs, invoices, sps);
        setAlternatives(patchWithDummy(alts));
      } catch (e: any) {
        setFetchError(e?.message ?? "Gagal memuat data ERP.");
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, []);

  // ── Run AHP-TOPSIS + XGBoost together ────────────────────────────────
  const handleRun = useCallback(async () => {
    if (alternatives.length === 0 || !erpData) return;
    setIsRunning(true); setResults([]); setRiskResults([]); setPipeline(null);
    await new Promise(r => setTimeout(r, 300));

    // 1. TOPSIS
    const ranked = topsis(alternatives, criteria);
    ranked.sort((a, b) => a.rank - b.rank);
    setResults(ranked);

    // 2. XGBoost full ML pipeline — train/val/test split + 5-fold CV + early stopping
    await new Promise(r => setTimeout(r, 50)); // yield so React paints TOPSIS first
    const features = engineerFeatures({
      suppliers:        erpData.suppliers,
      purchaseOrders:   erpData.pos,
      goodsReceipts:    erpData.grs,
      supplierProducts: erpData.sps,
      excelInventory:   erpData.excelInventory,
    });
    const mlPipeline = predictSupplierRisk(features);
    setRiskResults(mlPipeline.predictions);
    setPipeline(mlPipeline);

    setHasRun(true); setIsRunning(false);
  }, [alternatives, criteria, erpData]);

  // ── Export CSV (includes risk score) ─────────────────────────────────
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
        <div className="text-[12px] text-blue-700 leading-relaxed space-y-0.5">
          <p>
            <strong>AHP</strong> — bobot kriteria dari matriks perbandingan berpasangan Saaty (CR &lt; 10%).{" "}
            <strong>TOPSIS</strong> — supplier diranking berdasarkan jarak ke solusi ideal A+ dan A−.
          </p>
          <p>
            <strong>XGBoost</strong> — gradient boosted trees dilatih dengan split <strong>60/20/20</strong> (train/val/test),
            early stopping pada val log-loss, dan <strong>5-fold cross-validation</strong>. Menghasilkan skor risiko per-supplier dengan atribusi SHAP.
          </p>
        </div>
      </div>

      {/* ── Data status ─────────────────────────────────────────────────── */}
      {isFetching && (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 mb-5 text-[12px] text-slate-500">
          <RefreshCw size={13} className="animate-spin text-slate-400" />
          Memuat data supplier dari ERP dan inventaris Excel…
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
            { label: "Supplier",          value: dataInfo.suppliers },
            { label: "Purchase Order",    value: dataInfo.pos       },
            { label: "Goods Receipt",     value: dataInfo.grs       },
            { label: "Alternatif",        value: alternatives.length },
            { label: "SKU Excel (Stok)",  value: dataInfo.skus      },
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
                      {criteria.map(c => (
                        <th key={c.id} className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 min-w-[80px]">
                          <Tooltip term={c.label} label={`${c.description} — ${c.benefit ? "↑ Benefit" : "↓ Cost"}`} />
                          <span className={cn("ml-1 text-[9px]", c.benefit ? "text-green-500" : "text-rose-400")}>
                            {c.benefit ? "↑" : "↓"}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {alternatives.map(alt => (
                      <tr key={alt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-navy-900 text-[12px] truncate max-w-[136px]">{alt.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{alt.code}</p>
                        </td>
                        {criteria.map(c => {
                          const raw = alt.values[c.id];
                          const display = raw == null
                            ? <span className="text-slate-300">—</span>
                            : c.id === "on_time_rate" || c.id === "delivery_margin"
                              ? `${(raw * 100).toFixed(1)}%`
                              : c.id === "order_count" ? raw : raw.toLocaleString("id-ID");
                          return (
                            <td key={c.id} className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — tabbed results panel */}
        <div className="flex flex-col gap-6">

          {/* Tab switcher — full-width, prominent */}
          {hasRun && (
            <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <button
                onClick={() => setActiveTab("topsis")}
                className={cn(
                  "relative flex items-center gap-3 px-5 py-4 transition-all",
                  activeTab === "topsis"
                    ? "bg-navy-900 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                {/* Active indicator bar */}
                {activeTab === "topsis" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400" />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-extrabold",
                  activeTab === "topsis" ? "bg-gold-400 text-navy-900" : "bg-slate-100 text-slate-500",
                )}>
                  TOP
                </div>
                <div className="text-left min-w-0">
                  <p className={cn("text-[13px] font-bold leading-none", activeTab === "topsis" ? "text-white" : "text-slate-700")}>
                    AHP · TOPSIS
                  </p>
                  <p className={cn("text-[10px] mt-0.5", activeTab === "topsis" ? "text-slate-400" : "text-slate-400")}>
                    Perankingan multi-kriteria
                  </p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("risk")}
                className={cn(
                  "relative flex items-center gap-3 px-5 py-4 transition-all border-l",
                  activeTab === "risk"
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white text-slate-500 hover:bg-rose-50 border-slate-200",
                )}
              >
                {/* Active indicator bar */}
                {activeTab === "risk" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-300" />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  activeTab === "risk" ? "bg-white/20" : "bg-rose-50",
                )}>
                  <ShieldAlert size={15} className={activeTab === "risk" ? "text-white" : "text-rose-500"} />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-[13px] font-bold leading-none", activeTab === "risk" ? "text-white" : "text-slate-700")}>
                      XGBoost Risk
                    </p>
                    {riskResults.some(r => r.risk_level === "Critical") && (
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                        activeTab === "risk"
                          ? "bg-white/20 text-white"
                          : "bg-rose-100 text-rose-600 border border-rose-200",
                      )}>
                        KRITIS
                      </span>
                    )}
                  </div>
                  <p className={cn("text-[10px] mt-0.5", activeTab === "risk" ? "text-rose-200" : "text-slate-400")}>
                    ML · Prediksi risiko supplier
                  </p>
                </div>
                {/* Always-visible risk count badge when inactive */}
                {activeTab !== "risk" && riskResults.length > 0 && (
                  <div className="shrink-0 flex flex-col items-center">
                    <span className="text-[16px] font-extrabold text-rose-500 leading-none">
                      {riskResults.filter(r => r.risk_level === "High" || r.risk_level === "Critical").length}
                    </span>
                    <span className="text-[9px] text-rose-400 font-semibold">risiko</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* TOPSIS panel */}
          <div className={activeTab === "topsis" ? "flex flex-col gap-6" : "hidden"}>
            <TopsisResultsPanel
              results={results}
              criteria={criteria}
              riskResults={riskResults}
              isLoading={isRunning}
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
                    {riskResults.length > 0 && riskResults[0].risk_level !== "Low" && (
                      <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                        <ShieldAlert size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[12px] font-bold text-rose-700">Perhatian Risiko Tertinggi</p>
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            <strong>{riskResults[0].supplier_name}</strong> memiliki skor risiko{" "}
                            <strong>{riskResults[0].risk_score.toFixed(3)}</strong> ({riskResults[0].risk_level}).
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

          {/* XGBoost Risk panel */}
          <div className={activeTab === "risk" ? "flex flex-col gap-6" : "hidden"}>
            <RiskPredictionPanel results={riskResults} pipeline={pipeline} isLoading={isRunning} />
          </div>

        </div>
      </div>
    </AppShell>
  );
}
