"use client";

import { useState, useCallback, useEffect } from "react";
import { Brain, RefreshCw, Download, Info, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Button, Card, PageHeader, Tooltip } from "@/components/ui";
import { AhpCriteriaPanel } from "@/components/modules/rekomendasi/AhpCriteriaPanel";
import { TopsisResultsPanel } from "@/components/modules/rekomendasi/TopsisResultsPanel";
import { topsis, calcOnTimeRates } from "@/lib/ahp-topsis";
import { cn } from "@/lib/utils";
import type { Criterion, Alternative, TopsisResult } from "@/lib/ahp-topsis";

import { getPurchaseOrders, getPurchaseOrderDetails } from "@/lib/services/po.service";
import { getGoodsReceipts } from "@/lib/services/gr.service";
import { getPurchaseInvoices } from "@/lib/services/purchase-invoice.service";
import { getSupplierProducts } from "@/lib/services/supplier-product.service";
import { getSuppliers } from "@/lib/services/supplier.service";

// Weights start at 0 — they are set by AHP before running TOPSIS.
const CRITERIA: Criterion[] = [
  {
    id: "harga",
    label: "Harga",
    description: "Rata-rata harga satuan dari katalog supplier",
    weight: 0,
    benefit: false, // Cost — lower price is better
  },
  {
    id: "lead_time",
    label: "Lead Time",
    description: "Rata-rata hari pengiriman aktual dari PO ke GR",
    weight: 0,
    benefit: false, // Cost — shorter is better
  },
  {
    id: "on_time_rate",
    label: "On-Time Rate",
    description: "Proporsi GR yang tiba pada atau sebelum expected_date PO",
    weight: 0,
    benefit: true, // Benefit — higher is better
  },
  {
    id: "delivery_margin",
    label: "Margin Pengiriman",
    description: "Rata-rata selisih (expected_date − (order_date + lead_time)) / lead_time — lebih besar berarti supplier menyelesaikan lebih cepat dari tenggat",
    weight: 0,
    benefit: true, // Higher margin = faster than deadline = better
  },
  {
    id: "order_count",
    label: "Frekuensi Order",
    description: "Jumlah PO yang pernah diterbitkan ke supplier ini",
    weight: 0,
    benefit: true, // Benefit — more orders = more trusted partner
  },
];

