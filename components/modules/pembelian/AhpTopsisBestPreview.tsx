"use client";

/**
 * AhpTopsisBestPreview
 *
 * Shows the #1-ranked supplier from each of the 4 AHP-TOPSIS presets
 * (Seimbang, Urgensi Tinggi, Prioritas Budget, Fokus Kualitas) as a
 * compact inline preview inside the AI Purchasing Insight CTA panel.
 *
 * Data is fetched once on mount. The component is fully self-contained
 * so the parent (pembelian/page.tsx) stays a simple static page.
 */

import { useEffect, useState } from "react";
import { Trophy, BarChart2, Zap, CreditCard, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { getSuppliers }        from "@/lib/services/supplier.service";
import { getPurchaseOrders }   from "@/lib/services/po.service";
import { getGoodsReceipts }    from "@/lib/services/gr.service";
import { getPurchaseReturns }  from "@/lib/services/purchase-return.service";
import { getSupplierProducts } from "@/lib/services/supplier-product.service";

import {
  topsis,
  applyPreset,
  calcOnTimeRates,
  calcDeliveryPunctuality,
  PRIORITY_PRESETS,
  type Alternative,
} from "@/lib/ahp-topsis";

// ─── Criteria definition (must match order in preset matrices) ────────────────

const AHP_CRITERIA = [
  { id: "avg_price",            label: "Harga Rata-rata", description: "", weight: 0.2, benefit: false },
  { id: "lead_time",            label: "Lead Time",       description: "", weight: 0.2, benefit: false },
  { id: "on_time_rate",         label: "On-Time Rate",    description: "", weight: 0.2, benefit: true  },
  { id: "delivery_punctuality", label: "Ketepatan Waktu", description: "", weight: 0.2, benefit: true  },
  { id: "return_rate",          label: "Tingkat Retur",   description: "", weight: 0.2, benefit: false },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PresetWinner {
  presetKey:   string;
  presetLabel: string;
  supplierName: string;
  score:        number;
}

// ─── Build alternatives from raw ERP data ────────────────────────────────────

function buildAlternatives(
  suppliers: any[],
  pos: any[],
  grs: any[],
  returns: any[],
  sps: any[],
): Alternative[] {
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
  const normReturns = returns.map((r: any) => ({
    supplier_id:      Number(r.supplier_id ?? 0),
    goods_receipt_id: Number(r.goods_receipt_id ?? 0),
  }));
  const normSps = sps.map((sp: any) => ({
    supplier_id:    Number(sp.supplier_id),
    supplier_price: Number(sp.supplier_price ?? sp.price ?? 0),
    lead_time_days: sp.lead_time_days != null ? Number(sp.lead_time_days) : null,
  }));
  const normSuppliers = suppliers.map((s: any) => ({
    supplier_id:   Number(s.supplier_id ?? s.id),
    supplier_name: s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id ?? s.id}`,
    supplier_code: s.supplier_code ?? s.kode ?? `S-${s.supplier_id ?? s.id}`,
  }));

  type Agg = {
    name: string; code: string; orderCount: number;
    actualDays: number[]; catalogDays: number[]; prices: number[];
    grIds: Set<number>;
  };

  const agg = new Map<number, Agg>();
  for (const s of normSuppliers) {
    agg.set(s.supplier_id, {
      name: s.supplier_name, code: s.supplier_code,
      orderCount: 0, actualDays: [], catalogDays: [], prices: [], grIds: new Set(),
    });
  }
  for (const po of normPos) {
    const a = agg.get(po.supplier_id);
    if (a) a.orderCount++;
  }

  const onTimeMap      = calcOnTimeRates(
    normPos.map(p => ({ purchase_order_id: p.purchase_order_id, supplier_id: p.supplier_id, expected_date: p.expected_date })),
    normGrs.map(g => ({ purchase_order_id: g.purchase_order_id, receipt_date: g.receipt_date })),
  );
  const punctualityMap = calcDeliveryPunctuality(
    normPos.map(p => ({ purchase_order_id: p.purchase_order_id, supplier_id: p.supplier_id, order_date: p.order_date, expected_date: p.expected_date })),
    normGrs.map(g => ({ purchase_order_id: g.purchase_order_id, receipt_date: g.receipt_date })),
  );

  const poMap = new Map(normPos.map(p => [p.purchase_order_id, p]));
  for (const gr of normGrs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po?.order_date || !gr.receipt_date) continue;
    const days = (new Date(gr.receipt_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
    if (days < 0 || days > 365) continue;
    const a = agg.get(po.supplier_id);
    if (!a) continue;
    a.actualDays.push(days);
    a.grIds.add(gr.goods_receipt_id);
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
    if (a.orderCount === 0) continue;
    const avgPrice = a.prices.length > 0
      ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length : 0;
    const avgLead  = a.actualDays.length > 0
      ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length
      : a.catalogDays.length > 0
        ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length : 14;
    const grCount    = a.grIds.size;
    const retCount   = returnCountMap.get(sid) ?? 0;
    const returnRate = grCount > 0 ? retCount / grCount : 0;
    alternatives.push({
      id: String(sid), name: a.name, code: a.code,
      values: {
        avg_price:            Math.round(avgPrice * 100) / 100,
        lead_time:            Math.round(avgLead  * 10)  / 10,
        on_time_rate:         Math.round((onTimeMap.get(sid)      ?? 0) * 1000) / 1000,
        delivery_punctuality: Math.round((punctualityMap.get(sid) ?? 0) * 1000) / 1000,
        return_rate:          Math.round(returnRate * 1000) / 1000,
      },
    });
  }
  return alternatives;
}

// ─── Per-preset visual config ─────────────────────────────────────────────────

const PRESET_UI = {
  balanced:        { icon: BarChart2,  border: "border-l-slate-400", tag: "bg-white/10 text-slate-200",  dot: "bg-slate-400"  },
  urgency_high:    { icon: Zap,        border: "border-l-rose-400",  tag: "bg-rose-400/20 text-rose-300", dot: "bg-rose-400"   },
  budget_priority: { icon: CreditCard, border: "border-l-amber-400", tag: "bg-amber-400/20 text-amber-300",dot: "bg-amber-400" },
  quality_focus:   { icon: Trophy,     border: "border-l-blue-400",  tag: "bg-blue-400/20 text-blue-300", dot: "bg-blue-400"   },
} as const;

// ─── Score bar ────────────────────────────────────────────────────────────────

function MiniScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "from-emerald-400 to-emerald-500"
    : pct >= 40 ? "from-amber-400 to-amber-500"
    : "from-rose-400 to-rose-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums font-bold text-white/70">
        {score.toFixed(3)}
      </span>
    </div>
  );
}

// ─── Single preset winner card ────────────────────────────────────────────────

function WinnerCard({ winner }: { winner: PresetWinner }) {
  const ui = PRESET_UI[winner.presetKey as keyof typeof PRESET_UI] ?? PRESET_UI.balanced;
  const Icon = ui.icon;
  return (
    <div className={cn(
      "flex-1 min-w-0 rounded-xl border border-white/10 bg-white/5 border-l-2 px-3 py-2.5",
      ui.border,
    )}>
      {/* preset label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={10} className="text-white/50 shrink-0" />
        <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full", ui.tag)}>
          {winner.presetLabel}
        </span>
      </div>

      {/* winner name */}
      <div className="flex items-start gap-1.5">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-[9px] font-extrabold text-navy-900 shrink-0 mt-0.5">
          1
        </span>
        <p className="text-[12px] font-bold text-white font-serif leading-tight truncate">
          {winner.supplierName}
        </p>
      </div>

      {/* score bar */}
      <div className="mt-1.5 pl-5">
        <MiniScoreBar score={winner.score} />
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-1 min-w-0 rounded-xl border border-white/10 bg-white/5 border-l-2 border-l-white/20 px-3 py-2.5 animate-pulse">
      <div className="h-3 w-20 bg-white/10 rounded mb-2" />
      <div className="h-4 w-28 bg-white/10 rounded mb-1.5" />
      <div className="h-1.5 w-16 bg-white/10 rounded ml-5" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AhpTopsisBestPreview() {
  const [winners,  setWinners]  = useState<PresetWinner[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setHasError(false);
      try {
        const norm = (r: PromiseSettledResult<any>): any[] =>
          r.status === "fulfilled"
            ? (Array.isArray(r.value) ? r.value : r.value?.data ?? [])
            : [];

        const [suppRes, poRes, grRes, retRes, spRes] = await Promise.allSettled([
          getSuppliers(),
          getPurchaseOrders(),
          getGoodsReceipts(),
          getPurchaseReturns(),
          getSupplierProducts(),
        ]);

        if (cancelled) return;

        const suppliers = norm(suppRes);
        const pos       = norm(poRes);
        const grs       = norm(grRes);
        const returns   = norm(retRes);
        const sps       = norm(spRes);

        if (suppliers.length === 0) {
          setWinners([]);
          return;
        }

        const alts = buildAlternatives(suppliers, pos, grs, returns, sps);

        const result: PresetWinner[] = PRIORITY_PRESETS.map((preset) => {
          const { result: ahp } = applyPreset(preset.key as any);
          const criteria = AHP_CRITERIA.map((c, i) => ({ ...c, weight: ahp.weights[i] }));
          const ranked   = topsis(alts, criteria).sort((a, b) => b.score - a.score);
          const best     = ranked[0];
          return {
            presetKey:    preset.key,
            presetLabel:  preset.label,
            supplierName: best?.name  ?? "—",
            score:        best?.score ?? 0,
          };
        });

        if (!cancelled) setWinners(result);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Error state ──────────────────────────────────────────────────────────

  if (hasError) {
    return (
      <div className="mt-5 flex items-center gap-2 text-rose-300 text-[11px]">
        <AlertCircle size={12} />
        Gagal memuat data ranking supplier.
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mt-5 pt-4 border-t border-white/10">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
        Supplier Terbaik per Profil AHP-TOPSIS
      </p>
      <div className="flex flex-wrap gap-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : winners.length === 0
            ? (
              <p className="text-[11px] text-slate-400 py-2">
                Belum ada data supplier untuk diranking.
              </p>
            )
            : winners.map((w) => <WinnerCard key={w.presetKey} winner={w} />)
        }
      </div>
    </div>
  );
}
