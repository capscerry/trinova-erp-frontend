"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { ActivityTimeline } from "@/components/modules/dashboard/ActivityTimeline";
import { DashboardModuleSwitcher } from "@/components/modules/dashboard/DashboardModuleSwitcher";
import { useAuth } from "@/lib/AuthContext";
import {
  ClipboardList,
  CreditCard,
  FileText,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import {
  EMPTY_SALES_DASHBOARD,
  salesDashboardService,
  type SalesDashboard,
} from "@/lib/services/sales-dashboard.service";
import {
  fetchSalesKpis,
  type SalesKpiData,
  type DateFilter,
} from "@/lib/services/sales-kpi.service";
import { customerService } from "@/lib/services/customer.service";
import { KpiCard } from "@/components/modules/penjualan/dashboard/KpiCard";
import { SalesTrendChart } from "@/components/modules/penjualan/dashboard/SalesTrendChart";
import { SOStatusDonut } from "@/components/modules/penjualan/dashboard/SOStatusDonut";
import { TopCustomersBar } from "@/components/modules/penjualan/dashboard/TopCustomersBar";
import { SalesVolumeBar } from "@/components/modules/penjualan/dashboard/SalesVolumeBar";
import { OutstandingTrendChart } from "@/components/modules/penjualan/dashboard/OutstandingTrendChart";
import { DashboardFilters, type ActiveFilters } from "@/components/modules/penjualan/dashboard/DashboardFilters";

type Tone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";

interface MetricCard {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  tone: Tone;
}

const toneClass: Record<Tone, { icon: string; bg: string }> = {
  blue: { icon: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
  emerald: { icon: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  amber: { icon: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
  rose: { icon: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
  violet: { icon: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
  slate: { icon: "text-slate-600", bg: "bg-slate-50 border-slate-100" },
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value || 0);

const formatRupiah = (value: number) => `Rp ${formatCompact(value)}`;

const formatRupiahFull = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

function pctChange(current: number, prev: number): number | undefined {
  if (prev === 0) return undefined;
  return ((current - prev) / prev) * 100;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function PenjualanDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<SalesDashboard>(EMPTY_SALES_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [kpiData, setKpiData] = useState<SalesKpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ range: "last6m" });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [customerOptions, setCustomerOptions] = useState<Array<{ id: number; name: string }>>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await salesDashboardService.getDashboard();
      setDashboard(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Gagal memuat dashboard penjualan:", err);
      setError("Dashboard penjualan belum bisa dimuat dari API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const fetchKpi = useCallback(async () => {
    try {
      setKpiLoading(true);
      const result = await fetchSalesKpis(dateFilter, {
        customerId: activeFilters.customerId,
        category: activeFilters.category,
        status: activeFilters.status,
      });
      setKpiData(result);
    } catch (err) {
      console.error("Gagal memuat KPI penjualan:", err);
    } finally {
      setKpiLoading(false);
    }
  }, [dateFilter, activeFilters]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  useEffect(() => {
    customerService
      .getAll()
      .then((list) => setCustomerOptions(list.map((c) => ({ id: c.id, name: c.nama }))))
      .catch(() => {});
  }, []);

  const metrics: MetricCard[] = [
    {
      label: "Sales Order",
      value: formatRupiah(dashboard.totalSalesOrder),
      sub: `${dashboard.salesOrderCount} dokumen pesanan`,
      icon: ShoppingBag,
      tone: "blue",
    },
    {
      label: "Faktur Penjualan",
      value: formatRupiah(dashboard.totalInvoice),
      sub: `${dashboard.invoiceCount} faktur dibuat`,
      icon: Receipt,
      tone: "emerald",
    },
    {
      label: "Outstanding",
      value: formatRupiah(dashboard.outstandingInvoice),
      sub: "Sisa tagihan pelanggan",
      icon: CreditCard,
      tone: "rose",
    },
    {
      label: "Penerimaan",
      value: formatRupiah(dashboard.totalReceipt),
      sub: `${dashboard.receiptCount} pembayaran masuk`,
      icon: PackageCheck,
      tone: "violet",
    },
    {
      label: "Pengiriman",
      value: String(dashboard.deliveryCount),
      sub: "Surat jalan tercatat",
      icon: Truck,
      tone: "amber",
    },
    {
      label: "Customer",
      value: String(dashboard.customerCount),
      sub: "Pelanggan terdaftar",
      icon: Users,
      tone: "slate",
    },
  ];

  return (
    <AppShell title="Dashboard Penjualan" subtitle="Ringkasan aktivitas sales dan tagihan pelanggan">
      {user?.role === "admin" && <DashboardModuleSwitcher active="sales" />}
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Overview modul penjualan</p>
            <p className="text-xs text-slate-400">
              {lastUpdated
                ? `Terakhir diperbarui ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                : "Memuat data terbaru"}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            {error}
          </div>
        )}

        {/* ── Analytics: filter + KPI + charts ─────────────────────────── */}
        <DashboardFilters
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          activeFilters={activeFilters}
          onActiveFiltersChange={setActiveFilters}
          customers={customerOptions}
          statuses={["Draft", "Processing", "In Delivery", "Completed", "Cancelled"]}
          loading={kpiLoading}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Sales Order"
            value={String(kpiData?.kpis.totalSalesOrder ?? 0)}
            change={kpiData ? pctChange(kpiData.kpis.totalSalesOrder, kpiData.kpis.totalSalesOrderPrevMonth) : undefined}
            icon={ShoppingBag}
            loading={kpiLoading}
            accentColor="blue"
          />
          <KpiCard
            title="Total Revenue"
            value={formatRupiahFull(kpiData?.kpis.totalRevenue ?? 0)}
            change={kpiData ? pctChange(kpiData.kpis.totalRevenue, kpiData.kpis.totalRevenuePrevMonth) : undefined}
            icon={Receipt}
            loading={kpiLoading}
            accentColor="emerald"
          />
          <KpiCard
            title="Outstanding Piutang"
            value={formatRupiahFull(kpiData?.kpis.outstandingReceivable ?? 0)}
            icon={CreditCard}
            loading={kpiLoading}
            accentColor="rose"
          />
          <KpiCard
            title="Fulfillment Rate"
            value={`${(kpiData?.kpis.fulfillmentRate ?? 0).toFixed(1)}%`}
            icon={Truck}
            loading={kpiLoading}
            accentColor="indigo"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-700">Tren Revenue Bulanan</p>
            <SalesTrendChart data={kpiData?.charts.revenueTrend ?? []} loading={kpiLoading} />
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-700">Distribusi Status Sales Order</p>
            <SOStatusDonut data={kpiData?.charts.soStatusDistribution ?? []} loading={kpiLoading} />
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-700">Top 10 Customer by Revenue</p>
            <TopCustomersBar data={kpiData?.charts.topCustomersByRevenue ?? []} loading={kpiLoading} />
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-700">Volume Sales Order Bulanan</p>
            <SalesVolumeBar data={kpiData?.charts.salesVolumeTrend ?? []} loading={kpiLoading} />
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-700">Tren Outstanding Piutang</p>
          <OutstandingTrendChart data={kpiData?.charts.outstandingTrend ?? []} loading={kpiLoading} />
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-white" />
              ))
            : metrics.map((metric) => {
                const Icon = metric.icon;
                const tone = toneClass[metric.tone];
                return (
                  <div key={metric.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{metric.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-800">{metric.value}</p>
                        <p className="mt-1 text-xs text-slate-400">{metric.sub}</p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone.bg}`}>
                        <Icon size={17} className={tone.icon} />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Sales Order Terbaru</p>
                <p className="text-xs text-slate-400">Pesanan penjualan terakhir</p>
              </div>
              <Link href="/penjualan/order" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {dashboard.recentSalesOrders.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada sales order.</p>
              ) : dashboard.recentSalesOrders.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">{item.number}</p>
                    <p className="truncate text-xs text-slate-400">{item.customerName || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{formatRupiah(item.total)}</p>
                    <p className="text-[11px] text-slate-400">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Faktur Terbaru</p>
                <p className="text-xs text-slate-400">Tagihan penjualan terakhir</p>
              </div>
              <Link href="/penjualan/invoice" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {dashboard.recentInvoices.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada faktur penjualan.</p>
              ) : dashboard.recentInvoices.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">{item.number}</p>
                    <p className="truncate text-xs text-slate-400">{item.customerName || "-"} - {formatDate(item.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{formatRupiah(item.grandTotal)}</p>
                    <p className="text-[11px] text-slate-400">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <ActivityTimeline maxHeight={330} module="sales" />
      </div>
    </AppShell>
  );
}
