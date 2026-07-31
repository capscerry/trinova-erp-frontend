"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  FileText,
  MoreVertical,
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

interface ShortcutItem {
  label: string;
  href: string;
  icon: React.ElementType;
  desc: string;
}

const toneClass: Record<Tone, { icon: string; bg: string }> = {
  blue: { icon: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
  emerald: { icon: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  amber: { icon: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
  rose: { icon: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
  violet: { icon: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
  slate: { icon: "text-slate-600", bg: "bg-slate-50 border-slate-100" },
};

const shortcuts: ShortcutItem[] = [
  { label: "Penawaran", href: "/penjualan/quotation", icon: FileText, desc: "Buat dan pantau quotation" },
  { label: "Pesanan", href: "/penjualan/order", icon: ClipboardList, desc: "Kelola sales order" },
  { label: "Pengiriman", href: "/penjualan/pengiriman-penjualan", icon: Truck, desc: "Surat jalan pelanggan" },
  { label: "Faktur", href: "/penjualan/invoice", icon: Receipt, desc: "Tagihan penjualan" },
  { label: "Uang Muka", href: "/penjualan/uang-muka", icon: CreditCard, desc: "Down payment customer" },
  { label: "Penerimaan", href: "/penjualan/penerimaan-penjualan", icon: PackageCheck, desc: "Pembayaran pelanggan" },
];

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

const toValidDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateKey = (value?: string | null) => {
  const date = toValidDate(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
};

const formatDayName = (value?: string | null) => {
  const date = toValidDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date);
};

const formatDayNumber = (value?: string | null) => {
  const date = toValidDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit" }).format(date);
};

const formatMonthName = (value?: string | null) => {
  const date = toValidDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date);
};

const formatTimeOnly = (value?: string | null) => {
  const date = toValidDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getActivityHref = (refTable?: string | null, refId?: number | null) => {
  if (!refTable || !refId) return null;

  const routes: Record<string, string> = {
    sales_quotation: "/penjualan/quotation",
    sales_order: "/penjualan/order",
    uang_muka: "/penjualan/uang-muka",
    delivery_order_header: "/penjualan/pengiriman-penjualan",
    sales_invoice: "/penjualan/invoice",
    sales_receipt: "/penjualan/penerimaan-penjualan",
  };

  const basePath = routes[refTable];
  return basePath ? `${basePath}/${refId}` : null;
};

const priorityClass: Record<string, string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  normal: "border-slate-200 bg-slate-50 text-slate-500",
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_320px]">
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

          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700">Akses Cepat</p>
            <p className="mb-4 text-xs text-slate-400">Menu utama modul sales</p>
            <div className="space-y-2">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-700">{item.label}</span>
                        <span className="block truncate text-[11px] text-slate-400">{item.desc}</span>
                      </span>
                    </span>
                    <ArrowRight size={13} className="text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="flex h-10 items-center justify-between border-b border-slate-200 px-4">
              <p className="truncate text-base font-semibold text-slate-900">
                Aktivitas Terakhir Anda{user?.email ? ` (${user.email})` : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  aria-label="Refresh aktivitas terakhir"
                >
                  <RefreshCw size={19} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100"
                  aria-label="Menu aktivitas terakhir"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            <div className="h-[245px] overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-md bg-slate-100" />
                  ))}
                </div>
              ) : dashboard.recentActivities.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-lg italic text-slate-500">Tidak ada aktivitas</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {dashboard.recentActivities.map((item, index) => {
                    const href = getActivityHref(item.refTable, item.refId);
                    const dateKey = getDateKey(item.createdAt);
                    const previousDateKey = index > 0 ? getDateKey(dashboard.recentActivities[index - 1]?.createdAt) : "";
                    const showDate = index === 0 || dateKey !== previousDateKey;
                    const content = (
                      <div className="group grid grid-cols-[72px_1fr] gap-3">
                        <div className="pt-1 text-slate-600">
                          {showDate && (
                            <>
                              <p className="text-sm">{formatDayName(item.createdAt)}</p>
                              <p className="leading-none text-[44px] font-light">{formatDayNumber(item.createdAt)}</p>
                              <p className="-mt-1 text-2xl">{formatMonthName(item.createdAt)}</p>
                            </>
                          )}
                        </div>
                        <div className="relative border-l border-slate-200 pb-7 pl-8">
                          <span className="absolute -left-[7px] top-2 h-3.5 w-3.5 rounded-full border border-blue-500 bg-blue-100" />
                          <div className="grid grid-cols-[56px_1fr] gap-2">
                            <p className="text-sm font-bold text-slate-900">{formatTimeOnly(item.createdAt)}</p>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-slate-600 group-hover:text-slate-900">{item.title}</p>
                              {(item.description || item.refNumber) && (
                                <p className="mt-1 truncate text-xs text-slate-400">{item.description || item.refNumber}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                    return href ? (
                      <Link key={item.id} href={href} className="block">
                        {content}
                      </Link>
                    ) : (
                      <div key={item.id}>{content}</div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="flex h-10 items-center justify-between border-b border-slate-200 px-4">
              <p className="truncate text-base font-semibold text-slate-900">Kegiatan Mendatang</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  aria-label="Refresh kegiatan mendatang"
                >
                  <RefreshCw size={19} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100"
                  aria-label="Menu kegiatan mendatang"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            <div className="h-[245px] overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-md bg-slate-100" />
                  ))}
                </div>
              ) : dashboard.upcomingActivities.length === 0 ? (
                <div className="flex h-full items-start justify-center pt-4">
                  <p className="text-xl italic text-slate-500">Tidak ada kegiatan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.upcomingActivities.map((item, index) => {
                    const href = getActivityHref(item.refTable, item.refId);
                    const badgeClass = priorityClass[item.priority] ?? priorityClass.normal;
                    const content = (
                      <div className="grid grid-cols-[86px_1fr_auto] items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-slate-50">
                        <div className="text-slate-600">
                          <p className="text-sm">{formatDayName(item.activityDate)}</p>
                          <p className="leading-none text-3xl font-light">{formatDayNumber(item.activityDate)}</p>
                          <p className="text-sm">{formatMonthName(item.activityDate)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">{item.title}</p>
                          <p className="mt-1 truncate text-xs text-slate-400">{item.description || item.refNumber || "-"}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${badgeClass}`}>
                          {item.priority}
                        </span>
                      </div>
                    );

                    return href ? (
                      <Link key={`${item.activityType}-${item.refId ?? index}`} href={href} className="block">
                        {content}
                      </Link>
                    ) : (
                      <div key={`${item.activityType}-${item.refId ?? index}`}>{content}</div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