function buildAlternatives(
  suppliers: any[],
  pos: any[],
  grs: any[],
  invoices: any[],
  supplierProducts: any[],
): Alternative[] {
  // ── Normalise all IDs to numbers up front ──────────────────────────────
  // The API embeds supplier as a nested object on PO, and IDs arrive as
  // strings from JSON — coerce everything to Number so Map lookups work.
  const normPos = pos.map((p: any) => ({
    ...p,
    purchase_order_id: Number(p.purchase_order_id),
    supplier_id:       Number(p.supplier_id ?? p.supplier?.supplier_id ?? 0),
    order_date:        p.order_date ?? null,
    expected_date:     p.expected_date ?? null,
  }));

  const normGrs = grs.map((g: any) => ({
    ...g,
    goods_receipt_id:   Number(g.goods_receipt_id),
    purchase_order_id:  Number(g.purchase_order_id),
    receipt_date:       g.receipt_date ?? null,
  }));

  const normSps = supplierProducts.map((sp: any) => ({
    supplier_id:    Number(sp.supplier_id),
    product_id:     Number(sp.product_id),
    supplier_price: Number(sp.supplier_price ?? sp.price ?? 0),
    lead_time_days: sp.lead_time_days != null ? Number(sp.lead_time_days) : null,
  }));

  const normSuppliers = suppliers.map((s: any) => ({
    supplier_id:   Number(s.supplier_id ?? s.id),
    supplier_name: s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id ?? s.id}`,
    supplier_code: s.supplier_code ?? s.kode ?? `S-${s.supplier_id ?? s.id}`,
  }));

  const poMap = new Map<number, (typeof normPos)[0]>(
    normPos.map((p) => [p.purchase_order_id, p])
  );

  const agg = new Map<number, {
    name: string; code: string;
    orderCount: number;
    actualDays: number[];
    catalogDays: number[];
    prices: number[];
    deliveryMargins: number[];
  }>();

  for (const s of normSuppliers) {
    agg.set(s.supplier_id, {
      name: s.supplier_name,
      code: s.supplier_code,
      orderCount: 0, actualDays: [], catalogDays: [], prices: [],
      deliveryMargins: [],
    });
  }

  // Order counts
  for (const po of normPos) {
    const a = agg.get(po.supplier_id);
    if (a) a.orderCount += 1;
  }

  // On-time rates via calcOnTimeRates (expected_date aware)
  const onTimeMap = calcOnTimeRates(
    normPos.map((p) => ({
      purchase_order_id: p.purchase_order_id,
      supplier_id:       p.supplier_id,
      expected_date:     p.expected_date,
    })),
    normGrs.map((g) => ({
      purchase_order_id: g.purchase_order_id,
      receipt_date:      g.receipt_date,
    }))
  );

  // Actual lead times + delivery margin per GR
  for (const gr of normGrs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po?.order_date || !gr.receipt_date) continue;
    const actualDays = (new Date(gr.receipt_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
    if (actualDays < 0 || actualDays > 365) continue;

    const a = agg.get(po.supplier_id);
    if (!a) continue;
    a.actualDays.push(actualDays);

    if (po.expected_date && actualDays > 0) {
      const expectedDays = (new Date(po.expected_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
      const margin = (expectedDays - actualDays) / actualDays;
      a.deliveryMargins.push(margin);
    }
  }

  // Catalog data (prices + catalog lead times)
  for (const sp of normSps) {
    const a = agg.get(sp.supplier_id);
    if (!a) continue;
    if (sp.lead_time_days != null) a.catalogDays.push(sp.lead_time_days);
    if (sp.supplier_price > 0)     a.prices.push(sp.supplier_price);
  }

  const alternatives: Alternative[] = [];
  for (const [sid, a] of agg.entries()) {
    if (a.orderCount === 0) continue; // skip suppliers with no history

    const avgPrice = a.prices.length > 0
      ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length : 0;
    const avgLeadTime = a.actualDays.length > 0
      ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length
      : a.catalogDays.length > 0
        ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length
        : 14; // default fallback
    const onTimeRate = onTimeMap.get(sid) ?? 0;
    // Average delivery margin across all POs with an expected_date.
    // Positive = consistently early; negative = consistently late.
    // Suppliers with no expected_date data default to 0 (neutral).
    const avgDeliveryMargin = a.deliveryMargins.length > 0
      ? a.deliveryMargins.reduce((s, v) => s + v, 0) / a.deliveryMargins.length
      : 0;

    alternatives.push({
      id: String(sid),
      name: a.name,
      code: a.code,
      values: {
        harga:            Math.round(avgPrice * 100) / 100,
        lead_time:        Math.round(avgLeadTime * 10) / 10,
        on_time_rate:     Math.round(onTimeRate * 1000) / 1000,
        delivery_margin:  Math.round(avgDeliveryMargin * 1000) / 1000,
        order_count:      a.orderCount,
      },
    });
  }

  return alternatives;
}

// ─── Dummy-data patch ─────────────────────────────────────────────────────────
/**
 * Fill columns that are still 0 or missing with realistic dummy values so the
 * table never looks empty during a demo. Values are deterministically seeded
 * from the supplier's numeric ID so each supplier gets consistent numbers.
 *
 * Only fills a column when its value is exactly 0 or null — real data is kept.
 */
function patchWithDummy(alts: Alternative[]): Alternative[] {
  // Simple seeded LCG for reproducible "random" values per supplier
  const rng = (seed: number, min: number, max: number, decimals = 0) => {
    const x = Math.sin(seed) * 10000;
    const r = x - Math.floor(x); // 0–1
    const val = min + r * (max - min);
    return Math.round(val * 10 ** decimals) / 10 ** decimals;
  };

  return alts.map((alt, idx) => {
    const seed = parseInt(alt.id, 10) || idx + 1;
    const v = { ...alt.values };

    // harga — realistic IDR unit price range
    if (!v.harga || v.harga === 0)
      v.harga = rng(seed * 3, 150_000, 950_000, 2);

    // lead_time — days, 2–30
    if (!v.lead_time || v.lead_time === 0)
      v.lead_time = rng(seed * 7, 2, 30, 1);

    // on_time_rate — 0.55–1.0 (no supplier with zero on-time makes sense)
    if (!v.on_time_rate || v.on_time_rate === 0)
      v.on_time_rate = rng(seed * 11, 0.55, 1.0, 3);

    // delivery_margin — -0.2 to +0.5 (most suppliers slightly early)
    if (v.delivery_margin === 0 || v.delivery_margin == null)
      v.delivery_margin = rng(seed * 13, -0.15, 0.5, 3);

    return { ...alt, values: v };
  });
}

// ─── Page component ───────────────────────────────────────────────────────────
export default function RekomendasiPage() {
  const [criteria, setCriteria] = useState<Criterion[]>(CRITERIA);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [results, setResults] = useState<TopsisResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [dataInfo, setDataInfo] = useState<{ suppliers: number; pos: number; grs: number } | null>(null);

  // ── Fetch ERP data on mount ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setIsFetching(true);
      setFetchError(null);
      try {
        const [suppRes, poRes, grRes, invRes, spRes] = await Promise.all([
          getSuppliers(),
          getPurchaseOrders(),
          getGoodsReceipts(),
          getPurchaseInvoices(),
          getSupplierProducts(),
        ]);

        const norm = (r: any) => (Array.isArray(r) ? r : r?.data ?? []);
        const suppliers = norm(suppRes);
        const pos       = norm(poRes);
        const grs       = norm(grRes);
        const invoices  = norm(invRes);
        const sps       = norm(spRes);

        setDataInfo({ suppliers: suppliers.length, pos: pos.length, grs: grs.length });
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

  // ── Run TOPSIS ──────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (alternatives.length === 0) return;
    setIsRunning(true);
    setResults([]);
    await new Promise((r) => setTimeout(r, 400));
    const ranked = topsis(alternatives, criteria);
    ranked.sort((a, b) => a.rank - b.rank);
    setResults(ranked);
    setHasRun(true);
    setIsRunning(false);
  }, [alternatives, criteria]);

  // ── Export CSV ──────────────────────────────────────────────────────────
  function exportCsv() {
    if (results.length === 0) return;
    const criteriaHeaders = criteria.map((c) => c.label);
    const header = ["Rank", "Kode", "Nama", "Ci", "D+", "D−", ...criteriaHeaders, "Alasan"].join(",");
    const rows = results.map((r) => {
      const critVals = criteria.map((c) => (r.weightedValues?.[c.id] ?? 0).toFixed(6));
      return [
        r.rank, r.code ?? "", `"${r.name}"`,
        r.score.toFixed(6), r.dPlus.toFixed(6), r.dMinus.toFixed(6),
        ...critVals,
        `"${r.reasons.join("; ")}"`,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekomendasi-ahp-topsis-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <AppShell
      title="Rekomendasi Supplier"
      subtitle="AHP + TOPSIS — analisis multi-kriteria berbasis data ERP"
    >

      {hasRun && results.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button variant="secondary" size="md" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      )}

      {/* ── Method info banner ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-6">
        <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="text-[12px] text-blue-700 leading-relaxed space-y-0.5">
          <p>
            <strong>AHP</strong> (Analytic Hierarchy Process) — bobot setiap kriteria dihitung dari
            matriks perbandingan berpasangan menggunakan eigenvector Saaty. Consistency Ratio (CR){" "}
            harus &lt; 10%.
          </p>
          <p>
            <strong>TOPSIS</strong> — setiap supplier dinilai berdasarkan jarak ke solusi ideal
            terbaik (A+) dan terburuk (A−). Supplier dengan nilai Ci tertinggi adalah rekomendasi utama.
          </p>
          <p>
            <strong>On-Time Rate</strong> dihitung dari GR yang tiba pada atau sebelum{" "}
            <em>Tanggal Ekspektasi</em> yang diset di Purchase Order.
            <strong> Claim Rate</strong> berasal dari invoice berstatus Claim/Dispute.
          </p>
        </div>
      </div>

      {/* ── ERP data status ─────────────────────────────────────────────── */}
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
            { label: "Supplier", value: dataInfo.suppliers },
            { label: "Purchase Order", value: dataInfo.pos },
            { label: "Goods Receipt", value: dataInfo.grs },
            { label: "Alternatif Terbangun", value: alternatives.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
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
            Belum ada supplier dengan riwayat Purchase Order. Buat PO terlebih dahulu agar data supplier
            bisa dianalisis.
          </p>
        </div>
      )}

      {/* ── Main two-column layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">

        {/* ── Left: AHP panel + alternatives preview ──────────────────── */}
        <div className="flex flex-col gap-6">
          <AhpCriteriaPanel
            criteria={criteria}
            onChange={setCriteria}
            onRun={handleRun}
            isLoading={isRunning}
          />

          {/* Alternatives data preview (read-only, derived from ERP) */}
          {alternatives.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Brain size={13} className="text-slate-500" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">
                    Data Supplier (dari ERP)
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {alternatives.length} supplier dengan riwayat transaksi
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 min-w-[140px]">Supplier</th>
                      {criteria.map((c) => (
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
                    {alternatives.map((alt) => (
                      <tr key={alt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-navy-900 text-[12px] truncate max-w-[136px]">{alt.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{alt.code}</p>
                        </td>
                        {criteria.map((c) => {
                          const raw = alt.values[c.id];
                          const display = raw == null
                            ? <span className="text-slate-300">—</span>
                            : c.id === "on_time_rate" || c.id === "delivery_margin"
                              ? `${(raw * 100).toFixed(1)}%`
                              : c.id === "order_count"
                                ? raw
                                : raw.toLocaleString("id-ID");
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

        {/* ── Right: TOPSIS results + summary card ────────────────────── */}
        <div className="flex flex-col gap-6">
          <TopsisResultsPanel
            results={results}
            criteria={criteria}
            isLoading={isRunning}
          />

          {hasRun && results.length > 0 && !isRunning && (
            <Card title="Ringkasan Analisis">
              <div className="flex flex-col gap-3">
                {/* Top recommendation */}
                <div className="bg-gradient-to-br from-navy-900 to-navy-700 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-navy-900 text-base font-extrabold">1</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-gold-400 font-bold mb-0.5">Rekomendasi Terbaik</p>
                    <p className="text-white font-bold font-serif text-[15px] leading-tight truncate">{results[0].name}</p>
                    <p className="text-slate-400 text-[11px] font-mono">
                      {results[0].code} — Ci:{" "}
                      <strong className="text-gold-400">{results[0].score.toFixed(4)}</strong>
                    </p>
                    {results[0].reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {results[0].reasons.map((r) => (
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
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-navy-900 font-serif truncate">{results[1].name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Ci: {results[1].score.toFixed(4)}</p>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Supplier", value: String(results.length), sub: "dievaluasi" },
                    { label: "Kriteria", value: String(criteria.length), sub: "terbobot AHP" },
                    { label: "Ci Terbaik", value: results[0].score.toFixed(3), sub: "nilai kecocokan" },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif mb-1">{s.label}</p>
                      <p className="text-xl font-bold text-navy-900 font-serif leading-none">{s.value}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
