"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Trophy, ShoppingCart, Clock, CreditCard,
  BarChart2, Package, Zap, Info, ArrowRight,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout";
import { Button, Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/utils";

import {
  getPurchaseOrders, getPurchaseOrderDetails,
} from "@/lib/services/po.service";
import { getSuppliers }         from "@/lib/services/supplier.service";
import { getGoodsReceipts }     from "@/lib/services/gr.service";
import { getPurchaseInvoices }  from "@/lib/services/purchase-invoice.service";
import { getPurchasePayments }  from "@/lib/services/purchase-payment.service";
import { getSupplierProducts }  from "@/lib/services/supplier-product.service";

import {
  calcSpendSummary,
  calcLeadTimeStats,
  calcPaymentHealth,
  calcSupplierScores,
  calcReorderCandidates,
  calcSpendConcentration,
  type SpendSummary,
  type LeadTimeStats,
  type PaymentHealthStats,
  type SupplierScore,
  type ReorderCandidate,
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
  label: string; value: string; sub?: string;
  trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">{label}</p>
      <p className={cn("text-2xl font-bold font-serif leading-tight", color)}>{value}</p>
      {sub && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          {trend === "up"   && <TrendingUp  size={11} className="text-green-500" />}
          {trend === "down" && <TrendingDown size={11} className="text-rose-500" />}
          {trend === "neutral" && <Minus size={11} className="text-slate-400" />}
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

function SpendBarChart({ data }: { data: SpendSummary["spendByMonth"] }) {
  if (data.length === 0) return <p className="text-[12px] text-slate-400 text-center py-8">Tidak ada data periode</p>;
  const max = Math.max(...data.map((d) => d.amount), 1);
  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(n);
  return (
    <div className="flex items-end gap-2 h-40 pt-2">
      {data.map((d) => {
        const pct = Math.max(4, Math.round((d.amount / max) * 100));
        return (
          <div key={d.month} className="flex flex-col items-center gap-1 flex-1 min-w-0" title={`${d.month}: ${fmt(d.amount)}`}>
            <span className="text-[9px] text-slate-400 hidden sm:block truncate w-full text-center">
              {fmt(d.amount)}
            </span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-navy-900 to-navy-600 transition-all duration-700"
              style={{ height: `${pct}%` }}
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.month}</span>
          </div>
        );
      })}
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
            {["#", "Supplier", "Skor Ci", "Lead Time", "On-Time", "Spend", "Orders"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif whitespace-nowrap">
                {h}
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
                  <span className="tabular-nums font-bold text-slate-700 w-12 shrink-0">{s.ahpScore.toFixed(4)}</span>
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
                  <p className="text-[10px] text-slate-400">katalog: {s.catalogLeadTime}h</p>
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
    return <p className="text-[12px] text-slate-400 text-center py-8">Data GR belum cukup untuk menghitung lead time</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {["Supplier", "Aktual (avg)", "Katalog", "Delta", "# GR"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif whitespace-nowrap">
                {h}
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
                  {delta == null ? "—" : delta > 0 ? `+${delta}h` : `${delta}h`}
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

// ─── Reorder candidates table ─────────────────────────────────────────────────

function ReorderTable({ data }: { data: ReorderCandidate[] }) {
  if (data.length === 0)
    return <p className="text-[12px] text-slate-400 text-center py-8">Semua stok dalam kondisi aman</p>;

  const maxUrgency = Math.max(...data.map((d) => d.urgencyScore), 1);
  const fmtRp = (v: number | null) =>
    v != null ? new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v) : "—";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {["Produk", "Supplier", "Stok", "Lead Time", "Harga Terakhir", "Urgensi"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 font-serif whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((r) => (
            <tr key={`${r.productId}-${r.supplierId}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-3">
                <p className="font-semibold text-navy-900 font-serif">{r.productName}</p>
                <p className="text-[10px] text-slate-400 font-mono">#{r.productId}</p>
              </td>
              <td className="px-3 py-3 text-slate-600">{r.supplierName}</td>
              <td className="px-3 py-3">
                <span className={cn(
                  "font-bold tabular-nums",
                  r.availableStock === 0 ? "text-rose-600"
                  : r.availableStock <= 10 ? "text-amber-600"
                  : "text-slate-600"
                )}>
                  {r.availableStock === 0 ? "Habis" : r.availableStock}
                </span>
              </td>
              <td className="px-3 py-3 tabular-nums text-slate-600">
                {r.catalogLeadTime != null ? `${r.catalogLeadTime} hari` : "—"}
              </td>
              <td className="px-3 py-3 tabular-nums text-slate-700">
                {r.lastPrice != null ? `Rp ${fmtRp(r.lastPrice)}` : "—"}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <MiniBar value={r.urgencyScore} max={maxUrgency}
                    color={r.urgencyScore >= 70 ? "bg-rose-500" : r.urgencyScore >= 40 ? "bg-amber-400" : "bg-blue-400"}
                  />
                  <span className={cn(
                    "text-[11px] font-bold tabular-nums shrink-0 w-6",
                    r.urgencyScore >= 70 ? "text-rose-600" : r.urgencyScore >= 40 ? "text-amber-600" : "text-blue-600"
                  )}>
                    {r.urgencyScore}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold", c.bg, c.border, c.text)}>
      {result.hhiLabel === "High" && <AlertTriangle size={11} />}
      {result.hhiLabel} Concentration
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
    { label: "Lead Time",    weight: "30%", type: "Cost",    desc: "Waktu pengiriman aktual rata-rata" },
    { label: "On-Time Rate", weight: "25%", type: "Benefit", desc: "% pengiriman tepat waktu vs katalog" },
    { label: "Harga",        weight: "20%", type: "Cost",    desc: "Rata-rata harga katalog supplier" },
    { label: "Spend Share",  weight: "15%", type: "Benefit", desc: "Kontribusi spend terhadap total" },
    { label: "Order Count",  weight: "10%", type: "Benefit", desc: "Volume transaksi histori" },
  ];
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-blue-700 leading-relaxed">
          Skor supplier dihitung dengan <strong>AHP + TOPSIS</strong>. Bobot kriteria ditetapkan via matriks
          perbandingan berpasangan AHP. TOPSIS meranking berdasarkan jarak ke solusi ideal positif (A⁺)
          dan negatif (A⁻) — skor <em>Ci</em> mendekati 1 = terbaik.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {criteria.map((c) => (
          <div key={c.label} className="bg-white border border-blue-100 rounded-lg px-3 py-2 text-[11px]">
            <span className="font-bold text-navy-900">{c.label}</span>
            <span className="text-slate-400 mx-1">·</span>
            <span className="font-bold text-blue-600">{c.weight}</span>
            <span className={cn("ml-1 text-[10px] font-bold", c.type === "Benefit" ? "text-green-600" : "text-rose-500")}>
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

  const [spend,        setSpend]        = useState<SpendSummary | null>(null);
  const [leadTimes,    setLeadTimes]    = useState<LeadTimeStats[]>([]);
  const [paymentHealth, setPaymentHealth] = useState<PaymentHealthStats | null>(null);
  const [supplierScores, setSupplierScores] = useState<SupplierScore[]>([]);
  const [reorderList,  setReorderList]  = useState<ReorderCandidate[]>([]);
  const [concentration, setConcentration] = useState<ConcentrationResult | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, poDetailRes, supplierRes, grRes, invoiceRes, paymentRes, spRes] =
        await Promise.allSettled([
          getPurchaseOrders(),
          getPurchaseOrderDetails(),
          getSuppliers(),
          getGoodsReceipts(),
          getPurchaseInvoices(),
          getPurchasePayments(),
          getSupplierProducts(),
        ]);

      const norm = <T,>(r: PromiseSettledResult<any>): T[] =>
        r.status === "fulfilled" ? (Array.isArray(r.value) ? r.value : r.value?.data ?? []) : [];

      const pos         = norm<any>(poRes);
      const poDetails   = norm<any>(poDetailRes);
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
      setReorderList(calcReorderCandidates(supProducts, normSuppliers, poDetails));
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Insight fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
            Skor supplier AHP+TOPSIS, analitik spend, lead time aktual vs katalog,
            kesehatan pembayaran, dan kandidat reorder — semua dari data transaksi nyata.
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
            <KpiCard label="Total Spend" value={`Rp ${fmtCompact(spend.totalSpend)}`}
              sub={`${spend.totalOrders} purchase order`} trend="up" />
            <KpiCard label="Avg Order Value" value={`Rp ${fmtCompact(spend.avgOrderValue)}`}
              sub="per PO rata-rata" trend="neutral" />
            <KpiCard label="PO Disetujui" value={String(spend.totalApproved)}
              sub={`${spend.totalPending} pending · ${spend.totalCancelled} batal`}
              trend={spend.totalPending > 5 ? "down" : "up"}
              color={spend.totalApproved > 0 ? "text-green-600" : "text-slate-700"} />
            <KpiCard label="Supplier Aktif" value={String(spend.spendBySupplier.length)}
              sub={concentration ? `HHI ${concentration.hhi} — ${concentration.hhiLabel}` : ""}
              trend="neutral" />
          </>
        ) : null}
      </div>

      {/* ── Row 1: Spend chart + Concentration + Payment ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

        {/* Monthly spend bar chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={BarChart2} label="Spend Bulanan" sub="Total pembelian per bulan" />
          {loading ? <SkeletonBlock h="h-40" /> : <SpendBarChart data={spend?.spendByMonth ?? []} />}
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
          <SectionTitle icon={ShoppingCart} label="Spend per Supplier" sub="Top 8 berdasarkan total nilai PO" />
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
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">Pareto (20% supplier)</p>
                  <p className="text-3xl font-bold text-navy-900 font-serif mt-1">{concentration.paretoPercent}%</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">dari total spend</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif">HHI Index</p>
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
                  Spend sangat terkonsentrasi. Pertimbangkan diversifikasi supplier untuk mengurangi risiko ketergantungan.</>
                )}
                {concentration.hhiLabel === "Moderate" && (
                  "Konsentrasi spend moderat. Ada ruang untuk mendiversifikasi supplier pada kategori utama."
                )}
                {concentration.hhiLabel === "Low" && (
                  "Spend terdistribusi dengan baik. Portfolio supplier sudah terdiversifikasi."
                )}
              </div>
            </div>
          ) : <p className="text-[12px] text-slate-400 text-center py-8">Belum ada data</p>}
        </div>

        {/* Best supplier highlight */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={Trophy} label="Top Supplier" sub="Berdasarkan skor AHP+TOPSIS" />
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
                          Ci {s.ahpScore.toFixed(3)}
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
            label="Perankingan Supplier — AHP + TOPSIS"
            sub="Semua supplier diranking berdasarkan 5 kriteria terbobot" />
        </div>
        <AhpMethodNote />
        <div className="mt-4">
          {loading ? <SkeletonBlock h="h-64" /> : <SupplierRankTable scores={supplierScores} />}
        </div>
      </div>

      {/* ── Row 4: Lead time + Reorder ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">

        {/* Lead time */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={Clock}
            label="Lead Time Aktual vs Katalog"
            sub="Selisih hari antara tanggal PO dan tanggal GR" />
          {loading ? <SkeletonBlock h="h-48" /> : <LeadTimeTable data={leadTimes} />}
        </div>

        {/* Reorder */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={Package}
            label="Kandidat Reorder"
            sub="Produk stok rendah diurutkan berdasarkan skor urgensi" />
          {loading ? <SkeletonBlock h="h-48" /> : <ReorderTable data={reorderList} />}
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
