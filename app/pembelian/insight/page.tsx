"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Trophy, ShoppingCart, Clock, CreditCard,
  BarChart2, Zap, Info, ArrowRight,
  ShieldCheck, Shield, ShieldAlert, ShieldX,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout";
import { Button, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

import {
  getPurchaseOrders,
} from "@/lib/services/po.service";
import { getSuppliers }         from "@/lib/services/supplier.service";
import { getGoodsReceipts }     from "@/lib/services/gr.service";
import { getPurchaseInvoices }  from "@/lib/services/purchase-invoice.service";
import { getPurchasePayments }  from "@/lib/services/purchase-payment.service";
import { getSupplierProducts }  from "@/lib/services/supplier-product.service";
import { getPurchaseReturns }   from "@/lib/services/purchase-return.service";
import { predictAllSuppliers, normalizeRiskLevel, trainFromErp } from "@/lib/services/supplier-risk.service";
import type { BatchPredictItem } from "@/lib/services/supplier-risk.service";
import {
  topsis,
  applyPreset,
  calcOnTimeRates,
  calcDeliveryPunctuality,
  PRIORITY_PRESETS,
} from "@/lib/ahp-topsis";
import type { TopsisResult, Alternative } from "@/lib/ahp-topsis";
import type { RiskLevel } from "@/lib/xgboost-risk";

import {
  calcSpendSummary,
  calcLeadTimeStats,
  calcPaymentHealth,
  calcSupplierScores,
  calcSpendConcentration,
  type SpendSummary,
  type LeadTimeStats,
  type PaymentHealthStats,
  type SupplierScore,
  type ConcentrationResult,
} from "@/lib/purchasing-insights";


// ─── Small reusable UI helpers ────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-900 to-navy-600 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-gold-400" />
      </div>
      <div>
        <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">{label}</h2>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, trend, color = "text-navy-900" }: {
  label: string; value: string; sub?: React.ReactNode;
  trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">{label}</p>
      <p className={cn("text-2xl font-bold font-serif leading-tight", color)}>{value}</p>
      {sub && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          {trend === "up"      && <TrendingUp   size={11} className="text-green-500" />}
          {trend === "down"    && <TrendingDown  size={11} className="text-rose-500" />}
          {trend === "neutral" && <Minus         size={11} className="text-slate-400" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function SkeletonBlock({ h = "h-32" }: { h?: string }) {
  return <div className={cn("rounded-xl bg-slate-100 animate-pulse", h)} />;
}

// ─── Mini horizontal bar ──────────────────────────────────────────────────────

function MiniBar({ value, max, color = "bg-navy-600" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Spend bar chart (monthly) ────────────────────────────────────────────────

const BAR_AREA_PX = 180; // fixed pixel height for the bar drawing area

function SpendBarChart({ data }: { data: SpendSummary["spendByMonth"] }) {
  if (data.length === 0)
    return <p className="text-[12px] text-slate-400 text-center py-8">Tidak ada data periode</p>;

  const max = Math.max(...data.map((d) => d.amount), 1);
  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(n);

  // Y-axis guide lines at 25 / 50 / 75 / 100 %
  const guides = [0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full select-none">
      {/* bar area */}
      <div className="relative w-full" style={{ height: BAR_AREA_PX }}>

        {/* horizontal guide lines */}
        {guides.map((g) => (
          <div
            key={g}
            className="absolute left-0 right-0 border-t border-dashed border-slate-100"
            style={{ bottom: `${g * 100}%` }}
          >
            <span className="absolute right-0 -top-3.5 text-[9px] text-slate-300 tabular-nums pr-1">
              {fmt(max * g)}
            </span>
          </div>
        ))}

        {/* bars */}
        <div className="absolute inset-0 flex items-end gap-1.5 pr-8">
          {data.map((d) => {
            const pct = Math.max(3, Math.round((d.amount / max) * 100));
            const isMax = d.amount === max;
            return (
              <div
                key={d.month}
                className="group relative flex-1 min-w-0 flex flex-col items-center justify-end"
                style={{ height: "100%" }}
                title={`${d.month}: Rp ${fmt(d.amount)}`}
              >
                {/* value label — appears on hover, always visible for max */}
                <span
                  className={cn(
                    "absolute text-[9px] font-semibold tabular-nums text-navy-700 whitespace-nowrap transition-opacity duration-150 pointer-events-none",
                    isMax ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  style={{ bottom: `${pct}%`, marginBottom: 4 }}
                >
                  {fmt(d.amount)}
                </span>

                {/* the bar itself */}
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-700",
                    isMax
                      ? "bg-gradient-to-t from-gold-600 to-gold-400"
                      : "bg-gradient-to-t from-navy-900 to-navy-500 group-hover:from-navy-700 group-hover:to-navy-400"
                  )}
                  style={{ height: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* month labels below the bar area */}
      <div className="flex gap-1.5 mt-1 pr-8">
        {data.map((d) => (
          <div key={d.month} className="flex-1 min-w-0 text-center">
            <span className="text-[9px] text-slate-400 truncate block leading-none">
              {d.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Supplier ranking table ───────────────────────────────────────────────────

function SupplierRankTable({ scores }: { scores: SupplierScore[] }) {
  if (scores.length === 0)
    return <p className="text-[12px] text-slate-400 text-center py-8">Belum ada data supplier</p>;

  const fmtPct  = (v: number) => `${Math.round(v * 100)}%`;
  const fmtDays = (v: number | null) => v != null ? `${v}h` : "—";
  const fmtRp   = (v: number | null) =>
    v != null
      ? new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(v)
      : "—";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {[
              { h: "#",                 tip: null },
              { h: "Supplier",          tip: null },
              { h: "Nilai Kecocokan",   tip: "Ci — seberapa dekat supplier ke kondisi ideal terbaik. Mendekati 1 = terbaik." },
              { h: "Estimasi Pengiriman", tip: "Lead Time — rata-rata hari dari tanggal pesanan hingga barang diterima." },
              { h: "Ketepatan Kirim",   tip: "On-Time Rate — persentase pengiriman yang tiba sesuai target waktu katalog." },
              { h: "Total Pembelian",   tip: "Spend — total nilai Purchase Order yang ditempatkan ke supplier ini." },
              { h: "Pesanan",           tip: "Order Count — jumlah Purchase Order historis." },
            ].map(({ h, tip }) => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif whitespace-nowrap">
                {tip ? <Tooltip term={h} label={tip} /> : h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {scores.map((s) => (
            <tr key={s.supplierId}
              className={cn("transition-colors", s.rank === 1 && "bg-gold-300/10", s.rank !== 1 && "hover:bg-slate-50")}
            >
              <td className="px-3 py-3">
                {s.rank <= 3 ? (
                  <span className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold",
                    s.rank === 1 && "bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900",
                    s.rank === 2 && "bg-slate-200 text-slate-600",
                    s.rank === 3 && "bg-amber-100 text-amber-700",
                  )}>{s.rank}</span>
                ) : (
                  <span className="text-slate-400 font-semibold">{s.rank}</span>
                )}
              </td>
              <td className="px-3 py-3">
                <p className="font-semibold text-navy-900 font-serif">{s.supplierName}</p>
                <p className="text-[10px] text-slate-400">{s.invoiceCount} invoice</p>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <MiniBar value={s.ahpScore} max={1}
                    color={s.ahpScore >= 0.6 ? "bg-green-500" : s.ahpScore >= 0.4 ? "bg-amber-400" : "bg-rose-400"} />
                  <Tooltip
                    term={s.ahpScore.toFixed(4)}
                    label="Nilai Kecocokan (Ci) — mendekati 1 berarti supplier paling mendekati kondisi ideal di semua kriteria."
                    className="tabular-nums font-bold text-slate-700 w-12 shrink-0"
                  />
                </div>
              </td>
              <td className="px-3 py-3">
                <span className={cn(
                  "font-semibold tabular-nums",
                  s.avgLeadTimeDays == null ? "text-slate-400"
                    : s.avgLeadTimeDays <= 7 ? "text-green-600"
                    : s.avgLeadTimeDays <= 14 ? "text-amber-600"
                    : "text-rose-600"
                )}>
                  {fmtDays(s.avgLeadTimeDays)}
                </span>
                {s.catalogLeadTime != null && (
                  <p className="text-[10px] text-slate-400">
                    <Tooltip term="katalog" label="Target Lead Time dari data katalog supplier (hari)." />: {s.catalogLeadTime}h
                  </p>
                )}
              </td>
              <td className="px-3 py-3">
                <span className={cn(
                  "font-semibold",
                  s.onTimeRate >= 0.8 ? "text-green-600" : s.onTimeRate >= 0.5 ? "text-amber-600" : "text-rose-500"
                )}>
                  {fmtPct(s.onTimeRate)}
                </span>
              </td>
              <td className="px-3 py-3 tabular-nums text-slate-700 font-semibold">
                Rp {fmtRp(s.totalSpend)}
              </td>
              <td className="px-3 py-3 tabular-nums text-slate-600">{s.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lead-time table ──────────────────────────────────────────────────────────

function LeadTimeTable({ data }: { data: LeadTimeStats[] }) {
  if (data.length === 0)
    return <p className="text-[12px] text-slate-400 text-center py-8">Data penerimaan barang belum cukup untuk menghitung estimasi pengiriman</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {[
              { h: "Supplier",             tip: null },
              { h: "Aktual (rata-rata)",   tip: "Lead Time aktual — rata-rata hari dari tanggal PO hingga tanggal penerimaan barang (GR)." },
              { h: "Target Katalog",       tip: "Lead Time katalog — target hari pengiriman yang dijanjikan supplier dalam katalog produk." },
              { h: "Selisih",              tip: "Delta Lead Time — selisih antara aktual dan target. Positif = terlambat, negatif = lebih cepat." },
              { h: "# Penerimaan",         tip: "Jumlah Goods Receipt (GR) yang digunakan sebagai dasar perhitungan." },
            ].map(({ h, tip }) => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif whitespace-nowrap">
                {tip ? <Tooltip term={h} label={tip} /> : h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((r) => {
            const delta = r.leadTimeDelta;
            const deltaColor = delta == null ? "text-slate-400"
              : delta <= 0 ? "text-green-600"
              : delta <= 3 ? "text-amber-600"
              : "text-rose-600";
            return (
              <tr key={r.supplierId} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 font-semibold text-navy-900 font-serif">{r.supplierName}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <MiniBar value={r.avgLeadTimeDays} max={Math.max(...data.map((d) => d.avgLeadTimeDays), 1)}
                      color={r.avgLeadTimeDays <= 7 ? "bg-green-400" : r.avgLeadTimeDays <= 14 ? "bg-amber-400" : "bg-rose-400"}
                    />
                    <span className="tabular-nums font-bold text-slate-700 shrink-0">{r.avgLeadTimeDays}h</span>
                  </div>
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-500">{r.catalogLeadTime != null ? `${r.catalogLeadTime}h` : "—"}</td>
                <td className={cn("px-3 py-3 tabular-nums font-semibold", deltaColor)}>
                  {delta == null ? "—" : delta > 0 ? `+${delta}h (terlambat)` : `${delta}h (tepat waktu)`}
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-500">{r.grCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Supplier ranking types ───────────────────────────────────────────────────

interface RiskRow {
  supplier_id:   number;
  supplier_name: string;
  risk_score:    number;
  risk_level:    RiskLevel;
}

interface AhpPresetRanking {
  key:         string;
  label:       string;
  icon:        string;
  color:       string;
  description: string;
  results:     TopsisResult[];
}

// AHP criteria — column order must match preset matrices in lib/ahp-topsis.ts
const AHP_CRITERIA = [
  { id: "avg_price",            label: "Harga Rata-rata",  description: "", weight: 0.2, benefit: false },
  { id: "lead_time",            label: "Lead Time",        description: "", weight: 0.2, benefit: false },
  { id: "on_time_rate",         label: "On-Time Rate",     description: "", weight: 0.2, benefit: true  },
  { id: "delivery_punctuality", label: "Ketepatan Waktu",  description: "", weight: 0.2, benefit: true  },
  { id: "return_rate",          label: "Tingkat Retur",    description: "", weight: 0.2, benefit: false },
];

// ─── Build TOPSIS alternatives from raw ERP data ─────────────────────────────

function buildAltFromErp(
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
  for (const s of normSuppliers) {
    agg.set(s.supplier_id, { name: s.supplier_name, code: s.supplier_code, orderCount: 0, actualDays: [], catalogDays: [], prices: [], grIds: new Set() });
  }
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
    const avgPrice = a.prices.length > 0 ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length : 0;
    const avgLead  = a.actualDays.length > 0 ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length
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

// ─── Rank medal ───────────────────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-[10px] font-extrabold shadow-sm shrink-0">1</span>
  );
  if (rank === 2) return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-extrabold shrink-0">2</span>
  );
  if (rank === 3) return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold shrink-0">3</span>
  );
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold shrink-0">{rank}</span>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

const RISK_CFG: Record<RiskLevel, { barColor: string; textColor: string; badgeCls: string; icon: typeof ShieldCheck }> = {
  Low:      { barColor: "bg-emerald-400", textColor: "text-emerald-700", badgeCls: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: ShieldCheck },
  Medium:   { barColor: "bg-amber-400",   textColor: "text-amber-700",   badgeCls: "bg-amber-50  border-amber-200  text-amber-700",   icon: Shield      },
  High:     { barColor: "bg-orange-400",  textColor: "text-orange-700",  badgeCls: "bg-orange-50 border-orange-200 text-orange-700",  icon: ShieldAlert },
  Critical: { barColor: "bg-rose-500",    textColor: "text-rose-700",    badgeCls: "bg-rose-50   border-rose-200   text-rose-700",    icon: ShieldX     },
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_CFG[level];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0", cfg.badgeCls)}>
      <Icon size={9} />{level}
    </span>
  );
}

// ─── Risk Detection ranking table ─────────────────────────────────────────────

function RiskRankingTable({ rows, loading }: { rows: RiskRow[]; loading: boolean }) {
  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-9 bg-slate-100 rounded-lg" />)}
    </div>
  );
  if (rows.length === 0) return (
    <p className="text-[12px] text-slate-400 text-center py-8">Belum ada data risiko supplier</p>
  );
  return (
    <div className="overflow-x-auto">
      {/* column headers */}
      <div className="grid grid-cols-[32px_1fr_160px_110px] gap-0 bg-slate-50 border-b border-slate-100 px-4 py-1.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">#</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Supplier</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          <Tooltip term="Delay Probability" label="Skor risiko keterlambatan (0–100%) dari model XGBoost. Semakin tinggi = semakin berisiko." />
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Level</span>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map((r, i) => {
          const cfg = RISK_CFG[r.risk_level];
          return (
            <div
              key={r.supplier_id}
              className={cn(
                "grid grid-cols-[32px_1fr_160px_110px] gap-0 items-center px-4 py-2.5 transition-colors",
                i === 0 ? "bg-rose-50/30" : "hover:bg-slate-50"
              )}
            >
              <RankMedal rank={i + 1} />
              <p className="text-[12px] font-semibold text-navy-900 font-serif truncate pr-2">{r.supplier_name}</p>
              <div className="flex items-center gap-2 pr-3">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", cfg.barColor)}
                    style={{ width: `${Math.round(r.risk_score * 100)}%` }}
                  />
                </div>
                <span className={cn("tabular-nums font-bold text-[11px] shrink-0 w-10 text-right", cfg.textColor)}>
                  {(r.risk_score * 100).toFixed(1)}%
                </span>
              </div>
              <RiskBadge level={r.risk_level} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AHP preset ranking table ─────────────────────────────────────────────────

// Per-preset accent: left-border color + header tag color (no emojis, navy base)
const PRESET_STYLE: Record<string, { border: string; tag: string; tagText: string; icon: typeof Brain }> = {
  balanced:        { border: "border-l-slate-400",  tag: "bg-slate-100 text-slate-600",   tagText: "Seimbang",        icon: BarChart2   },
  urgency_high:    { border: "border-l-rose-400",   tag: "bg-rose-50   text-rose-700",    tagText: "Urgensi Tinggi",  icon: Zap         },
  budget_priority: { border: "border-l-amber-400",  tag: "bg-amber-50  text-amber-700",   tagText: "Prioritas Budget",icon: CreditCard  },
  quality_focus:   { border: "border-l-blue-500",   tag: "bg-blue-50   text-blue-700",    tagText: "Fokus Kualitas",  icon: Trophy      },
};

function AhpPresetTable({ preset, loading }: { preset: AhpPresetRanking; loading: boolean }) {
  const style = PRESET_STYLE[preset.key] ?? PRESET_STYLE.balanced;
  const Icon  = style.icon;
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 border-l-4 shadow-sm overflow-hidden", style.border)}>
      {/* header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-navy-900 to-navy-700 flex items-center justify-center shrink-0">
          <Icon size={11} className="text-gold-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-navy-900 font-serif leading-none">{preset.label}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{preset.description}</p>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", style.tag)}>
          AHP-TOPSIS
        </span>
      </div>
      {/* column headers */}
      <div className="grid grid-cols-[32px_1fr_140px] gap-0 bg-slate-50 border-b border-slate-100 px-4 py-1.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">#</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Supplier</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          <Tooltip term="Skor Ci" label="Closeness Coefficient (Ci) — mendekati 1 = paling dekat ke kondisi ideal di semua kriteria." />
        </span>
      </div>
      {/* body */}
      {loading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-8 bg-slate-100 rounded" />)}
        </div>
      ) : preset.results.length === 0 ? (
        <p className="text-[12px] text-slate-400 text-center py-6">Belum ada data ERP</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {preset.results.slice(0, 7).map((r) => {
            const pct = Math.round(r.score * 100);
            const barColor =
              pct >= 70 ? "bg-navy-700"
              : pct >= 40 ? "bg-navy-400"
              : "bg-slate-300";
            return (
              <div
                key={r.alternativeId}
                className={cn(
                  "grid grid-cols-[32px_1fr_140px] gap-0 items-center px-4 py-2.5 transition-colors",
                  r.rank === 1 ? "bg-gold-300/10" : "hover:bg-slate-50"
                )}
              >
                <RankMedal rank={r.rank} />
                <p className="text-[12px] font-semibold text-navy-900 font-serif truncate pr-2">{r.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", barColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="tabular-nums font-bold text-navy-900 text-[11px] shrink-0 w-14 text-right">
                    {r.score.toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Spend concentration badge ────────────────────────────────────────────────

function ConcentrationBadge({ result }: { result: ConcentrationResult }) {
  const colors = {
    Low:      { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700"  },
    Moderate: { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700"  },
    High:     { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-700"   },
  };
  const c = colors[result.hhiLabel];
  const labels = {
    Low:      "Rendah",
    Moderate: "Sedang",
    High:     "Tinggi",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold", c.bg, c.border, c.text)}>
      {result.hhiLabel === "High" && <AlertTriangle size={11} />}
      <Tooltip
        term={`Diversifikasi ${labels[result.hhiLabel]}`}
        label={`Concentration (HHI) — Indeks Diversifikasi Supplier. HHI ${result.hhi}: ${result.hhiLabel === "High" ? "pembelian sangat terpusat pada sedikit supplier" : result.hhiLabel === "Moderate" ? "diversifikasi supplier cukup baik" : "pembelian tersebar merata di banyak supplier"}.`}
      />
    </span>
  );
}

// ─── Payment health gauge ─────────────────────────────────────────────────────

function PaymentGauge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 80 ? "from-green-400 to-green-600"
    : pct >= 50 ? "from-amber-400 to-amber-600"
    : "from-rose-400 to-rose-600";
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f4f8" strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none"
            stroke="url(#payGrad)" strokeWidth="12"
            strokeDasharray={`${pct * 2.51327} 251.327`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="payGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={cn("", pct >= 80 ? "stop-color-[#4ade80]" : pct >= 50 ? "stop-color-[#fbbf24]" : "stop-color-[#f87171]")} stopColor={pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171"} />
              <stop offset="100%" stopColor={pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626"} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-extrabold font-serif", pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-rose-600")}>
            {pct}%
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Lunas</span>
        </div>
      </div>
    </div>
  );
}

// ─── AHP weight explanation panel ─────────────────────────────────────────────

function AhpMethodNote() {
  const criteria = [
    { label: "Estimasi Pengiriman", weight: "30%", type: "Diminimalkan", desc: "Rata-rata hari dari pemesanan hingga barang tiba" },
    { label: "Ketepatan Kirim",     weight: "25%", type: "Menguntungkan", desc: "% pengiriman yang tiba sesuai jadwal" },
    { label: "Harga",               weight: "20%", type: "Diminimalkan", desc: "Rata-rata harga katalog supplier" },
    { label: "Porsi Pembelian",     weight: "15%", type: "Menguntungkan", desc: "Kontribusi supplier terhadap total pembelian" },
    { label: "Jumlah Pesanan",      weight: "10%", type: "Menguntungkan", desc: "Volume transaksi historis" },
  ];
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-blue-700 leading-relaxed">
          Setiap supplier dinilai berdasarkan <strong>5 kriteria bisnis</strong> yang masing-masing
          diberi bobot kepentingan. Supplier kemudian diranking dari yang paling sesuai hingga
          yang paling tidak sesuai — nilai kecocokan mendekati 1 berarti performa terbaik.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {criteria.map((c) => (
          <div key={c.label} className="bg-white border border-blue-100 rounded-lg px-3 py-2 text-[11px]">
            <span className="font-bold text-navy-900">{c.label}</span>
            <span className="text-slate-400 mx-1">·</span>
            <span className="font-bold text-blue-600">{c.weight}</span>
            <span className={cn("ml-1 text-[10px] font-bold", c.type === "Menguntungkan" ? "text-green-600" : "text-rose-500")}>
              ({c.type})
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function PurchasingInsightPage() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [spend,          setSpend]          = useState<SpendSummary | null>(null);
  const [leadTimes,      setLeadTimes]      = useState<LeadTimeStats[]>([]);
  const [paymentHealth,  setPaymentHealth]  = useState<PaymentHealthStats | null>(null);
  const [supplierScores, setSupplierScores] = useState<SupplierScore[]>([]);
  const [concentration,  setConcentration]  = useState<ConcentrationResult | null>(null);

  // AI supplier rankings
  const [rankLoading,  setRankLoading]  = useState(true);
  const [riskRows,     setRiskRows]     = useState<RiskRow[]>([]);
  const [ahpRankings,  setAhpRankings]  = useState<AhpPresetRanking[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, supplierRes, grRes, invoiceRes, paymentRes, spRes] =
        await Promise.allSettled([
          getPurchaseOrders(),
          getSuppliers(),
          getGoodsReceipts(),
          getPurchaseInvoices(),
          getPurchasePayments(),
          getSupplierProducts(),
        ]);

      const norm = <T,>(r: PromiseSettledResult<any>): T[] =>
        r.status === "fulfilled" ? (Array.isArray(r.value) ? r.value : r.value?.data ?? []) : [];

      const pos         = norm<any>(poRes);
      const suppliers   = norm<any>(supplierRes);
      const grs         = norm<any>(grRes);
      const invoices    = norm<any>(invoiceRes);
      const payments    = norm<any>(paymentRes);
      const supProducts = norm<any>(spRes);

      // normalise supplier names from nested object
      const normPos = pos.map((p: any) => ({
        ...p,
        supplier_id: Number(p.supplier_id ?? p.supplier?.supplier_id),
        total_amount: Number(p.total_amount ?? 0),
      }));

      const normSuppliers = suppliers.map((s: any) => ({
        supplier_id: Number(s.supplier_id),
        supplier_name: s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id}`,
      }));

      const spendResult = calcSpendSummary(normPos, normSuppliers);
      setSpend(spendResult);
      setConcentration(calcSpendConcentration(spendResult.spendBySupplier));
      setLeadTimes(calcLeadTimeStats(normPos, grs, supProducts, normSuppliers));
      setPaymentHealth(calcPaymentHealth(invoices, payments));
      setSupplierScores(calcSupplierScores(normPos, grs, supProducts, invoices, normSuppliers));
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Insight fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch AI rankings: risk detection + AHP-TOPSIS 4 presets ────────────
  const fetchRankings = useCallback(async () => {
    setRankLoading(true);
    try {
      const norm = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? (Array.isArray(r.value) ? r.value : r.value?.data ?? []) : [];

      // ── Step 1: Re-train XGBoost on latest ERP data (non-fatal if fails) ──
      try {
        await trainFromErp(true);
      } catch {
        // Training failure is non-fatal — predict will use the existing model
      }

      // ── Step 2: Batch fetch everything in parallel ────────────────────────
      const [suppRes, poRes, grRes, retRes, spRes, riskRes] = await Promise.allSettled([
        getSuppliers(),
        getPurchaseOrders(),
        getGoodsReceipts(),
        getPurchaseReturns(),
        getSupplierProducts(),
        predictAllSuppliers(),
      ]);

      const suppliers = norm(suppRes);
      const nameMap   = new Map<number, string>(
        suppliers.map((s: any) => [
          Number(s.supplier_id ?? s.id),
          String(s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id ?? s.id}`),
        ])
      );

      // ── Risk rows: sorted highest → lowest risk score ──────────────────
      if (riskRes.status === "fulfilled") {
        const rows: RiskRow[] = riskRes.value.results
          .filter((v: BatchPredictItem) => v.supplier_id != null && v.supplier_id !== 0)
          .map((v: BatchPredictItem) => ({
            supplier_id:   Number(v.supplier_id),
            supplier_name: v.supplier_name ?? nameMap.get(Number(v.supplier_id)) ?? `Supplier ${v.supplier_id}`,
            risk_score:    Number(v.delay_probability ?? 0),
            risk_level:    normalizeRiskLevel(String(v.risk_level ?? "low")),
          }))
          .sort((a: RiskRow, b: RiskRow) => b.risk_score - a.risk_score);
        setRiskRows(rows);
      }

      // ── AHP preset rankings ────────────────────────────────────────────
      const pos     = norm(poRes);
      const grs     = norm(grRes);
      const returns = norm(retRes);
      const sps     = norm(spRes);

      if (suppliers.length > 0) {
        const alts = buildAltFromErp(suppliers, pos, grs, returns, sps);
        const rankings: AhpPresetRanking[] = PRIORITY_PRESETS.map((preset) => {
          const { result } = applyPreset(preset.key as any);
          const criteria   = AHP_CRITERIA.map((c, i) => ({ ...c, weight: result.weights[i] }));
          // Sort by score descending so rank 1 (best Ci) is always first in the list
          const sorted = topsis(alts, criteria).sort((a, b) => b.score - a.score);
          return {
            key:         preset.key,
            label:       preset.label,
            icon:        preset.icon,
            color:       preset.color,
            description: preset.description,
            results:     sorted,
          };
        });
        setAhpRankings(rankings);
      }
    } catch (e) {
      console.error("Rankings fetch error:", e);
    } finally {
      setRankLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchRankings();
  }, [fetchAll, fetchRankings]);

  const fmtCompact = (n: number) =>
    new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(n);

  return (
    <AppShell title="AI Purchasing Insight" subtitle="Analitik pembelian berbasis AHP & TOPSIS">

      {/* ── Hero header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-700 rounded-2xl p-6 mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/15 text-gold-400 text-[11px] font-bold uppercase tracking-widest mb-3">
            <Brain size={12} />
            AI Purchasing Insight
          </div>
          <h1 className="text-xl font-bold text-white font-serif leading-tight">
            Analisis Penuh Performa Pembelian
          </h1>
          <p className="text-slate-300 text-[13px] mt-1 max-w-xl">
            Penilaian supplier, tren pembelian bulanan, estimasi pengiriman aktual vs target,
            kesehatan pembayaran, diversifikasi, dan produk perlu restok — semua dari data transaksi nyata.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {lastUpdated
              ? `Update: ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
              : "Refresh"}
          </button>
          <Link
            href="/rekomendasi"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-400 text-navy-900 text-[11px] font-bold hover:bg-gold-300 transition-colors"
          >
            <Brain size={11} />
            Kalkulator Rekomendasi AI
          </Link>
          <Link href="/pembelian" className="text-[11px] text-slate-500 hover:text-gold-400 transition-colors flex items-center gap-1">
            ← Kembali ke Pembelian
          </Link>
        </div>
      </div>

      {/* ── Top KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} h="h-28" />)
        ) : spend ? (
          <>
            <KpiCard label="Total Pembelian" value={`Rp ${fmtCompact(spend.totalSpend)}`}
              sub={`${spend.totalOrders} purchase order`} trend="up" />
            <KpiCard label="Rata-rata Nilai Pesanan" value={`Rp ${fmtCompact(spend.avgOrderValue)}`}
              sub="per pesanan rata-rata" trend="neutral" />
            <KpiCard label="PO Disetujui" value={String(spend.totalApproved)}
              sub={`${spend.totalPending} pending · ${spend.totalCancelled} batal`}
              trend={spend.totalPending > 5 ? "down" : "up"}
              color={spend.totalApproved > 0 ? "text-green-600" : "text-slate-700"} />
            <KpiCard label="Supplier Aktif" value={String(spend.spendBySupplier.length)}
              sub={concentration ? (
                <><Tooltip
                  term={`HHI ${concentration.hhi}`}
                  label={`Indeks Diversifikasi (HHI) — mengukur sebaran pembelian antar supplier. Di bawah 1.500 = tersebar merata (baik); di atas 2.500 = sangat terpusat (berisiko).`}
                /> — {concentration.hhiLabel === "High" ? "Diversifikasi Rendah" : concentration.hhiLabel === "Moderate" ? "Diversifikasi Sedang" : "Diversifikasi Tinggi"}</>
              ) : ""}
              trend="neutral" />
          </>
        ) : null}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
        <SectionTitle icon={Brain} label="AI Risk Model Metrics" sub="Prediksi risiko supplier berbasis XGBoost" />
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[12px] text-blue-700">
          <Info size={13} className="text-blue-400 shrink-0" />
          <span>
            Prediksi risiko dan metrik model tersedia di halaman{" "}
            <Link href="/rekomendasi" className="font-bold underline underline-offset-2 hover:text-blue-900 inline-flex items-center gap-1">
              Rekomendasi Supplier <ArrowRight size={11} />
            </Link>
            {" "}— tab <strong>XGBoost Risk</strong>.
          </span>
        </div>
      </div>

      {/* ── Row 1: Spend chart + Concentration + Payment ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

        {/* Monthly spend bar chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={BarChart2} label="Pembelian Bulanan" sub="Total nilai pembelian per bulan" />
          {loading ? <SkeletonBlock h="h-52" /> : <SpendBarChart data={spend?.spendByMonth ?? []} />}
        </div>

        {/* Payment health */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={CreditCard} label="Kesehatan Pembayaran" sub="Lunas vs total invoice" />
          {loading ? <SkeletonBlock h="h-40" /> : paymentHealth ? (
            <div className="flex flex-col items-center gap-2">
              <PaymentGauge rate={paymentHealth.paymentRate} />
              <div className="grid grid-cols-2 gap-2 w-full text-center">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">Ditagih</p>
                  <p className="text-sm font-bold text-navy-900 font-serif mt-0.5">Rp {fmtCompact(paymentHealth.totalInvoiced)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">Belum Lunas</p>
                  <p className="text-sm font-bold text-rose-600 font-serif mt-0.5">Rp {fmtCompact(paymentHealth.unpaidAmount)}</p>
                </div>
              </div>
              {paymentHealth.overdueInvoices > 0 && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 w-full mt-1">
                  <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                  <p className="text-[12px] font-semibold text-rose-700">
                    {paymentHealth.overdueInvoices} invoice jatuh tempo belum dibayar
                  </p>
                </div>
              )}
              {paymentHealth.avgDaysToPayment != null && (
                <p className="text-[11px] text-slate-400 text-center">
                  Rata-rata pembayaran: <strong className="text-slate-600">{paymentHealth.avgDaysToPayment} hari</strong> setelah invoice
                </p>
              )}
            </div>
          ) : <p className="text-[12px] text-slate-400 text-center py-8">Belum ada data invoice</p>}
        </div>
      </div>

      {/* ── Row 2: Top suppliers by spend ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

        {/* Spend by supplier */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={ShoppingCart} label="Pembelian per Supplier" sub="Top 8 berdasarkan total nilai PO" />
          {loading ? <SkeletonBlock h="h-48" /> : (
            <div className="flex flex-col gap-2.5 mt-1">
              {(spend?.spendBySupplier ?? []).slice(0, 8).map((s, i) => {
                const max = spend!.spendBySupplier[0].amount;
                return (
                  <div key={s.supplierId} className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 w-4 shrink-0 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-semibold text-navy-900 font-serif truncate">{s.name}</span>
                        <span className="text-[11px] tabular-nums text-slate-600 shrink-0 ml-2">Rp {fmtCompact(s.amount)}</span>
                      </div>
                      <MiniBar value={s.amount} max={max}
                        color={i === 0 ? "bg-gold-500" : i < 3 ? "bg-navy-600" : "bg-slate-300"} />
                    </div>
                  </div>
                );
              })}
              {(spend?.spendBySupplier.length ?? 0) === 0 && (
                <p className="text-[12px] text-slate-400 text-center py-6">Belum ada data</p>
              )}
            </div>
          )}
        </div>

        {/* Concentration */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={Zap} label="Konsentrasi Spend" sub="Pareto & Herfindahl–Hirschman Index" />
          {loading ? <SkeletonBlock h="h-48" /> : concentration ? (
            <div className="flex flex-col gap-4 mt-2">
              <ConcentrationBadge result={concentration} />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">
                    <Tooltip term="Pareto (20% supplier)" label="Aturan Pareto — berapa persen total pembelian yang berasal dari 20% supplier teratas." />
                  </p>
                  <p className="text-3xl font-bold text-navy-900 font-serif mt-1">{concentration.paretoPercent}%</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">dari total pembelian</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">
                    <Tooltip term="HHI Index" label="Herfindahl–Hirschman Index — Indeks Diversifikasi Supplier. &lt;1.500 = baik, 1.500–2.500 = sedang, &gt;2.500 = terlalu terpusat." />
                  </p>
                  <p className={cn(
                    "text-3xl font-bold font-serif mt-1",
                    concentration.hhi >= 2500 ? "text-rose-600" : concentration.hhi >= 1500 ? "text-amber-600" : "text-green-600"
                  )}>{concentration.hhi}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">0 – 10.000</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                {concentration.hhiLabel === "High" && (
                  <><AlertTriangle size={11} className="inline text-rose-500 mr-1" />
                  Pembelian sangat terkonsentrasi. Pertimbangkan diversifikasi supplier untuk mengurangi risiko ketergantungan.</>
                )}
                {concentration.hhiLabel === "Moderate" && (
                  "Diversifikasi pembelian moderat. Ada ruang untuk memperluas supplier pada kategori utama."
                )}
                {concentration.hhiLabel === "Low" && (
                  "Pembelian terdistribusi dengan baik. Portfolio supplier sudah terdiversifikasi."
                )}
              </div>
            </div>
          ) : <p className="text-[12px] text-slate-400 text-center py-8">Belum ada data</p>}
        </div>

        {/* Best supplier highlight */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={Trophy} label="Top Supplier" sub="Berdasarkan nilai kecocokan tertinggi" />
          {loading ? <SkeletonBlock h="h-48" /> : supplierScores.length > 0 ? (
            <div className="flex flex-col gap-3">
              {supplierScores.slice(0, 3).map((s) => (
                <div key={s.supplierId} className={cn(
                  "rounded-xl border p-4",
                  s.rank === 1 ? "bg-gradient-to-br from-navy-900 to-navy-700 border-navy-600" : "bg-slate-50 border-slate-100"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn(
                          "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold shrink-0",
                          s.rank === 1 ? "bg-gold-400 text-navy-900" : "bg-slate-200 text-slate-600"
                        )}>{s.rank}</span>
                        <p className={cn("font-bold font-serif text-[13px] truncate", s.rank === 1 ? "text-white" : "text-navy-900")}>
                          {s.supplierName}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                          s.rank === 1 ? "bg-white/10 text-gold-400" : "bg-slate-100 text-slate-500")}>
                          <Tooltip
                            term={`Kecocokan ${s.ahpScore.toFixed(3)}`}
                            label="Nilai Kecocokan (Ci) — mendekati 1 berarti supplier paling sesuai di semua kriteria."
                          />
                        </span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                          s.rank === 1 ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500")}>
                          {s.avgLeadTimeDays != null ? `${s.avgLeadTimeDays}h lead` : "—"}
                        </span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                          s.rank === 1 ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500")}>
                          {Math.round(s.onTimeRate * 100)}% on-time
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-slate-400 text-center py-8">Belum ada skor</p>}
        </div>
      </div>

      {/* ── Row 3: Full AHP+TOPSIS supplier table ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <SectionTitle icon={Brain}
            label="Penilaian Supplier"
            sub="Semua supplier diranking berdasarkan 5 kriteria terbobot" />
        </div>
        <AhpMethodNote />
        <div className="mt-4">
          {loading ? <SkeletonBlock h="h-64" /> : <SupplierRankTable scores={supplierScores} />}
        </div>
      </div>

      {/* ── Row 4: Lead time (full-width) ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
        <SectionTitle icon={Clock}
          label="Estimasi Pengiriman Aktual vs Target"
          sub="Selisih hari antara tanggal pesanan dan tanggal barang diterima" />
        {loading ? <SkeletonBlock h="h-48" /> : <LeadTimeTable data={leadTimes} />}
      </div>

      {/* ── Row 5: Supplier Rankings — Risk Detection + AHP 4 presets ────────── */}
      <div className="mb-5">
        {/* section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-900 to-navy-600 flex items-center justify-center shrink-0">
              <Brain size={13} className="text-gold-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">Perankingan Supplier — AI & AHP</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">AHP-TOPSIS (Seimbang, Urgensi Tinggi, Prioritas Budget, Fokus Kualitas)</p>
            </div>
          </div>
          <div className="flex-1 h-px bg-slate-100" />
          <button
            onClick={fetchRankings}
            disabled={rankLoading}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-navy-700 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={rankLoading ? "animate-spin" : ""} />
            {rankLoading ? "Memproses..." : "Refresh Rankings"}
          </button>
        </div>

        {/* Risk Detection — full-width table (commented out until backend returns data)
        <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-rose-400 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-navy-900 to-navy-700 flex items-center justify-center shrink-0">
              <Zap size={11} className="text-gold-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-bold text-navy-900 text-[14px] leading-none">Risk Detection</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">XGBoost · dilatih dari data ERP terbaru · diurutkan dari risiko tertinggi</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 shrink-0">
              XGBoost
            </span>
          </div>
          <RiskRankingTable rows={riskRows} loading={rankLoading} />
        </div>
        */}

        {/* AHP 4 presets — 2×2 grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rankLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 border-l-4 border-l-slate-200 overflow-hidden bg-white shadow-sm">
                  <div className="h-[52px] bg-slate-50 border-b border-slate-100 animate-pulse" />
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="animate-pulse h-8 bg-slate-100 rounded" />
                    ))}
                  </div>
                </div>
              ))
            : ahpRankings.map((preset) => (
                <AhpPresetTable key={preset.key} preset={preset} loading={rankLoading} />
              ))
          }
        </div>
      </div>

      {/* ── Footer nav ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link href="/pembelian/po">
          <Button variant="secondary" size="sm">
            <ArrowRight size={12} />
            Purchase Order
          </Button>
        </Link>
        <Link href="/pembelian/supplier">
          <Button variant="secondary" size="sm">
            <ArrowRight size={12} />
            Data Supplier
          </Button>
        </Link>
        <Link href="/rekomendasi">
          <Button variant="ghost" size="sm">
            <Brain size={12} />
            Kalkulator Rekomendasi AI
          </Button>
        </Link>
      </div>

    </AppShell>
  );
}
