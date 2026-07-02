"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { ModuleOverview } from "@/components/modules/ModuleOverview";
<<<<<<< HEAD
import { AhpTopsisBestPreview } from "@/components/modules/pembelian/AhpTopsisBestPreview";

=======
>>>>>>> f1137e1 (recommendation panel added)
import { NAV_CONFIG } from "@/lib/nav";
import Link from "next/link";
import {
  Brain, ArrowRight, TrendingUp, Clock, Trophy,
  ShoppingCart, Truck, Clock3, Building2,
  BarChart2, Zap, CreditCard, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { getPurchaseOrders }    from "@/lib/services/po.service";
import { getGoodsReceipts }     from "@/lib/services/gr.service";
import { getSuppliers }         from "@/lib/services/supplier.service";
import { getSupplierProducts }  from "@/lib/services/supplier-product.service";
import { getPurchaseReturns }   from "@/lib/services/purchase-return.service";
import {
  topsis,
  applyPreset,
  calcOnTimeRates,
  calcDeliveryPunctuality,
  PRIORITY_PRESETS,
} from "@/lib/ahp-topsis";
import type { TopsisResult, Alternative } from "@/lib/ahp-topsis";

// ─────────────────────────────────────────────────────────────
// STATS (static placeholders for ModuleOverview)
// ─────────────────────────────────────────────────────────────

const STATS = [
  { label: "Total Pembelian", value: "Rp 2,17 M", change: "+12.4%", trend: "up" as const, sub: "Bulan ini",           icon: ShoppingCart },
  { label: "Goods Receipt",   value: "28",         change: "+4",     trend: "up" as const, sub: "Barang diterima",     icon: Truck        },
  { label: "PO Pending",      value: "6",          change: "+2",     trend: "down" as const, sub: "Menunggu approval", icon: Clock3       },
  { label: "Supplier Aktif",  value: "14",         change: "+1",     trend: "up" as const, sub: "Supplier terdaftar",  icon: Building2    },
];

// ─────────────────────────────────────────────────────────────
// AHP criteria (must match preset matrix column order)
// ─────────────────────────────────────────────────────────────

const AHP_CRITERIA = [
  { id: "avg_price",            label: "Harga Rata-rata",  description: "", weight: 0.2, benefit: false },
  { id: "lead_time",            label: "Lead Time",        description: "", weight: 0.2, benefit: false },
  { id: "on_time_rate",         label: "On-Time Rate",     description: "", weight: 0.2, benefit: true  },
  { id: "delivery_punctuality", label: "Ketepatan Waktu",  description: "", weight: 0.2, benefit: true  },
  { id: "return_rate",          label: "Tingkat Retur",    description: "", weight: 0.2, benefit: false },
];

// ─────────────────────────────────────────────────────────────
// Build TOPSIS alternatives from raw ERP data
// ─────────────────────────────────────────────────────────────

function buildAlternatives(
  suppliers: any[], pos: any[], grs: any[], returns: any[], sps: any[],
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

  type Agg = { name: string; code: string; orderCount: number; actualDays: number[]; catalogDays: number[]; prices: number[]; grIds: Set<number> };
  const agg = new Map<number, Agg>();
  for (const s of normSuppliers)
    agg.set(s.supplier_id, { name: s.supplier_name, code: s.supplier_code, orderCount: 0, actualDays: [], catalogDays: [], prices: [], grIds: new Set() });

  for (const po of normPos) { const a = agg.get(po.supplier_id); if (a) a.orderCount++; }

  const poMap = new Map(normPos.map((p) => [p.purchase_order_id, p]));
  const onTimeMap      = calcOnTimeRates(
    normPos.map(p => ({ purchase_order_id: p.purchase_order_id, supplier_id: p.supplier_id, expected_date: p.expected_date })),
    normGrs.map(g => ({ purchase_order_id: g.purchase_order_id, receipt_date: g.receipt_date })),
  );
  const punctualityMap = calcDeliveryPunctuality(
    normPos.map(p => ({ purchase_order_id: p.purchase_order_id, supplier_id: p.supplier_id, order_date: p.order_date, expected_date: p.expected_date })),
    normGrs.map(g => ({ purchase_order_id: g.purchase_order_id, receipt_date: g.receipt_date })),
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
    const avgPrice   = a.prices.length > 0 ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length : 0;
    const avgLead    = a.actualDays.length > 0
      ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length
      : a.catalogDays.length > 0 ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length : 14;
    const grCount    = a.grIds.size;
    const retCount   = returnCountMap.get(sid) ?? 0;
    const returnRate = grCount > 0 ? retCount / grCount : 0;
    alternatives.push({
      id: String(sid), name: a.name, code: a.code,
      values: {
        avg_price:            Math.round(avgPrice * 100) / 100,
        lead_time:            Math.round(avgLead * 10) / 10,
        on_time_rate:         Math.round((onTimeMap.get(sid) ?? 0) * 1000) / 1000,
        delivery_punctuality: Math.round((punctualityMap.get(sid) ?? 0) * 1000) / 1000,
        return_rate:          Math.round(returnRate * 1000) / 1000,
      },
    });
  }
  return alternatives;
}

// ─────────────────────────────────────────────────────────────
// Per-preset visual config
// ─────────────────────────────────────────────────────────────

interface PresetBest {
  key: string;
  label: string;
  bestName: string;
  bestScore: number;
}

const PRESET_ICON: Record<string, { icon: React.ElementType; iconColor: string }> = {
  balanced:        { icon: BarChart2,  iconColor: "text-slate-300"  },
  urgency_high:    { icon: Zap,        iconColor: "text-rose-300"   },
  budget_priority: { icon: CreditCard, iconColor: "text-amber-300"  },
  quality_focus:   { icon: Trophy,     iconColor: "text-blue-300"   },
};

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function PembelianPage() {
  const module = NAV_CONFIG.find((n) => n.id === "pembelian")!;

  const [presetBests, setPresetBests] = useState<PresetBest[]>([]);
  const [rankLoading, setRankLoading] = useState(true);

  useEffect(() => {
    async function loadRankings() {
      setRankLoading(true);
      try {
        const norm = (r: PromiseSettledResult<any>) =>
          r.status === "fulfilled" ? (Array.isArray(r.value) ? r.value : r.value?.data ?? []) : [];

        const [suppRes, poRes, grRes, retRes, spRes] = await Promise.allSettled([
          getSuppliers(),
          getPurchaseOrders(),
          getGoodsReceipts(),
          getPurchaseReturns(),
          getSupplierProducts(),
        ]);

        const suppliers = norm(suppRes);
        if (suppliers.length === 0) return;

        const alts = buildAlternatives(
          suppliers,
          norm(poRes),
          norm(grRes),
          norm(retRes),
          norm(spRes),
        );
        if (alts.length === 0) return;

        const bests: PresetBest[] = PRIORITY_PRESETS.map((preset) => {
          const { result } = applyPreset(preset.key as any);
          const criteria   = AHP_CRITERIA.map((c, i) => ({ ...c, weight: result.weights[i] }));
          const ranked     = topsis(alts, criteria).sort((a, b) => b.score - a.score);
          const top        = ranked[0];
          return {
            key:       preset.key,
            label:     preset.label,
            bestName:  top?.name  ?? "—",
            bestScore: top?.score ?? 0,
          };
        });
        setPresetBests(bests);
      } catch (e) {
        console.error("Pembelian page AHP rankings error:", e);
      } finally {
        setRankLoading(false);
      }
    }
    loadRankings();
  }, []);

  return (
    <AppShell
      title="Purchasing Dashboard"
      subtitle="Overview aktivitas pembelian dan supplier"
    >
      {/* OVERVIEW */}
      <ModuleOverview module={module} stats={STATS} />

      {/* AI INSIGHT CTA */}
      <Link href="/pembelian/insight" className="block mt-6 group">
        <div className="rounded-2xl border border-navy-800 bg-gradient-to-r from-navy-900 to-navy-700 p-6 shadow-lg hover:shadow-xl hover:from-navy-800 hover:to-navy-600 transition-all duration-200">

          <div className="flex items-start justify-between gap-6">

            {/* Left — text */}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/15 text-gold-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                <Brain size={11} />
                AI Purchasing Insight
              </div>

              <h2 className="text-xl font-bold text-white font-serif leading-tight">
                Lihat analisis penuh performa pembelian
              </h2>

              <p className="mt-2 text-slate-300 text-[13px] max-w-xl leading-relaxed">
                Skor supplier AHP + TOPSIS, spend bulanan, lead time aktual vs katalog,
                kesehatan pembayaran, konsentrasi HHI, dan kandidat reorder — semua dari
                data transaksi nyata.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-gold-400 text-[13px] font-semibold group-hover:gap-3 transition-all duration-150">
                Buka AI Insight Lebih Lanjut
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>

              <AhpTopsisBestPreview />
            </div>

            {/* Right — AHP-TOPSIS best supplier per preset */}
            <div className="hidden lg:flex flex-col gap-2.5 shrink-0 min-w-[220px]">

              {/* Header row */}
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400">
                  Supplier Terbaik · AHP+TOPSIS
                </p>
                {rankLoading && (
                  <RefreshCw size={10} className="text-slate-400 animate-spin" />
                )}
              </div>

              {/* Skeleton while loading */}
              {rankLoading && (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 animate-pulse h-[52px]"
                    />
                  ))}
                </>
              )}

              {/* Live preset cards */}
              {!rankLoading && presetBests.length > 0 && presetBests.map((p) => {
                const cfg = PRESET_ICON[p.key] ?? PRESET_ICON.balanced;
                const Icon = cfg.icon;
                return (
                  <div
                    key={p.key}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Icon size={13} className={cfg.iconColor} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest truncate">
                        {p.label}
                      </p>
                      <p className="text-white text-[13px] font-semibold font-serif truncate leading-tight mt-0.5">
                        {p.bestName}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-gold-400 shrink-0">
                      {p.bestScore.toFixed(3)}
                    </span>
                  </div>
                );
              })}

              {/* Fallback static pills if no data loaded */}
              {!rankLoading && presetBests.length === 0 && (
                <>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gold-400/15 flex items-center justify-center shrink-0">
                      <Trophy size={13} className="text-gold-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">Supplier Terbaik</p>
                      <p className="text-white text-[13px] font-semibold font-serif">Skor AHP + TOPSIS</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-green-400/15 flex items-center justify-center shrink-0">
                      <TrendingUp size={13} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">Spend Bulanan</p>
                      <p className="text-white text-[13px] font-semibold font-serif">Trend & Pareto HHI</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-400/15 flex items-center justify-center shrink-0">
                      <Clock size={13} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">Lead Time</p>
                      <p className="text-white text-[13px] font-semibold font-serif">Aktual vs Katalog</p>
                    </div>
                  </div>
                </>
              )}

            </div>

          </div>

        </div>
      </Link>

    </AppShell>
  );
}
