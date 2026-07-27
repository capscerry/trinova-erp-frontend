"use client";

import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState ,useMemo} from "react";
import {
  getPurchaseOrders,
  getGoodsReceipts,
  getSuppliers,
  salesOrderService,
  customerService,
  getProducts,
} from "@/lib/services";
import { getSupplierProducts } from "@/lib/services/supplier-product.service";
import { getPurchaseReturns } from "@/lib/services/purchase-return.service";
import { predictAllSuppliers, normalizeRiskLevel } from "@/lib/services/supplier-risk.service";
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
  securityActivityService,
  type SecurityActivityItem,
} from "@/lib/services/security-activity.service";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Clock3,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Shield,
  ShieldX,
  Trophy,
  Brain,
  Zap,
  ChevronRight,
  X,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// â”€â”€â”€ AHP criteria (must match preset matrix column order) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CRITERIA = [
  { id: "avg_price",            label: "Harga Rata-rata",  description: "", weight: 0.2, benefit: false },
  { id: "lead_time",            label: "Lead Time",        description: "", weight: 0.2, benefit: false },
  { id: "on_time_rate",         label: "On-Time Rate",     description: "", weight: 0.2, benefit: true  },
  { id: "delivery_punctuality", label: "Ketepatan Waktu",  description: "", weight: 0.2, benefit: true  },
  { id: "return_rate",          label: "Tingkat Retur",    description: "", weight: 0.2, benefit: false },
];

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(n);

const formatAlertTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return "Baru saja";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} hari lalu`;
  return formatAlertTime(value);
};

// â”€â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface StatCard {
  label: string;
  value: string;
  sub: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

interface ModuleStat {
  module: string;
  color: string;
  barColor: string;
  value: number;
  max: number;
  label: string;
}

type AlertTier = "critical" | "warning" | "info";

const getSecurityMeta = (activityType: string) => {
  switch (activityType) {
    case "unauthorized_access":
      return {
        tier: "critical" as AlertTier,
        label: "Forbidden Access",
        badge: "bg-red-50 text-red-600 border-red-100",
        iconWrap: "bg-red-50 text-red-600 border-red-100",
        accentBar: "bg-red-500",
        icon: ShieldAlert,
      };
    case "login_failed":
      return {
        tier: "critical" as AlertTier,
        label: "Failed Login",
        badge: "bg-red-50 text-red-700 border-red-200",
        iconWrap: "bg-red-50 text-red-700 border-red-200",
        accentBar: "bg-red-500",
        icon: AlertTriangle,
      };
    case "authentication_required":
      return {
        tier: "warning" as AlertTier,
        label: "Missing Token",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        iconWrap: "bg-amber-50 text-amber-700 border-amber-200",
        accentBar: "bg-amber-400",
        icon: KeyRound,
      };
    default:
      return {
        tier: "info" as AlertTier,
        label: activityType.replaceAll("_", " "),
        badge: "bg-slate-50 text-slate-600 border-slate-100",
        iconWrap: "bg-slate-50 text-slate-600 border-slate-100",
        accentBar: "bg-slate-300",
        icon: ShieldAlert,
      };
  }
};

interface RiskRow {
  supplier_id: number;
  supplier_name: string;
  risk_score: number;
  risk_level: RiskLevel;
}

interface AhpPresetRanking {
  key: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  results: TopsisResult[];
}

// â”€â”€â”€ build TOPSIS alternatives from ERP data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildAlternatives(
  suppliers: any[],
  pos: any[],
  grs: any[],
  returns: any[],
  supplierProducts: any[],
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
    const avgPrice   = a.prices.length > 0 ? a.prices.reduce((s,v) => s+v, 0) / a.prices.length : 0;
    const avgLead    = a.actualDays.length > 0
      ? a.actualDays.reduce((s,v) => s+v, 0) / a.actualDays.length
      : a.catalogDays.length > 0 ? a.catalogDays.reduce((s,v) => s+v, 0) / a.catalogDays.length : 14;
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

// â”€â”€â”€ mini bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// â”€â”€â”€ risk level helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RISK_CFG: Record<RiskLevel, { label: string; barColor: string; textColor: string; badgeClass: string; icon: typeof ShieldCheck }> = {
  Low:      { label: "Low",      barColor: "bg-emerald-400", textColor: "text-emerald-700", badgeClass: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: ShieldCheck },
  Medium:   { label: "Medium",   barColor: "bg-amber-400",   textColor: "text-amber-700",   badgeClass: "bg-amber-50  border-amber-200  text-amber-700",   icon: Shield      },
  High:     { label: "High",     barColor: "bg-orange-400",  textColor: "text-orange-700",  badgeClass: "bg-orange-50 border-orange-200 text-orange-700",  icon: ShieldAlert },
  Critical: { label: "Critical", barColor: "bg-rose-500",    textColor: "text-rose-700",    badgeClass: "bg-rose-50   border-rose-200   text-rose-700",    icon: ShieldX     },
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_CFG[level];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0", cfg.badgeClass)}>
      <Icon size={9} />{cfg.label}
    </span>
  );
}

// â”€â”€â”€ rank medal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-linear-to-br from-yellow-400 to-yellow-600 text-white text-[10px] font-extrabold shadow-sm shrink-0">
      1
    </span>
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

// â”€â”€â”€ Risk Ranking widget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RiskRankingWidget({ rows, loading }: { rows: RiskRow[]; loading: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 to-slate-800">
        <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
          <Brain size={13} className="text-rose-300" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white leading-none">Risk Detection</p>
          <p className="text-[10px] text-slate-400 mt-0.5">XGBoost - delay probability score</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-slate-100 bg-white text-[10px] font-semibold">
        <span className="text-emerald-700">Low</span>
        <span className="text-amber-700">Medium</span>
        <span className="text-orange-700">High</span>
        <span className="text-rose-700">Critical</span>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[28px_1fr_72px_90px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">#</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Supplier</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-right">Skor</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-right">Level</span>
      </div>

      {/* body */}
      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse h-8 bg-slate-100 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Zap size={18} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs text-slate-400">Belum ada data risiko</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {rows.map((r, i) => {
            const cfg = RISK_CFG[r.risk_level];
            return (
              <div key={r.supplier_id} className="grid grid-cols-[28px_1fr_72px_90px] gap-2 items-center px-4 py-2.5 hover:bg-slate-50 transition-colors">
                <RankMedal rank={i + 1} />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800 truncate">{r.supplier_name}</p>
                  <div className="mt-1 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", cfg.barColor)} style={{ width: `${Math.round(r.risk_score * 100)}%` }} />
                  </div>
                </div>
                <p className={cn("text-[12px] font-bold tabular-nums text-right", cfg.textColor)}>
                  {(r.risk_score * 100).toFixed(1)}%
                </p>
                <div className="flex justify-end">
                  <RiskBadge level={r.risk_level} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ AHP preset ranking card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PRESET_STYLE: Record<string, { header: string; accent: string; badge: string }> = {
  balanced:        { header: "from-navy-900 to-slate-800", accent: "text-slate-300", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  urgency_high:    { header: "from-navy-900 to-slate-800", accent: "text-slate-300", badge: "bg-red-50 text-red-700 border-red-200" },
  budget_priority: { header: "from-navy-900 to-slate-800", accent: "text-slate-300", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  quality_focus:   { header: "from-navy-900 to-slate-800", accent: "text-slate-300", badge: "bg-blue-50 text-blue-700 border-blue-200" },
};

function AhpPresetCard({ preset, loading }: { preset: AhpPresetRanking; loading: boolean }) {
  const style = PRESET_STYLE[preset.key] ?? PRESET_STYLE.balanced;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* header */}
      <div className={cn("flex items-center gap-2.5 px-5 py-3.5 bg-linear-to-r", style.header)}>
        <span className="text-lg leading-none">{preset.icon}</span>
        <div>
          <p className="text-[13px] font-bold text-white leading-none">{preset.label}</p>
          <p className={cn("text-[10px] mt-0.5 truncate max-w-50", style.accent)}>{preset.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-slate-100 bg-white text-[10px] font-semibold">
        <span className="text-emerald-700">Low</span>
        <span className="text-amber-700">Medium</span>
        <span className="text-orange-700">High</span>
        <span className="text-rose-700">Critical</span>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[28px_1fr_90px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">#</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Supplier</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-right">Skor Ci</span>
      </div>

      {/* body */}
      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse h-8 bg-slate-100 rounded-lg" />
          ))}
        </div>
      ) : preset.results.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Trophy size={18} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs text-slate-400">Belum ada data ERP</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {preset.results.slice(0, 7).map((r) => {
            const pct = Math.round(r.score * 100);
            const barColor = pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";
            return (
              <div key={r.alternativeId} className="grid grid-cols-[28px_1fr_90px] gap-2 items-center px-4 py-2.5 hover:bg-slate-50 transition-colors">
                <RankMedal rank={r.rank} />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800 truncate">{r.name}</p>
                  <div className="mt-1 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <p className="text-[12px] font-bold tabular-nums text-slate-700 text-right">{r.score.toFixed(4)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading]           = useState(true);
  const [rankLoading, setRankLoading]   = useState(true);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  // stat cards
  const [stats, setStats]               = useState<StatCard[]>([]);
    // module bars
  const [moduleBars, setModuleBars] = useState<ModuleStat[]>([]);
  // recent SO / PO
  const [recentSO, setRecentSO] = useState<{ nomor: string; pelanggan: string; total: number; status: string }[]>([]);
  const [recentPO, setRecentPO] = useState<{ nomor: string; supplier: string; total: number; status: string }[]>([]);
    const [securityAlerts, setSecurityAlerts] = useState<SecurityActivityItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SecurityActivityItem | null>(null);

  useEffect(() => {
    if (!selectedAlert) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAlert(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedAlert]);

  const severityCounts = useMemo(() => {
    return securityAlerts.reduce(
      (acc, alert) => {
        const tier = getSecurityMeta(alert.activityType).tier;
        acc[tier] += 1;
        return acc;
      },
      { critical: 0, warning: 0, info: 0 } as Record<AlertTier, number>
    );
  }, [securityAlerts]);

  // AI rankings
  const [riskRows, setRiskRows]         = useState<RiskRow[]>([]);
  const [ahpRankings, setAhpRankings]   = useState<AhpPresetRanking[]>([]);

  // â”€â”€ fetch ERP stats (stat cards, module bars, recent tables) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [poRes, grRes, supplierRes, soList, customerList, productRes, securityRes] =
        await Promise.allSettled([
          getPurchaseOrders(),
          getGoodsReceipts(),
          getSuppliers(),
          salesOrderService.getAll(),
          customerService.getAll(),
          getProducts(),
          securityActivityService.getAlerts(12),
        ]);

      const poList: any[]   = poRes.status       === "fulfilled" ? (Array.isArray(poRes.value)       ? poRes.value       : poRes.value?.data       ?? []) : [];
      const grList: any[]   = grRes.status       === "fulfilled" ? (Array.isArray(grRes.value)       ? grRes.value       : grRes.value?.data       ?? []) : [];
      const supList: any[]  = supplierRes.status === "fulfilled" ? (Array.isArray(supplierRes.value) ? supplierRes.value : supplierRes.value?.data ?? []) : [];
      const soArr: any[]    = soList.status       === "fulfilled" ? soList.value       : [];
      const custArr: any[]  = customerList.status === "fulfilled" ? customerList.value : [];
      const prodList: any[] = productRes.status === "fulfilled" ? (Array.isArray(productRes.value) ? productRes.value : productRes.value?.data ?? []) : [];
      const securityArr: SecurityActivityItem[] = securityRes.status === "fulfilled" ? securityRes.value : [];

      const totalPembelian = poList.reduce((s: number, i: any) => s + Number(i.total_amount ?? i.totalAmount ?? 0), 0);
      const totalPenjualan = soArr.reduce((s: number, i: any) => s + Number(i.total ?? i.subTotal ?? 0), 0);
      const pendingPO      = poList.filter((i: any) => i.status === "Draft" || i.status === "Waiting to be processed").length;
      const pendingSO      = soArr.filter((i: any) => i.status === "Draft" || i.status === "Dikonfirmasi").length;

      setStats([
        { label: "Total Penjualan", value: `Rp ${fmt(totalPenjualan)}`, sub: `${soArr.length} sales order`, change: "+12%", trend: "up", icon: TrendingUp, color: "text-white", iconBg: "bg-white/10 border-white/15" },
        { label: "Total Pembelian", value: `Rp ${fmt(totalPembelian)}`, sub: `${poList.length} purchase order`, change: "+8%", trend: "up", icon: ShoppingCart, color: "text-navy-700", iconBg: "bg-slate-100 border-slate-200" },
        { label: "Customer Aktif", value: String(custArr.filter((c: any) => c.status === "Aktif" || c.isActive).length || custArr.length), sub: `${custArr.length} total terdaftar`, change: "+3", trend: "up", icon: Users, color: "text-navy-700", iconBg: "bg-slate-100 border-slate-200" },
        { label: "Supplier Aktif", value: String(supList.filter((s: any) => s.isActive !== false).length || supList.length), sub: `${supList.length} total terdaftar`, change: "+1", trend: "up", icon: Building2, color: "text-navy-700", iconBg: "bg-slate-100 border-slate-200" },
        { label: "Goods Receipt", value: String(grList.length), sub: "Penerimaan barang", change: "+4", trend: "up", icon: Truck, color: "text-navy-700", iconBg: "bg-slate-100 border-slate-200" },
        { label: "PO Pending", value: String(pendingPO), sub: "Menunggu proses", change: pendingPO > 5 ? "+2" : "-1", trend: pendingPO > 5 ? "down" : "up", icon: Clock3, color: pendingPO > 5 ? "text-red-700" : "text-amber-700", iconBg: pendingPO > 5 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200" },
        { label: "SO Pending", value: String(pendingSO), sub: "Belum selesai diproses", change: pendingSO > 5 ? "+2" : "-1", trend: pendingSO > 5 ? "down" : "up", icon: BarChart2, color: pendingSO > 5 ? "text-red-700" : "text-amber-700", iconBg: pendingSO > 5 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200" },
        { label: "Total Produk", value: String(prodList.length), sub: "Goods & service", change: "0", trend: "neutral", icon: Package, color: "text-navy-700", iconBg: "bg-slate-100 border-slate-200" },
      ]);

      const maxVal = Math.max(soArr.length, poList.length, grList.length, custArr.length, 1);
      setModuleBars([
        { module: "Sales Order", color: "text-slate-700", barColor: "bg-navy-700", value: soArr.length, max: maxVal, label: `${soArr.length} transaksi` },
        { module: "Purchase Order", color: "text-slate-700", barColor: "bg-navy-700", value: poList.length, max: maxVal, label: `${poList.length} transaksi` },
        { module: "Goods Receipt", color: "text-slate-700", barColor: "bg-navy-700", value: grList.length, max: maxVal, label: `${grList.length} penerimaan` },
        { module: "Customer", color: "text-slate-700", barColor: "bg-slate-500", value: custArr.length, max: maxVal, label: `${custArr.length} customer` },
        { module: "Supplier", color: "text-slate-700", barColor: "bg-slate-500", value: supList.length, max: maxVal, label: `${supList.length} supplier` },
      ]);

      setRecentSO(soArr.slice(0, 5).map((i: any) => ({
        nomor:     i.nomor     ?? i.soNumber  ?? "-",
        pelanggan: i.pelanggan ?? i.customerName ?? "-",
        total:     i.total     ?? i.subTotal  ?? 0,
        status:    i.status    ?? "-",
      })));
      setRecentPO(poList.slice(0, 5).map((i: any) => ({
        nomor:    i.poNumber    ?? i.po_number    ?? "-",
        supplier: i.supplierName ?? i.supplier_name ?? "-",
        total:    Number(i.total_amount ?? i.totalAmount ?? 0),
        status:   i.status ?? "-",
      })));

      setSecurityAlerts(securityArr);

      setLastUpdated(new Date());
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€ fetch AI rankings (risk + AHP) â€” runs in parallel with fetchAll â”€â”€â”€â”€â”€
  const fetchRankings = async () => {
    setRankLoading(true);
    try {
      const norm = (r: any) => Array.isArray(r) ? r : r?.data ?? [];

      const [suppRes, poRes, grRes, retRes, spRes, riskRes] = await Promise.allSettled([
        getSuppliers(),
        getPurchaseOrders(),
        getGoodsReceipts(),
        getPurchaseReturns(),
        getSupplierProducts(),
        predictAllSuppliers(),
      ]);

      // â”€â”€ supplier name map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const suppliers = suppRes.status === "fulfilled" ? norm(suppRes.value) : [];
      const nameMap   = new Map<number, string>(
        suppliers.map((s: any) => [
          Number(s.supplier_id ?? s.id),
          String(s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id ?? s.id}`),
        ])
      );

      // â”€â”€ risk rows: sorted high â†’ low risk score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ AHP preset rankings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const pos      = poRes.status  === "fulfilled" ? norm(poRes.value)  : [];
      const grs      = grRes.status  === "fulfilled" ? norm(grRes.value)  : [];
      const returns  = retRes.status === "fulfilled" ? norm(retRes.value) : [];
      const sps      = spRes.status  === "fulfilled" ? norm(spRes.value)  : [];

      if (suppliers.length > 0) {
        const alts = buildAlternatives(suppliers, pos, grs, returns, sps);

        const rankings: AhpPresetRanking[] = PRIORITY_PRESETS.map((preset) => {
          const { result } = applyPreset(preset.key as any);
          const criteria   = CRITERIA.map((c, i) => ({ ...c, weight: result.weights[i] }));
          const results    = topsis(alts, criteria);
          return {
            key:         preset.key,
            label:       preset.label,
            icon:        preset.icon,
            color:       preset.color,
            description: preset.description,
            results,
          };
        });
        setAhpRankings(rankings);
      }
    } catch (e) {
      console.error("Rankings fetch error:", e);
    } finally {
      setRankLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchRankings();
  }, []);

  // â”€â”€ status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // â”€â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <AppShell title="Dashboard" subtitle="Overview sistem Trinova Business Suite">

      {/* â”€â”€ Header row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-slate-500 text-sm">
          Selamat datang,{" "}
          <span className="font-semibold text-slate-700">{user?.username}</span>
        </p>
        <button
          onClick={() => { fetchAll(); fetchRankings(); }}
          disabled={loading || rankLoading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={(loading || rankLoading) ? "animate-spin" : ""} />
          {lastUpdated
            ? `Update: ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
            : "Refresh"}
        </button>
      </div>

      {/* â”€â”€ Stat Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-28 shadow-sm" />
            ))
          : stats.map((s) => {
              const Icon     = s.icon;
              const isUp     = s.trend === "up";
              const isNeutral = s.trend === "neutral";
              return (
                <div
                  key={s.label}
                  className={cn(
                    "rounded-xl border p-5 shadow-sm transition-all duration-150 hover:shadow-md",
                    s.label === "Total Penjualan"
                      ? "xl:col-span-2 bg-navy-900 border-navy-800 text-white"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${s.iconBg}`}>
                      <Icon size={15} className={s.color} />
                    </div>
                    {!isNeutral && (
                      <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {s.change}
                      </div>
                    )}
                  </div>
                  <p className={cn("mt-4 text-2xl font-bold leading-none", s.label === "Total Penjualan" ? "text-white" : "text-slate-900")}>{s.value}</p>
                  <p className={cn("mt-2 text-xs font-semibold uppercase tracking-wide", s.label === "Total Penjualan" ? "text-slate-200" : "text-slate-600")}>{s.label}</p>
                  <p className={cn("mt-1 text-xs", s.label === "Total Penjualan" ? "text-slate-300" : "text-slate-500")}>{s.sub}</p>
                </div>
              );
            })}
      </div>

      {/* â”€â”€ Bottom row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl border border-red-100 bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert size={18} />
              {securityAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Security Alerts</p>
              <p className="text-[11px] text-slate-400">Monitoring login gagal dan percobaan akses tidak sah</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {severityCounts.critical > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {severityCounts.critical} Critical
              </span>
            )}
            {severityCounts.warning > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {severityCounts.warning} Warning
              </span>
            )}
            <span className="inline-flex w-fit items-center rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
              {securityAlerts.length} alert terbaru
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : securityAlerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
              <ShieldCheck size={22} />
            </div>
            <p className="mt-1 text-sm font-bold text-slate-700">Semua Aman</p>
            <p className="max-w-xs text-xs text-slate-400">
              Belum ada login gagal atau percobaan akses role yang ditolak.
            </p>
          </div>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {securityAlerts.map((alert, index) => {
              const meta = getSecurityMeta(alert.activityType);
              const Icon = meta.icon;

              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => setSelectedAlert(alert)}
                  aria-label={`Lihat detail alert: ${meta.label} — ${alert.title}`}
                  style={{ animationDelay: `${index * 30}ms` }}
                  className="alert-card-enter group flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 py-2 pl-3 pr-2.5 text-left transition-colors duration-150 hover:border-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                >
                  <span className={`h-7 w-1 shrink-0 rounded-full ${meta.accentBar}`} />

                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${meta.iconWrap}`}
                    aria-hidden="true"
                  >
                    <Icon size={14} />
                  </span>

                  <span className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${meta.badge}`}>
                    {meta.label}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                    {alert.title}
                  </span>

                  <span
                    className="shrink-0 text-[11px] text-slate-400"
                    title={formatAlertTime(alert.createdAt)}
                  >
                    {formatRelativeTime(alert.createdAt)}
                  </span>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedAlert && (() => {
        const meta = getSecurityMeta(selectedAlert.activityType);
        const Icon = meta.icon;

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedAlert(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Detail alert: ${meta.label}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${meta.iconWrap}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/50">
                    <Icon size={16} />
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-500" title={formatAlertTime(selectedAlert.createdAt)}>
                      {formatRelativeTime(selectedAlert.createdAt)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  aria-label="Tutup"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3 px-5 py-4">
                <p className="text-sm font-bold text-slate-800">{selectedAlert.title}</p>
                <p className="text-xs leading-relaxed text-slate-600">
                  {selectedAlert.description || "Tidak ada detail tambahan"}
                </p>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Users size={12} />
                    <span className="font-semibold text-slate-700">{selectedAlert.userName || "SYSTEM"}</span>
                  </span>
                  {selectedAlert.ipAddress && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Globe size={12} />
                      <code className="font-mono font-semibold text-slate-700">{selectedAlert.ipAddress}</code>
                    </span>
                  )}
                  {selectedAlert.refNumber && (
                    <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                      {selectedAlert.refNumber}
                    </code>
                  )}
                  <span className="ml-auto text-[11px] text-slate-400">
                    {formatAlertTime(selectedAlert.createdAt)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Module Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-1">Aktivitas Modul</p>
          <p className="text-[11px] text-slate-400 mb-5">Volume transaksi per modul</p>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-8 bg-slate-100 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-4">
              {moduleBars.map((m) => (
                <div key={m.module}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${m.color}`}>{m.module}</span>
                    <span className="text-[11px] text-slate-400">{m.label}</span>
                  </div>
                  <MiniBar value={m.value} max={m.max} color={m.barColor} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent SO */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-1">Sales Order Terbaru</p>
          <p className="text-[11px] text-slate-400 mb-4">5 transaksi penjualan terakhir</p>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-lg" />)}</div>
          ) : recentSO.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {recentSO.map((so, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{so.nomor}</p>
                    <p className="text-[10px] text-slate-400 truncate">{so.pelanggan}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <StatusBadge status={so.status} />
                    <p className="text-[10px] font-semibold text-slate-600">Rp {fmt(so.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent PO */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-1">Purchase Order Terbaru</p>
          <p className="text-[11px] text-slate-400 mb-4">5 transaksi pembelian terakhir</p>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-lg" />)}</div>
          ) : recentPO.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {recentPO.map((po, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{po.nomor}</p>
                    <p className="text-[10px] text-slate-400 truncate">{po.supplier}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <StatusBadge status={po.status} />
                    <p className="text-[10px] font-semibold text-slate-600">Rp {fmt(po.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Supplier Rankings */}
      <div className="mt-6 mb-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-gold-400">
              <Brain size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Supplier Rankings - AI & AHP</p>
              <p className="mt-1 text-xs text-slate-500">AI-based supplier performance and risk analysis</p>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 lg:text-right">
            Based on ERP data - XGBoost Risk - AHP-TOPSIS
          </p>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
        <span className="font-semibold text-slate-800">Score legend:</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-green-400" /> Strong</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-amber-400" /> Moderate</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-rose-400" /> Needs review</span>
      </div>

      {/* Risk + AHP row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        {/* Risk Detection - spans 1 col */}
        <div className="xl:col-span-1">
          <RiskRankingWidget rows={riskRows} loading={rankLoading} />
        </div>

        {/* AHP 4 presets - spans 4 cols */}
        <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rankLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="h-14 bg-slate-200 animate-pulse" />
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="animate-pulse h-8 bg-slate-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))
            : ahpRankings.map((preset) => (
                <AhpPresetCard key={preset.key} preset={preset} loading={rankLoading} />
              ))
          }
        </div>

      </div>

    </AppShell>
  );
}









