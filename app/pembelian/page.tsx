"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart, Truck, Clock3, Building2, TrendingUp,
  RefreshCw, ArrowRight, Brain, Trophy, Star, Zap,
  CreditCard, BarChart2, RotateCcw, ChevronRight,
  FileText, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

// -- Services ------------------------------------------------------------------
import {
  fetchPurchasingKpis,
  type PurchasingKpiData,
  type DateFilter,
} from "@/lib/services/purchasing-kpi.service";
import { getSuppliers } from "@/lib/services/supplier.service";

// -- Hooks ---------------------------------------------------------------------
import { useSupplierRecommendations } from "@/lib/hooks/useSupplierRecommendations";

// -- AI preview ----------------------------------------------------------------
import { AhpTopsisBestPreview } from "@/components/modules/pembelian/AhpTopsisBestPreview";

// -- Dashboard components ------------------------------------------------------
import { KpiCard } from "@/components/modules/pembelian/dashboard/KpiCard";
import { SpendTrendChart } from "@/components/modules/pembelian/dashboard/SpendTrendChart";
import { POStatusDonut } from "@/components/modules/pembelian/dashboard/POStatusDonut";
import { MonthlyVolumeBar } from "@/components/modules/pembelian/dashboard/MonthlyVolumeBar";
import { TopSuppliersBar } from "@/components/modules/pembelian/dashboard/TopSuppliersBar";
import { SupplierPerformanceBar } from "@/components/modules/pembelian/dashboard/SupplierPerformanceBar";
import { CategoryPieChart } from "@/components/modules/pembelian/dashboard/CategoryPieChart";
import { LeadTimeTrendChart } from "@/components/modules/pembelian/dashboard/LeadTimeTrendChart";
import { ReturnTrendBar } from "@/components/modules/pembelian/dashboard/ReturnTrendBar";
import { SupplierLeaderboard } from "@/components/modules/pembelian/dashboard/SupplierLeaderboard";
import { SupplierRiskIndicator } from "@/components/modules/pembelian/dashboard/SupplierRiskIndicator";
import { ProcurementFunnel } from "@/components/modules/pembelian/dashboard/ProcurementFunnel";
import { SpendingByCategory } from "@/components/modules/pembelian/dashboard/SpendingByCategory";
import { AIRecommendationSummary } from "@/components/modules/pembelian/dashboard/AIRecommendationSummary";
import { DashboardFilters, type ActiveFilters } from "@/components/modules/pembelian/dashboard/DashboardFilters";
import { ActivityTimeline } from "@/components/modules/dashboard/ActivityTimeline";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2).replace(".", ",")} Jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(1).replace(".", ",")} Rb`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function pctChange(current: number, prev: number): number | undefined {
  if (prev === 0) return undefined;
  return ((current - prev) / prev) * 100;
}

// -----------------------------------------------------------------------------
// Shared chart-card wrapper
// -----------------------------------------------------------------------------

function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Per-preset visual config for the AI hero right panel
// -----------------------------------------------------------------------------

const PRESET_ICON: Record<string, { icon: React.ElementType; iconColor: string }> = {
  balanced:        { icon: BarChart2,  iconColor: "text-slate-300"  },
  urgency_high:    { icon: Zap,        iconColor: "text-rose-300"   },
  budget_priority: { icon: CreditCard, iconColor: "text-amber-300"  },
  quality_focus:   { icon: Trophy,     iconColor: "text-blue-300"   },
};

// -----------------------------------------------------------------------------
// Shared KPI + Chart Dashboard (used by both roles)
// -----------------------------------------------------------------------------

const DEFAULT_FILTER: DateFilter = { range: "last30" };
const PO_STATUSES = [
  "Draft", "Pending Approval", "Approved",
  "Waiting to be processed", "Partially processed",
  "Processed", "Completed", "Cancelled",
];

interface KpiDashboardProps {
  isProcurementManager?: boolean;
}

function KpiDashboard({ isProcurementManager = false }: KpiDashboardProps) {
  const router = useRouter();
  const { dataset: recDataset, loading: recLoading } = useSupplierRecommendations();

  // -- Filter state ------------------------------------------------------------
  const [dateFilter, setDateFilter]     = useState<DateFilter>(DEFAULT_FILTER);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  // -- KPI data state ----------------------------------------------------------
  const [kpiData, setKpiData]   = useState<PurchasingKpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // -- Supplier list for filter dropdown ---------------------------------------
  const [supplierList, setSupplierList] = useState<Array<{ id: number; name: string }>>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);

  // -- Fetch KPI data ----------------------------------------------------------
  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      // Build TOPSIS scores array for supplier KPIs
      const balancedPreset = recDataset?.presets.find((p) => p.key === "balanced");
      const topsisScores = balancedPreset?.rankedSuppliers.map((r) => ({
        id: r.alternativeId,
        score: r.score,
      }));

      const data = await fetchPurchasingKpis(
        dateFilter,
        topsisScores,
        {
          supplierId: activeFilters.supplierId,
          category:   activeFilters.category,
          status:     activeFilters.status,
        }
      );
      setKpiData(data);
    } catch (err) {
      console.error("Gagal memuat KPI dashboard:", err);
    } finally {
      setKpiLoading(false);
    }
  }, [dateFilter, activeFilters, recDataset]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  // -- Fetch filter options once -----------------------------------------------
  useEffect(() => {
    getSuppliers()
      .then((raw: any) => {
        const arr = Array.isArray(raw) ? raw : raw?.data ?? [];
        setSupplierList(arr.map((s: any) => ({
          id:   Number(s.supplier_id ?? s.id),
          name: s.supplier_name ?? s.nama ?? `Supplier ${s.supplier_id ?? s.id}`,
        })));
        const cats = [...new Set<string>(arr.map((s: any) => s.category_supplier ?? "Others").filter(Boolean))];
        setCategoryList(cats);
      })
      .catch(() => {});
  }, []);

  // -- Drill-down navigation helpers -------------------------------------------
  function drillPOStatus(status: string) {
    router.push(`/pembelian/po?status=${encodeURIComponent(status)}`);
  }
  function drillSupplier(supplierId: number) {
    router.push(`/pembelian/supplier?id=${supplierId}`);
  }
  function drillSpendTrend() {
    router.push("/pembelian/invoice");
  }
  function drillFunnel(label: string) {
    const map: Record<string, string> = {
      "PO Created":      "/pembelian/po",
      "Approved":        "/pembelian/po",
      "Goods Received":  "/pembelian/gr",
      "Invoiced":        "/pembelian/invoice",
      "Paid":            "/pembelian/payment",
    };
    router.push(map[label] ?? "/pembelian");
  }

  const k = kpiData?.kpis;
  const c = kpiData?.charts;

  return (
    <div className="space-y-6">
      {/* -- Dashboard header + filters -------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button
          onClick={fetchKpis}
          disabled={kpiLoading}
          className="self-start flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={cn(kpiLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* -- Time range + additional filters -------------------------------- */}
      <DashboardFilters
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        activeFilters={activeFilters}
        onActiveFiltersChange={setActiveFilters}
        suppliers={supplierList}
        categories={categoryList}
        statuses={PO_STATUSES}
        loading={kpiLoading}
      />

      {/* -- AI INSIGHTS HERO ------------------------------------------------- */}
      <Link href="/pembelian/insight" className="block group">
        <div className="rounded-2xl border border-navy-800 bg-gradient-to-r from-navy-900 to-navy-700 p-6 shadow-lg hover:shadow-xl hover:from-navy-800 hover:to-navy-600 transition-all duration-200">
          <div className="flex items-start justify-between gap-6">

            {/* Left - text + AhpTopsisBestPreview cards */}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/15 text-gold-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                <Brain size={11} />
                AI Purchasing Insight
              </div>
              <h2 className="text-xl font-bold text-white font-serif leading-tight">
                Lihat analisis penuh performa pembelian
              </h2>
              <p className="mt-2 text-slate-300 text-[13px] max-w-xl leading-relaxed">
                Skor supplier AHP + TOPSIS, spend bulanan, lead time aktual vs katalog,
                kesehatan pembayaran, konsentrasi HHI, dan kandidat reorder - semua dari
                data transaksi nyata.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-gold-400 text-[13px] font-semibold group-hover:gap-3 transition-all duration-150">
                Buka AI Insight Lebih Lanjut
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
              {/* Supplier winner cards - shared singleton, no re-fetch */}
              <AhpTopsisBestPreview />
            </div>

            {/* Right - live preset pills (desktop only) */}
            <div className="hidden lg:flex flex-col gap-2.5 shrink-0 min-w-[220px]">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400">
                  Supplier Terbaik ┬╖ AHP+TOPSIS
                </p>
                {recLoading && (
                  <RefreshCw size={10} className="text-slate-400 animate-spin" />
                )}
              </div>

              {recLoading && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 animate-pulse h-[52px]" />
              ))}

              {!recLoading && recDataset && recDataset.presets.map((preset) => {
                const top = preset.rankedSuppliers.find(
                  (r) => r.score != null && !Number.isNaN(r.score) && r.score > 0
                );
                const cfg = PRESET_ICON[preset.key] ?? PRESET_ICON.balanced;
                const Icon = cfg.icon;
                return (
                  <div
                    key={preset.key}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Icon size={13} className={cfg.iconColor} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest truncate">
                        {preset.label}
                      </p>
                      <p className="text-white text-[13px] font-semibold font-serif truncate leading-tight mt-0.5">
                        {top?.name ?? "Belum ada data"}
                      </p>
                    </div>
                    {top && (
                      <span className="text-[11px] font-bold tabular-nums text-gold-400 shrink-0">
                        {(top.score * 100).toFixed(3)}
                      </span>
                    )}
                  </div>
                );
              })}

              {!recLoading && !recDataset && (
                <>
                  {[
                    { icon: Trophy,    iconColor: "text-gold-400",  label: "Supplier Terbaik", sub: "Skor AHP + TOPSIS" },
                    { icon: TrendingUp,iconColor: "text-green-400", label: "Spend Bulanan",    sub: "Trend & Pareto HHI" },
                    { icon: Building2, iconColor: "text-blue-400",  label: "Lead Time",        sub: "Aktual vs Katalog" },
                  ].map(({ icon: Icon, iconColor, label, sub }) => (
                    <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0`}>
                        <Icon size={13} className={iconColor} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{label}</p>
                        <p className="text-white text-[13px] font-semibold font-serif">{sub}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

          </div>
        </div>
      </Link>

      {/* -- KPI CARDS ROW ---------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Purchase Orders"
          value={kpiLoading ? "-" : String(k?.totalPO ?? 0)}
          subValue="Periode ini"
          change={k ? pctChange(k.totalPO, k.totalPOPrevMonth) : undefined}
          changeSuffix="vs periode lalu"
          icon={ShoppingCart}
          accentColor="blue"
          loading={kpiLoading}
          onClick={() => router.push("/pembelian/po")}
        />
        <KpiCard
          title="Total Purchase Spend"
          value={kpiLoading ? "-" : formatRupiah(k?.totalSpend ?? 0)}
          subValue="Dari invoice"
          change={k ? pctChange(k.totalSpend, k.totalSpendPrevMonth) : undefined}
          changeSuffix="vs periode lalu"
          icon={DollarSign}
          accentColor="emerald"
          loading={kpiLoading}
          onClick={() => router.push("/pembelian/invoice")}
        />
        <KpiCard
          title="Outstanding PO"
          value={kpiLoading ? "-" : String(k?.outstandingPO ?? 0)}
          subValue="Open / Pending / Partial"
          icon={Clock3}
          accentColor="amber"
          loading={kpiLoading}
          onClick={() => drillPOStatus("Waiting to be processed")}
        />
        <KpiCard
          title="On-Time Delivery"
          value={kpiLoading ? "-" : `${(k?.onTimeDeliveryRate ?? 0).toFixed(1)}%`}
          subValue="GR - expected date"
          icon={Truck}
          accentColor="indigo"
          loading={kpiLoading}
          onClick={() => router.push("/pembelian/gr")}
        />
        <KpiCard
          title="Avg Supplier Score"
          value={kpiLoading ? "-" : k && k.avgSupplierScore > 0 ? `${k.avgSupplierScore.toFixed(1)}%` : "-"}
          subValue="AHP + TOPSIS (AI)"
          icon={Star}
          accentColor="purple"
          loading={kpiLoading || recLoading}
          onClick={() => router.push("/rekomendasi")}
        />
        <KpiCard
          title="Purchase Returns"
          value={kpiLoading ? "-" : String(k?.purchaseReturnCount ?? 0)}
          subValue="Periode ini"
          change={k ? pctChange(k.purchaseReturnCount, k.purchaseReturnPrevMonth) : undefined}
          changeSuffix="vs periode lalu"
          icon={RotateCcw}
          accentColor="rose"
          loading={kpiLoading}
          onClick={() => router.push("/pembelian/retur")}
        />
      </div>

      {/* -- CHARTS ROW 1 ----------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Purchase Spending Trend"
          subtitle="Total invoice per bulan (12 bulan terakhir)"
          className="lg:col-span-2"
          action={
            <button onClick={drillSpendTrend} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Lihat Invoice <ChevronRight size={12} />
            </button>
          }
        >
          <SpendTrendChart data={c?.spendTrend ?? []} loading={kpiLoading} />
        </ChartCard>

        <ChartCard
          title="PO by Status"
          subtitle="Distribusi semua Purchase Order"
          action={
            <button onClick={() => router.push("/pembelian/po")} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Lihat PO <ChevronRight size={12} />
            </button>
          }
        >
          <POStatusDonut
            data={c?.poStatusDistribution ?? []}
            loading={kpiLoading}
            onSliceClick={drillPOStatus}
          />
        </ChartCard>
      </div>

      {/* -- CHARTS ROW 2 ----------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly Purchase Volume" subtitle="Jumlah PO per bulan">
          <MonthlyVolumeBar data={c?.monthlyVolume ?? []} loading={kpiLoading} />
        </ChartCard>
        <ChartCard
          title="Top 10 Suppliers by Spend"
          subtitle="Total pembelian per supplier (periode ini)"
          action={
            <button onClick={() => router.push("/pembelian/supplier")} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Semua Supplier <ChevronRight size={12} />
            </button>
          }
        >
          <TopSuppliersBar
            data={c?.topSuppliersBySpend ?? []}
            loading={kpiLoading}
            onBarClick={drillSupplier}
          />
        </ChartCard>
      </div>

      {/* -- CHARTS ROW 3 ----------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Supplier Performance Ranking"
          subtitle="Skor AI (AHP + TOPSIS) - top 10"
          className="lg:col-span-2"
          action={
            <button onClick={() => router.push("/rekomendasi")} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Rekomendasi AI <ChevronRight size={12} />
            </button>
          }
        >
          <SupplierPerformanceBar
            data={c?.supplierPerformanceRanking ?? []}
            loading={kpiLoading || recLoading}
          />
        </ChartCard>

        <ChartCard title="Purchase Category Distribution" subtitle="Spending per kategori supplier">
          <CategoryPieChart data={c?.categoryDistribution ?? []} loading={kpiLoading} />
        </ChartCard>
      </div>

      {/* -- CHARTS ROW 4 ----------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Lead Time Trend"
          subtitle="Rata-rata hari PO - GR per bulan"
        >
          <LeadTimeTrendChart data={c?.leadTimeTrend ?? []} loading={kpiLoading} />
        </ChartCard>
        <ChartCard
          title="Monthly Purchase Return Trend"
          subtitle="Jumlah retur per bulan"
          action={
            <button onClick={() => router.push("/pembelian/retur")} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Lihat Retur <ChevronRight size={12} />
            </button>
          }
        >
          <ReturnTrendBar data={c?.returnTrend ?? []} loading={kpiLoading} />
        </ChartCard>
      </div>

      {/* -- PROCUREMENT MANAGER EXCLUSIVE SECTION ---------------------------- */}
      {isProcurementManager && (
        <div className="space-y-4">
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-2">
              Procurement Manager Analytics
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Quick-access approval cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link href="/pembelian/track-po-status" className="group rounded-2xl border border-amber-200 bg-amber-50 p-5 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
                  <ShoppingCart size={20} className="text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-amber-900">Track PO Status</p>
                  <p className="text-xs text-amber-700 mt-0.5">Setujui atau tolak permohonan PO</p>
                </div>
                <ArrowRight size={16} className="text-amber-600 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </Link>
            <Link href="/pembelian/po-approval-list" className="group rounded-2xl border border-indigo-200 bg-indigo-50 p-5 hover:bg-indigo-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-200 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-indigo-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-indigo-900">PO Approval List</p>
                  <p className="text-xs text-indigo-700 mt-0.5">Riwayat PO yang telah disetujui</p>
                </div>
                <ArrowRight size={16} className="text-indigo-600 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </Link>
          </div>

          {/* Procurement Funnel + Supplier Risk */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Procurement Funnel" subtitle="PO - Approved - GR - Invoice - Payment">
              <ProcurementFunnel
                data={kpiData?.funnel ?? []}
                loading={kpiLoading}
                onStepClick={drillFunnel}
              />
            </ChartCard>

            <ChartCard title="Supplier Risk Indicator" subtitle="Berdasarkan AI Score (AHP + TOPSIS)">
              <SupplierRiskIndicator
                data={kpiData?.riskSummary ?? { green: 0, yellow: 0, red: 0 }}
                loading={kpiLoading || recLoading}
              />
            </ChartCard>
          </div>

          {/* Supplier Leaderboard */}
          <ChartCard
            title="Supplier Leaderboard"
            subtitle="Top 10 supplier berdasarkan AI Score"
            action={
              <button onClick={() => router.push("/rekomendasi")} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                Rekomendasi AI <ChevronRight size={12} />
              </button>
            }
          >
            <SupplierLeaderboard
              data={kpiData?.leaderboard ?? []}
              loading={kpiLoading || recLoading}
              onRowClick={drillSupplier}
            />
          </ChartCard>

          {/* Spending by Category + AI Summary */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Spending by Supplier Category" subtitle="Stacked per bulan (12 bulan terakhir)" className="lg:col-span-2">
              <SpendingByCategory data={c?.supplierCategorySpend ?? []} loading={kpiLoading} />
            </ChartCard>
            <ChartCard title="AI Recommendation Summary" subtitle="Hasil analisis AHP + TOPSIS terkini">
              <AIRecommendationSummary dataset={recDataset ?? null} loading={recLoading} />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Role-based wrapper components
// -----------------------------------------------------------------------------

function PurchasingStaffDashboard() {
  return (
    <AppShell
      title="Purchasing Dashboard"
      subtitle="Executive overview aktivitas pembelian dan supplier"
    >
      <KpiDashboard isProcurementManager={false} />
      {/* Full-width enterprise activity timeline — newest 20 transactions */}
      <ActivityTimeline maxHeight={480} limit={20} className="mt-4" />
    </AppShell>
  );
}

function ProcurementManagerDashboard() {
  return (
    <AppShell
      title="Procurement Manager Dashboard"
      subtitle="Strategic procurement analytics & supplier intelligence"
    >
      <KpiDashboard isProcurementManager={true} />
      {/* Full-width enterprise activity timeline — newest 20 transactions */}
      <ActivityTimeline maxHeight={480} limit={20} className="mt-4" />
    </AppShell>
  );
}

// -----------------------------------------------------------------------------
// Page entry-point
// -----------------------------------------------------------------------------

export default function PembelianPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) return null;

  if (user?.role === "procurement_manager") {
    return <ProcurementManagerDashboard />;
  }

  return <PurchasingStaffDashboard />;
}
