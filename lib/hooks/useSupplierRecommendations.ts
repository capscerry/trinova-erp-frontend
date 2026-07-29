/**
 * lib/hooks/useSupplierRecommendations.ts
 *
 * Single source of truth for AHP + TOPSIS supplier recommendations.
 *
 * The hook fetches all required ERP data ONCE, builds alternatives ONCE,
 * runs TOPSIS for all 4 priority presets ONCE, and caches the result in a
 * module-level promise so that every consumer (Dashboard, Recommendation page,
 * PO modal, AhpTopsisBestPreview) shares the exact same evaluated dataset.
 *
 * No page or component may independently re-calculate AHP weights, re-run
 * TOPSIS, re-normalise values, or sort suppliers differently.
 *
 * Cache lifetime: the process lifetime (i.e. until a hard page refresh).
 * Call `invalidateRecommendationCache()` to force a fresh calculation on the
 * next consumer mount (e.g. after new purchase transactions are recorded).
 */

"use client";

import { useState, useEffect } from "react";
import {
  topsis,
  applyPreset,
  calcOnTimeRates,
  calcDeliveryPunctuality,
  PRIORITY_PRESETS,
  type Alternative,
  type TopsisResult,
  type Criterion,
} from "@/lib/ahp-topsis";
import { getSuppliers }         from "@/lib/services/supplier.service";
import { getPurchaseOrders }     from "@/lib/services/po.service";
import { getGoodsReceipts }      from "@/lib/services/gr.service";
import { getPurchaseReturns }    from "@/lib/services/purchase-return.service";
import { getSupplierProducts }   from "@/lib/services/supplier-product.service";

// ─── Canonical criteria definition ───────────────────────────────────────────
// Column order MUST match the pairwise matrix column order in lib/ahp-topsis.ts:
//     0: avg_price                 (Cost ↓)
//     1: lead_time                 (Cost ↓)
//     2: on_time_rate              (Benefit ↑)
//     3: delivery_punctuality      (Benefit ↑)
//     4: return_rate               (Cost ↓)

export const SUPPLIER_RECOMMENDATION_CRITERIA: Criterion[] = [
  { id: "avg_price",               label: "Harga Rata-rata",   description: "Rata-rata harga satuan dari invoice pembelian sebelumnya",                              weight: 0.2, benefit: false },
  { id: "lead_time",               label: "Lead Time",         description: "Rata-rata hari aktual dari tanggal PO ke tanggal GR",                                   weight: 0.2, benefit: false },
  { id: "on_time_rate",            label: "On-Time Rate",      description: "Proporsi GR yang tiba sebelum atau tepat pada expected_date PO",                        weight: 0.2, benefit: true  },
  { id: "delivery_punctuality",    label: "Ketepatan Waktu",   description: "Skor ketepatan berbobot: GR lebih awal menaikkkan, terlambat menurunkan skor",          weight: 0.2, benefit: true  },
  { id: "return_rate",             label: "Tingkat Retur",     description: "Rasio retur pembelian terhadap total GR",                                                weight: 0.2, benefit: false },
];

// ─── Per-preset result ────────────────────────────────────────────────────────

/** Best supplier entry for a single priority preset. */
export interface PresetRecommendation {
  /** Preset key (matches PresetKey in lib/ahp-topsis.ts) */
  key: string;
  /** Human-readable preset label (e.g. "Seimbang") */
  label: string;
  /** Description of the preset */
  description: string;
  /** Emoji icon of the preset */
  icon: string;
  /** The AHP-derived weights used for this preset's TOPSIS run */
  weights: Record<string, number>;
  /**
   * All suppliers ranked by TOPSIS Ci score under this preset.
   * Sorted descending (rank 1 = best).
   */
  rankedSuppliers: TopsisResult[];
}

// ─── Full recommendation dataset ─────────────────────────────────────────────

export interface SupplierRecommendationDataset {
  /** The alternatives (suppliers) used as TOPSIS input. */
  alternatives: Alternative[];
  /** One entry per priority preset, each containing the full ranked list. */
  presets: PresetRecommendation[];
}

// ─── Module-level singleton cache ─────────────────────────────────────────────
let _cachedPromise: Promise<SupplierRecommendationDataset | null> | null = null;

