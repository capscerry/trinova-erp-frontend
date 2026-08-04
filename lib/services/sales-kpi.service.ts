/**
 * lib/services/sales-kpi.service.ts
 *
 * KPI data for the executive Sales Dashboard, computed server-side by
 * GET /api/sales-kpi (SalesKpiController -> SalesKpiRepo). The frontend only
 * decides WHICH date range to ask for (getDateBounds below); the backend
 * aggregates directly from sales_order/sales_invoice/delivery_order/... via
 * SQL, so what the dashboard shows always matches what's actually in the
 * database -- no client-side date-filtering logic left to silently disagree
 * with the real data (that's what caused the previous "0 everywhere despite
 * real data existing" bug: the aggregation ran entirely in the browser).
 */

import { api } from "@/lib/api";

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

// ─── KPI types (unchanged — app/penjualan/page.tsx reads these directly) ─────

export interface KpiCardData {
  totalSalesOrder: number;
  totalSalesOrderPrevMonth: number;
  totalRevenue: number;
  totalRevenuePrevMonth: number;
  outstandingReceivable: number;
  fulfillmentRate: number;        // 0–100 %, qty terkirim / qty dipesan
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

// ─── Colour palette (purely cosmetic — backend only returns labels/counts) ──

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Processing: "#f59e0b",
  "In Delivery": "#0ea5e9",
  "Partially Fulfilled": "#f59e0b",
  Completed: "#10b981",
  Cancelled: "#ef4444",
};

const FUNNEL_COLORS: Record<string, string> = {
  Quotation: "#6366f1",
  "Sales Order": "#3b82f6",
  Delivered: "#0ea5e9",
  Invoiced: "#10b981",
  Paid: "#22c55e",
};

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function fetchSalesKpis(
  filter: DateFilter,
  activeFilters?: {
    customerId?: number;
    category?: string;
    status?: string;
  }
): Promise<SalesKpiData> {
  const { from, to } = getDateBounds(filter);
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  const response = await api.get("/sales-kpi", {
    params: {
      from: from.toISOString(),
      to: to.toISOString(),
      prevFrom: prevFrom.toISOString(),
      prevTo: prevTo.toISOString(),
      customerId: activeFilters?.customerId,
      category: activeFilters?.category,
      status: activeFilters?.status,
    },
  });

  const raw = response.data?.data ?? {};
  const kpis = raw.kpis ?? {};
  const charts = raw.charts ?? {};

  return {
    kpis: {
      totalSalesOrder: Number(kpis.totalSalesOrder ?? 0),
      totalSalesOrderPrevMonth: Number(kpis.totalSalesOrderPrevMonth ?? 0),
      totalRevenue: Number(kpis.totalRevenue ?? 0),
      totalRevenuePrevMonth: Number(kpis.totalRevenuePrevMonth ?? 0),
      outstandingReceivable: Number(kpis.outstandingReceivable ?? 0),
      fulfillmentRate: Number(kpis.fulfillmentRate ?? 0),
      salesReturnCount: Number(kpis.salesReturnCount ?? 0),
      salesReturnPrevMonth: Number(kpis.salesReturnPrevMonth ?? 0),
    },
    charts: {
      revenueTrend: (charts.revenueTrend ?? []).map((p: any) => ({
        month: p.month,
        value: Number(p.value ?? 0),
      })),
      salesVolumeTrend: (charts.salesVolumeTrend ?? []).map((p: any) => ({
        month: p.month,
        value: Number(p.value ?? 0),
      })),
      soStatusDistribution: (charts.soStatusDistribution ?? []).map((s: any) => ({
        status: s.status,
        count: Number(s.count ?? 0),
        color: STATUS_COLORS[s.status] ?? "#94a3b8",
      })),
      topCustomersByRevenue: (charts.topCustomersByRevenue ?? []).map((c: any) => ({
        customer_id: Number(c.customerId ?? 0),
        customer_name: c.customerName ?? "",
        total: Number(c.total ?? 0),
      })),
      categoryDistribution: (charts.categoryDistribution ?? []).map((c: any) => ({
        category: c.category,
        value: Number(c.value ?? 0),
      })),
      outstandingTrend: (charts.outstandingTrend ?? []).map((p: any) => ({
        month: p.month,
        value: Number(p.value ?? 0),
      })),
      returnTrend: (charts.returnTrend ?? []).map((p: any) => ({
        month: p.month,
        value: Number(p.value ?? 0),
      })),
    },
    funnel: (raw.funnel ?? []).map((f: any) => ({
      label: f.label,
      count: Number(f.count ?? 0),
      color: FUNNEL_COLORS[f.label] ?? "#94a3b8",
    })),
    leaderboard: (raw.leaderboard ?? []).map((l: any) => ({
      rank: Number(l.rank ?? 0),
      customer_id: Number(l.customerId ?? 0),
      customer_name: l.customerName ?? "",
      revenue: Number(l.revenue ?? 0),
      invoiceCount: Number(l.invoiceCount ?? 0),
      category: l.category ?? "Others",
    })),
  };
}
