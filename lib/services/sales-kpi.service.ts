/**
 * lib/services/sales-kpi.service.ts
 *
 * Client-side KPI aggregation service for the executive Sales Dashboard.
 * Mirrors lib/services/purchasing-kpi.service.ts: fetches the raw ERP
 * collections and derives all KPI card values and chart series in a single
 * pass so the dashboard makes the minimum required API calls.
 *
 * NO business logic is modified — this is read-only analytics only.
 */

import { salesOrderService, salesQuotationService, type SalesOrder } from "./penjualan.service";
import { salesInvoiceService, type SalesInvoice } from "./sales-invoice.service";
import { salesReturnService } from "./sales-return.service";
import { pengirimanPenjualanService } from "./pengiriman-penjualan.service";
import { customerService } from "./customer.service";

// ─── Date filter helpers ──────────────────────────────────────────────────────

export type TimeRange =
  | "today"
  | "last7"
  | "last30"
  | "last3m"
  | "last6m"
  | "last1y"
  | "custom";

export interface DateFilter {
  range: TimeRange;
  from?: Date;
  to?: Date;
}

export function getDateBounds(filter: DateFilter): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  switch (filter.range) {
    case "today": {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last7": {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last30": {
      const from = new Date(now);
      from.setDate(now.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last3m": {
      const from = new Date(now);
      from.setMonth(now.getMonth() - 3);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last6m": {
      const from = new Date(now);
      from.setMonth(now.getMonth() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last1y": {
      const from = new Date(now);
      from.setFullYear(now.getFullYear() - 1);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "custom": {
      const from = filter.from ?? new Date(now.getFullYear(), 0, 1);
      const customTo = filter.to ?? to;
      return { from, to: customTo };
    }
  }
}

function inRange(dateStr: string | null | undefined, from: Date, to: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= from && d <= to;
}

// ─── KPI types ────────────────────────────────────────────────────────────────

export interface KpiCardData {
  totalSalesOrder: number;
  totalSalesOrderPrevMonth: number;
  totalRevenue: number;
  totalRevenuePrevMonth: number;
  outstandingReceivable: number;
  fulfillmentRate: number;        // 0–100 %, SO yang sudah Completed
  salesReturnCount: number;
  salesReturnPrevMonth: number;
}

export interface MonthPoint {
  month: string;   // "Jan 24"
  value: number;
}

export interface CustomerRevenue {
  customer_id: number;
  customer_name: string;
  total: number;
}

export interface CategoryRevenue {
  category: string;
  value: number;
}

export interface SOStatusCount {
  status: string;
  count: number;
  color: string;
}

export interface SalesFunnelStep {
  label: string;
  count: number;
  color: string;
}

export interface CustomerLeaderboardRow {
  rank: number;
  customer_id: number;
  customer_name: string;
  revenue: number;
  invoiceCount: number;
  category: string;
}

export interface ChartData {
  revenueTrend: MonthPoint[];
  salesVolumeTrend: MonthPoint[];
  soStatusDistribution: SOStatusCount[];
  topCustomersByRevenue: CustomerRevenue[];
  categoryDistribution: CategoryRevenue[];
  outstandingTrend: MonthPoint[];
  returnTrend: MonthPoint[];
}

export interface SalesKpiData {
  kpis: KpiCardData;
  charts: ChartData;
  funnel: SalesFunnelStep[];
  leaderboard: CustomerLeaderboardRow[];
}

// ─── SO status classification ─────────────────────────────────────────────────

const COMPLETED_STATUSES = new Set(["Completed"]);

// ─── Colour palette ───────────────────────────────────────────────────────────

// Selaras dengan 5 status Sales Order kanonis di lib/sales-status.ts
// (SALES_STATUS_OPTIONS["sales-order"]) hasil redesain flow indent/non-indent.
const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Processing: "#f59e0b",
  "In Delivery": "#0ea5e9",
  Completed: "#10b981",
  Cancelled: "#ef4444",
};

// ─── Main aggregation function ────────────────────────────────────────────────

export async function fetchSalesKpis(
  filter: DateFilter,
  activeFilters?: {
    customerId?: number;
    category?: string;
    status?: string;
  }
): Promise<SalesKpiData> {
  // ── 1. Fetch raw data in parallel ────────────────────────────────────────
  const [orders, invoices, returns, deliveries, quotations, customers] = await Promise.all([
    salesOrderService.getAll().catch(() => [] as SalesOrder[]),
    salesInvoiceService.getAll().catch(() => [] as SalesInvoice[]),
    salesReturnService.getAll().catch(() => []),
    pengirimanPenjualanService.getAll().catch(() => []),
    salesQuotationService.getAll().catch(() => []),
    customerService.getAll().catch(() => []),
  ]);

  // ── 2. Customer lookup maps ──────────────────────────────────────────────
  const customerCategoryByName = new Map<string, string>();
  const customerCategoryById = new Map<number, string>();
  for (const c of customers) {
    customerCategoryById.set(c.id, c.category || "Others");
    customerCategoryByName.set(c.nama, c.category || "Others");
  }

  // ── 3. Date bounds ────────────────────────────────────────────────────────
  const { from, to } = getDateBounds(filter);
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  // ── 4. Apply filters ─────────────────────────────────────────────────────
  const filterSO = (o: SalesOrder) => {
    if (activeFilters?.status && o.status !== activeFilters.status) return false;
    if (activeFilters?.category && (customerCategoryByName.get(o.pelanggan) ?? "Others") !== activeFilters.category) return false;
    return true;
  };
  const filterInvoice = (i: SalesInvoice) => {
    if (activeFilters?.customerId && Number(i.customerId) !== activeFilters.customerId) return false;
    if (activeFilters?.category && (customerCategoryById.get(Number(i.customerId)) ?? "Others") !== activeFilters.category) return false;
    return true;
  };

  // ── 5. KPI — Sales Order count this period vs prev ──────────────────────
  const soInRange = orders.filter((o) => inRange(o.tanggal, from, to) && filterSO(o));
  const soInPrevRange = orders.filter((o) => inRange(o.tanggal, prevFrom, prevTo) && filterSO(o));

  // ── 6. KPI — Total Revenue (from invoices) ───────────────────────────────
  const invoicesInRange = invoices.filter((i) => inRange(i.invoiceDate, from, to) && filterInvoice(i));
  const invoicesInPrevRange = invoices.filter((i) => inRange(i.invoiceDate, prevFrom, prevTo) && filterInvoice(i));

  const totalRevenue = invoicesInRange.reduce((sum, i) => sum + Number(i.grandTotal ?? 0), 0);
  const totalRevenuePrev = invoicesInPrevRange.reduce((sum, i) => sum + Number(i.grandTotal ?? 0), 0);

  // ── 7. KPI — Outstanding Receivable (current, not date-filtered) ────────
  const outstandingReceivable = invoices
    .filter((i) => i.status !== "Paid" && i.status !== "Cancelled")
    .reduce((sum, i) => sum + Number(i.remainingAmount ?? 0), 0);

  // ── 8. KPI — Fulfillment Rate (SO Completed / SO total, in range) ───────
  const fulfillmentRate = soInRange.length > 0
    ? (soInRange.filter((o) => COMPLETED_STATUSES.has(o.status)).length / soInRange.length) * 100
    : 0;

  // ── 9. KPI — Sales Returns ───────────────────────────────────────────────
  const returnsInRange = returns.filter((r) => inRange(r.tanggal, from, to));
  const returnsInPrevRange = returns.filter((r) => inRange(r.tanggal, prevFrom, prevTo));

  // ── 10. Chart — Revenue Trend (monthly, dalam rentang filter) ────────────
  const revenueByMonth = new Map<string, number>();
  for (const inv of invoicesInRange) {
    const d = new Date(inv.invoiceDate);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(inv.grandTotal ?? 0));
  }
  const revenueTrend = buildMonthlyPoints(revenueByMonth, from, to);

  // ── 11. Chart — Monthly Sales Order Volume (dalam rentang filter) ────────
  const volumeByMonth = new Map<string, number>();
  for (const o of soInRange) {
    const d = new Date(o.tanggal);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    volumeByMonth.set(key, (volumeByMonth.get(key) ?? 0) + 1);
  }
  const salesVolumeTrend = buildMonthlyPoints(volumeByMonth, from, to);

  // ── 12. Chart — SO Status Distribution (dalam rentang filter) ────────────
  const statusCount = new Map<string, number>();
  for (const o of soInRange) {
    statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);
  }
  const soStatusDistribution: SOStatusCount[] = Array.from(statusCount.entries()).map(([status, count]) => ({
    status,
    count,
    color: STATUS_COLORS[status] ?? "#94a3b8",
  }));

  // ── 13. Chart — Top 10 Customers by Revenue ──────────────────────────────
  const customerRevenueMap = new Map<number, number>();
  const customerNameMap = new Map<number, string>();
  for (const inv of invoicesInRange) {
    const cid = Number(inv.customerId);
    customerRevenueMap.set(cid, (customerRevenueMap.get(cid) ?? 0) + Number(inv.grandTotal ?? 0));
    customerNameMap.set(cid, inv.customerName || `Customer ${cid}`);
  }
  const topCustomersByRevenue: CustomerRevenue[] = Array.from(customerRevenueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cid, total]) => ({
      customer_id: cid,
      customer_name: customerNameMap.get(cid) ?? `Customer ${cid}`,
      total,
    }));

  // ── 14. Chart — Revenue by Customer Category ─────────────────────────────
  const categoryRevenueMap = new Map<string, number>();
  for (const inv of invoicesInRange) {
    const cat = customerCategoryById.get(Number(inv.customerId)) ?? "Others";
    categoryRevenueMap.set(cat, (categoryRevenueMap.get(cat) ?? 0) + Number(inv.grandTotal ?? 0));
  }
  const categoryDistribution: CategoryRevenue[] = Array.from(categoryRevenueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, value]) => ({ category, value }));

  // ── 15. Chart — Outstanding Receivable Trend (monthly, dalam rentang filter)
  const outstandingByMonth = new Map<string, number>();
  for (const inv of invoicesInRange) {
    if (inv.status === "Paid" || inv.status === "Cancelled") continue;
    const d = new Date(inv.invoiceDate);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    outstandingByMonth.set(key, (outstandingByMonth.get(key) ?? 0) + Number(inv.remainingAmount ?? 0));
  }
  const outstandingTrend = buildMonthlyPoints(outstandingByMonth, from, to);

  // ── 16. Chart — Monthly Return Trend (dalam rentang filter) ──────────────
  const returnByMonth = new Map<string, number>();
  for (const r of returnsInRange) {
    const d = new Date(r.tanggal);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    returnByMonth.set(key, (returnByMonth.get(key) ?? 0) + 1);
  }
  const returnTrend = buildMonthlyPoints(returnByMonth, from, to);

  // ── 17. Sales Funnel ──────────────────────────────────────────────────────
  const deliveriesInRange = deliveries.filter((d) => inRange(d.tanggalKirim, from, to));
  const funnel: SalesFunnelStep[] = [
    { label: "Quotation", count: quotations.length, color: "#6366f1" },
    { label: "Sales Order", count: orders.filter((o) => o.status !== "Cancelled").length, color: "#3b82f6" },
    { label: "Delivered", count: deliveriesInRange.length, color: "#0ea5e9" },
    { label: "Invoiced", count: invoices.filter((i) => i.status !== "Cancelled").length, color: "#10b981" },
    { label: "Paid", count: invoices.filter((i) => i.status === "Paid").length, color: "#22c55e" },
  ];

  // ── 18. Customer Leaderboard (by revenue, all-time within range) ────────
  const invoiceCountMap = new Map<number, number>();
  for (const inv of invoicesInRange) {
    const cid = Number(inv.customerId);
    invoiceCountMap.set(cid, (invoiceCountMap.get(cid) ?? 0) + 1);
  }
  const leaderboard: CustomerLeaderboardRow[] = Array.from(customerRevenueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cid, revenue], i) => ({
      rank: i + 1,
      customer_id: cid,
      customer_name: customerNameMap.get(cid) ?? `Customer ${cid}`,
      revenue,
      invoiceCount: invoiceCountMap.get(cid) ?? 0,
      category: customerCategoryById.get(cid) ?? "Others",
    }));

  return {
    kpis: {
      totalSalesOrder: soInRange.length,
      totalSalesOrderPrevMonth: soInPrevRange.length,
      totalRevenue,
      totalRevenuePrevMonth: totalRevenuePrev,
      outstandingReceivable,
      fulfillmentRate,
      salesReturnCount: returnsInRange.length,
      salesReturnPrevMonth: returnsInPrevRange.length,
    },
    charts: {
      revenueTrend,
      salesVolumeTrend,
      soStatusDistribution,
      topCustomersByRevenue,
      categoryDistribution,
      outstandingTrend,
      returnTrend,
    },
    funnel,
    leaderboard,
  };
}

// ─── Helper — build time series mengikuti rentang filter yang dipilih ────────

function buildMonthlyPoints(map: Map<string, number>, from: Date, to: Date): MonthPoint[] {
  const result: MonthPoint[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  // Batas wajar 24 bucket — kalau rentang custom sangat panjang, jangan
  // sampai render ratusan bar/point.
  let guard = 0;
  while (cursor <= end && guard < 24) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    result.push({ month: label, value: map.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
    guard++;
  }

  return result;
}