/** Force the next hook mount to re-fetch and re-calculate from scratch. */
export function invalidateRecommendationCache(): void {
  _cachedPromise = null;
}

// ─── Core data builder ────────────────────────────────────────────────────────

function buildAlternatives(
  suppliers: any[],
  pos: any[],
  grs: any[],
  returns: any[],
  supplierProducts: any[],
): Alternative[] {
  const normPos = pos.map((p: any) => ({
    purchase_order_id: Number(p.purchase_order_id ?? p.id ?? 0),
    supplier_id:       Number(p.supplier_id ?? p.supplier?.supplier_id ?? 0),
    order_date:        p.order_date    ?? p.orderDate    ?? null,
    expected_date:     p.expected_date ?? p.expectedDate ?? null,
  }));
  const normGrs = grs.map((g: any) => ({
    goods_receipt_id:  Number(g.goods_receipt_id ?? g.id ?? 0),
    purchase_order_id: Number(g.purchase_order_id ?? g.purchaseOrderId ?? 0),
    receipt_date:      g.receipt_date ?? g.receiptDate ?? null,
  }));
  const normReturns = returns.map((r: any) => ({
    supplier_id:       Number(r.supplier_id ?? r.supplierId ?? 0),
    goods_receipt_id:  Number(r.goods_receipt_id ?? r.goodsReceiptId ?? 0),
  }));
  const normSps = supplierProducts.map((sp: any) => ({
    supplier_id:    Number(sp.supplier_id ?? sp.supplierId ?? 0),
    supplier_price: Number(sp.supplier_price ?? sp.price ?? 0),
    lead_time_days: sp.lead_time_days != null ? Number(sp.lead_time_days) : null,
  }));
  const normSuppliers = suppliers.map((s: any) => ({
    supplier_id:   Number(s.supplier_id ?? s.id),
    supplier_name: s.supplier_name ?? s.nama ?? s.name ?? `Supplier ${s.supplier_id ?? s.id}`,
    supplier_code: s.supplier_code ?? s.kode ?? `S-${s.supplier_id ?? s.id}`,
  }));

  type Agg = {
    name: string;
    code: string;
    orderCount: number;
    actualDays: number[];
    catalogDays: number[];
    prices: number[];
    grIds: Set<number>;
    onTimeGRs: number;
    grsWithExpected: number;
  };

  const agg = new Map<number, Agg>();
  for (const s of normSuppliers) {
    agg.set(s.supplier_id, {
      name: s.supplier_name, code: s.supplier_code,
      orderCount: 0, actualDays: [], catalogDays: [], prices: [],
      grIds: new Set(), onTimeGRs: 0, grsWithExpected: 0,
    });
  }

  for (const po of normPos) {
    const a = agg.get(po.supplier_id);
    if (a) a.orderCount++;
  }

  const poMap = new Map(normPos.map((p) => [p.purchase_order_id, p]));

  const onTimeMap = calcOnTimeRates(
    normPos.map((p) => ({ purchase_order_id: p.purchase_order_id, supplier_id: p.supplier_id, expected_date: p.expected_date })),
    normGrs.map((g) => ({ purchase_order_id: g.purchase_order_id, receipt_date: g.receipt_date })),
  );
  const punctualityMap = calcDeliveryPunctuality(
    normPos.map((p) => ({ purchase_order_id: p.purchase_order_id, supplier_id: p.supplier_id, order_date: p.order_date, expected_date: p.expected_date })),
    normGrs.map((g) => ({ purchase_order_id: g.purchase_order_id, receipt_date: g.receipt_date })),
  );

  for (const gr of normGrs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po?.order_date || !gr.receipt_date) continue;
    const days = (new Date(gr.receipt_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
    if (days < 0 || days > 365) continue;
    const a = agg.get(po.supplier_id);
    if (!a) continue;
    a.actualDays.push(days);
    a.grIds.add(gr.goods_receipt_id);
    if (po.expected_date) {
      a.grsWithExpected++;
      if (new Date(gr.receipt_date).getTime() <= new Date(po.expected_date).getTime()) a.onTimeGRs++;
    }
  }

  for (const sp of normSps) {
    const a = agg.get(sp.supplier_id);
    if (!a) continue;
    if (sp.lead_time_days != null) a.catalogDays.push(sp.lead_time_days);
    if (sp.supplier_price > 0)     a.prices.push(sp.supplier_price);
  }

  const returnCountMap = new Map<number, number>();
  for (const ret of normReturns) {
    if (ret.supplier_id === 0) continue;
    returnCountMap.set(ret.supplier_id, (returnCountMap.get(ret.supplier_id) ?? 0) + 1);
  }

  const alternatives: Alternative[] = [];
  for (const [sid, a] of agg.entries()) {
    const avgPrice = a.prices.length > 0
      ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length
      : 0;
    const avgLeadTime = a.actualDays.length > 0
      ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length
      : a.catalogDays.length > 0
        ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length
        : 14;
    const grCount    = a.grIds.size;
    const retCount   = returnCountMap.get(sid) ?? 0;
    const returnRate = grCount > 0 ? retCount / grCount : 0;

    alternatives.push({
      id:   String(sid),
      name: a.name,
      code: a.code,
      values: {
        avg_price:               Math.round(avgPrice * 100) / 100,
        lead_time:               Math.round(avgLeadTime * 10) / 10,
        on_time_rate:            Math.round((onTimeMap.get(sid) ?? 0) * 1000) / 1000,
        delivery_punctuality:    Math.round((punctualityMap.get(sid) ?? 0) * 1000) / 1000,
        return_rate:             Math.round(returnRate * 1000) / 1000,
      },
    });
  }

  return alternatives;
}

// ─── Core async fetcher – runs once and is cached ─────────────────────────────

async function fetchAndCompute(): Promise<SupplierRecommendationDataset | null> {
  const norm = (r: PromiseSettledResult<any>): any[] => {
    if (r.status !== "fulfilled") return [];
    return Array.isArray(r.value) ? r.value : r.value?.data ?? [];
  };

  const [suppRes, poRes, grRes, retRes, spRes] = await Promise.allSettled([
    getSuppliers(),
    getPurchaseOrders(),
    getGoodsReceipts(),
    getPurchaseReturns(),
    getSupplierProducts(),
  ]);

  const suppliers = norm(suppRes);
  if (suppliers.length === 0) return null;

  const alternatives = buildAlternatives(
    suppliers,
    norm(poRes),
    norm(grRes),
    norm(retRes),
    norm(spRes),
  );
  if (alternatives.length === 0) return null;

  const presets: PresetRecommendation[] = PRIORITY_PRESETS.map((preset) => {
    const { result } = applyPreset(preset.key as any);
    const criteriaWithWeights: Criterion[] = SUPPLIER_RECOMMENDATION_CRITERIA.map((c, i) => ({
      ...c,
      weight: result.weights[i],
    }));
    const rankedSuppliers = topsis(alternatives, criteriaWithWeights)
      .slice()
      .sort((a, b) => a.rank - b.rank);

    const weightMap: Record<string, number> = {};
    SUPPLIER_RECOMMENDATION_CRITERIA.forEach((c, i) => {
      weightMap[c.id] = result.weights[i];
    });

    return {
      key:           preset.key,
      label:         preset.label,
      description:   preset.description,
      icon:          preset.icon,
      weights:       weightMap,
      rankedSuppliers,
    };
  });

  return { alternatives, presets };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseSupplierRecommendationsResult {
  loading: boolean;
  error: string | null;
  dataset: SupplierRecommendationDataset | null;
}

/**
 * Consume the shared AHP + TOPSIS recommendation dataset.
 *
 * The first caller triggers the fetch and computation; all subsequent callers
 * receive the same cached result with no additional API calls or re-computation.
 */
export function useSupplierRecommendations(): UseSupplierRecommendationsResult {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [dataset, setDataset]   = useState<SupplierRecommendationDataset | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (_cachedPromise === null) {
      _cachedPromise = fetchAndCompute();
    }

    _cachedPromise
      .then((data) => {
        if (!cancelled) {
          setDataset(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          _cachedPromise = null;
          setError(err instanceof Error ? err.message : "Gagal memuat data rekomendasi supplier");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, error, dataset };
}
