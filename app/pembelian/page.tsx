"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { ModuleOverview } from "@/components/modules/ModuleOverview";
import { AhpTopsisBestPreview } from "@/components/modules/pembelian/AhpTopsisBestPreview";
import { NAV_CONFIG } from "@/lib/nav";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import {
  Brain, ArrowRight, TrendingUp, Clock, Trophy,
  ShoppingCart, Truck, Clock3, Building2,
  BarChart2, Zap, CreditCard, RefreshCw, MoreVertical,
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
import {
  EMPTY_PURCHASING_DASHBOARD,
  purchasingDashboardService,
  type PurchasingDashboard,
} from "@/lib/services/purchasing-dashboard.service";

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

const toValidDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDayName = (value?: string | null) =>
  toValidDate(value)?.toLocaleDateString("id-ID", { weekday: "long" }) ?? "-";

const formatDayNumber = (value?: string | null) =>
  toValidDate(value)?.toLocaleDateString("id-ID", { day: "2-digit" }) ?? "--";

const formatMonthName = (value?: string | null) =>
  toValidDate(value)?.toLocaleDateString("id-ID", { month: "short" }) ?? "-";

const formatTimeOnly = (value?: string | null) =>
  toValidDate(value)?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";

const getDateKey = (value?: string | null) =>
  toValidDate(value)?.toISOString().slice(0, 10) ?? "";

const priorityClass: Record<string, string> = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  normal: "border-slate-200 bg-slate-50 text-slate-600",
};

const getActivityHref = (refTable?: string | null, refId?: number | null) => {
  if (!refTable || !refId) return null;

  const routeMap: Record<string, string> = {
    purchase_order: "/pembelian/po",
    purchase_invoice: "/pembelian/invoice",
    goods_receipt: "/pembelian/gr",
    purchase_payment: "/pembelian/payment",
    purchase_down_payment: "/pembelian/pdp",
  };

  return routeMap[refTable] ?? null;
};
export default function PembelianPage() {
  const { user, isLoading: authLoading } = useAuth();
  const module = NAV_CONFIG.find((n) => n.id === "pembelian")!;

  const [dashboard, setDashboard] = useState<PurchasingDashboard>(EMPTY_PURCHASING_DASHBOARD);
  const [activityLoading, setActivityLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setActivityLoading(true);
      setDashboard(await purchasingDashboardService.getDashboard());
    } catch (error) {
      console.error("Gagal memuat dashboard purchasing:", error);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchDashboard();
  }, [fetchDashboard, authLoading, user]);
  const [presetBests, setPresetBests] = useState<PresetBest[]>([]);
  const [rankLoading, setRankLoading] = useState(true);

  useEffect(() => {
    async function loadRankings() {
      if (authLoading || !user) return;
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
  }, [authLoading, user]);

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
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
          <div className="flex h-10 items-center justify-between border-b border-slate-200 px-4">
            <p className="truncate text-base font-semibold text-slate-900">
              Aktivitas Terakhir Anda{user?.email ? ` (${user.email})` : ""}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={fetchDashboard} disabled={activityLoading} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50" aria-label="Refresh aktivitas terakhir">
                <RefreshCw size={19} className={activityLoading ? "animate-spin" : ""} />
              </button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100" aria-label="Menu aktivitas terakhir">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          <div className="h-[245px] overflow-y-auto px-4 py-3">
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-slate-100" />)}
              </div>
            ) : dashboard.recentActivities.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-lg italic text-slate-500">Tidak ada aktivitas</p>
              </div>
            ) : (
              <div>
                {dashboard.recentActivities.map((item, index) => {
                  const href = getActivityHref(item.refTable, item.refId);
                  const dateKey = getDateKey(item.createdAt);
                  const previousDateKey = index > 0 ? getDateKey(dashboard.recentActivities[index - 1]?.createdAt) : "";
                  const showDate = index === 0 || dateKey !== previousDateKey;
                  const content = (
                    <div className="group grid grid-cols-[72px_1fr] gap-3">
                      <div className="pt-1 text-slate-600">
                        {showDate && <><p className="text-sm">{formatDayName(item.createdAt)}</p><p className="leading-none text-[44px] font-light">{formatDayNumber(item.createdAt)}</p><p className="-mt-1 text-2xl">{formatMonthName(item.createdAt)}</p></>}
                      </div>
                      <div className="relative border-l border-slate-200 pb-7 pl-8">
                        <span className="absolute -left-[7px] top-2 h-3.5 w-3.5 rounded-full border border-blue-500 bg-blue-100" />
                        <div className="grid grid-cols-[56px_1fr] gap-2">
                          <p className="text-sm font-bold text-slate-900">{formatTimeOnly(item.createdAt)}</p>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-600 group-hover:text-slate-900">{item.title}</p>
                            {(item.description || item.refNumber) && <p className="mt-1 truncate text-xs text-slate-400">{item.description || item.refNumber}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  return href ? <Link key={item.id} href={href} className="block">{content}</Link> : <div key={item.id}>{content}</div>;
                })}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
          <div className="flex h-10 items-center justify-between border-b border-slate-200 px-4">
            <p className="truncate text-base font-semibold text-slate-900">Kegiatan Mendatang</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={fetchDashboard} disabled={activityLoading} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50" aria-label="Refresh kegiatan mendatang">
                <RefreshCw size={19} className={activityLoading ? "animate-spin" : ""} />
              </button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100" aria-label="Menu kegiatan mendatang">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          <div className="h-[245px] overflow-y-auto px-4 py-4">
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-md bg-slate-100" />)}
              </div>
            ) : dashboard.upcomingActivities.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-lg italic text-slate-500">Tidak ada kegiatan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.upcomingActivities.map((item, index) => {
                  const href = getActivityHref(item.refTable, item.refId);
                  const badgeClass = priorityClass[item.priority] ?? priorityClass.normal;
                  const content = (
                    <div className="grid grid-cols-[64px_1fr] gap-4 rounded-lg border border-slate-100 px-3 py-3 transition-colors hover:bg-slate-50">
                      <div className="text-slate-600"><p className="text-sm">{formatDayName(item.activityDate)}</p><p className="leading-none text-3xl font-light">{formatDayNumber(item.activityDate)}</p><p className="text-sm">{formatMonthName(item.activityDate)}</p></div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                            {(item.description || item.refNumber) && <p className="mt-1 truncate text-xs text-slate-400">{item.description || item.refNumber}</p>}
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass}`}>{item.priority}</span>
                        </div>
                      </div>
                    </div>
                  );

                  return href ? <Link key={`${item.activityType}-${item.refId ?? index}-${item.activityDate}`} href={href} className="block">{content}</Link> : <div key={`${item.activityType}-${index}`}>{content}</div>;
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
