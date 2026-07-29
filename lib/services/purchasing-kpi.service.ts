/**
 * lib/services/purchasing-kpi.service.ts
 *
 * Client-side KPI aggregation service for the executive Purchasing Dashboard.
 * Fetches the raw ERP collections and derives all KPI card values and chart
 * series in a single pass so the dashboard makes the minimum required API calls.
 *
 * NO business logic is modified — this is read-only analytics only.
 */

import { getPurchaseOrders, getPurchaseOrderDetails } from "./po.service";
import { getGoodsReceipts } from "./gr.service";
import { getPurchaseInvoices } from "./purchase-invoice.service";
import { getPurchaseReturns } from "./purchase-return.service";
import { getSuppliers } from "./supplier.service";
import { getSupplierProducts } from "./supplier-product.service";
import { getSupplierCategory } from "./supplierCategory.service";

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
  totalPO: number;
  totalPOPrevMonth: number;
  totalSpend: number;
  totalSpendPrevMonth: number;
  outstandingPO: number;
  avgSupplierScore: number;          // from TOPSIS Ci scores, 0–100
  onTimeDeliveryRate: number;        // 0–100 %
  purchaseReturnCount: number;
  purchaseReturnPrevMonth: number;
}

export interface MonthPoint {
  month: string;     // "Jan 24"
  value: number;
}

export interface SupplierSpend {
  supplier_id: number;
  supplier_name: string;
  total: number;
}

export interface CategorySpend {
  category: string;
  value: number;
}

export interface POStatusCount {
  status: string;
  count: number;
  color: string;
}

export interface SupplierCategorySpend {
  month: string;
  [category: string]: number | string;
}

export interface ProcurementFunnelStep {
  label: string;
  count: number;
  color: string;
}

export interface SupplierLeaderboardRow {
  rank: number;
  supplier_id: number;
  supplier_name: string;
  ai_score: number;               // 0–100, from TOPSIS Ci
  orders: number;
  spend: number;
  risk: "green" | "yellow" | "red";
}

export interface SupplierRiskSummary {
  green: number;     // score > 80
  yellow: number;    // 60–80
  red: number;       // < 60
}

export interface ChartData {
  spendTrend: MonthPoint[];
  monthlyVolume: MonthPoint[];
  poStatusDistribution: POStatusCount[];
  topSuppliersBySpend: SupplierSpend[];
  supplierPerformanceRanking: Array<{ supplier: string; score: number }>;
  categoryDistribution: CategorySpend[];
  leadTimeTrend: MonthPoint[];
  returnTrend: MonthPoint[];
  supplierCategorySpend: SupplierCategorySpend[];
}

export interface PurchasingKpiData {
  kpis: KpiCardData;
  charts: ChartData;
  funnel: ProcurementFunnelStep[];
  leaderboard: SupplierLeaderboardRow[];
  riskSummary: SupplierRiskSummary;
}

// ─── PO status classification ─────────────────────────────────────────────────

const OUTSTANDING_STATUSES = new Set([
  "Waiting to be processed",
  "Partially processed",
  "Approved",
  "Pending Approval",
]);

// ─── Colour palette ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  "Pending Approval": "#f59e0b",
  Approved: "#6366f1",
  "Waiting to be processed": "#f97316",
  "Partially processed": "#3b82f6",
  Processed: "#10b981",
  Completed: "#10b981",
  Cancelled: "#ef4444",
};

// ─── Main aggregation function ────────────────────────────────────────────────

export async function fetchPurchasingKpis(
  filter: DateFilter,
  topsisScores?: Array<{ id: string; score: number }>,
  activeFilters?: {
    supplierId?: number;
    category?: string;
    status?: string;
  }
): Promise<PurchasingKpiData> {
  // 1. Fetch raw data in parallel
  const [posRaw, grsRaw, invoicesRaw, returnsRaw, suppliersRaw, spRaw, poDetailsRaw, supplierCatsRaw] =
    await Promise.all([
      getPurchaseOrders().catch(() => []),
      getGoodsReceipts().catch(() => []),
      getPurchaseInvoices().catch(() => []),
      getPurchaseReturns().catch(() => []),
      getSuppliers().catch(() => []),
      getSupplierProducts().catch(() => []),
      getPurchaseOrderDetails().catch(() => []),
      getSupplierCategory().catch(() => []),
    ]);

  const norm = (v: any): any[] => (Array.isArray(v) ? v : v?.data ?? []);

  const pos          = norm(posRaw);
  const grs          = norm(grsRaw);
  const invoices     = norm(invoicesRaw);
  const returns      = norm(returnsRaw);
  const suppliers    = norm(suppliersRaw);
  const sp           = norm(spRaw);
  const supplierCats = norm(supplierCatsRaw);

  // 2. Build supplier-category ID → name lookup
  const categoryIdToName = new Map<string, string>();
  for (const cat of supplierCats) {
    const id   = String(cat.category_supplier ?? cat.category_id ?? "");
    const name = cat.nama_category ?? cat.category_name ?? "";
    if (id && name) categoryIdToName.set(id, name);
  }

  // 3. Build supplier lookup maps
  const supplierNameMap = new Map<number, string>();
  const supplierCatMap  = new Map<number, string>();
  for (const s of suppliers) {
    const id = Number(s.supplier_id ?? s.id);
    supplierNameMap.set(id, s.supplier_name ?? s.nama ?? `Supplier ${id}`);
    const rawCat   = String(s.category_supplier ?? "");
    const catName  = rawCat ? (categoryIdToName.get(rawCat) ?? rawCat) : "Others";
    supplierCatMap.set(id, catName || "Others");
  }

  // 4. Date bounds
  const { from, to } = getDateBounds(filter);
  const durationMs = to.getTime() - from.getTime();
  const prevTo     = new Date(from.getTime() - 1);
  const prevFrom   = new Date(prevTo.getTime() - durationMs);

  // 5. Apply supplier / status filters
  const filterPO = (p: any) => {
    if (activeFilters?.supplierId && Number(p.supplier_id) !== activeFilters.supplierId) return false;
    if (activeFilters?.status && p.status !== activeFilters.status) return false;
    return true;
  };

  // 6. KPI – Total PO this period vs prev
  const poInRange     = pos.filter((p) => inRange(p.order_date ?? p.created_at, from, to) && filterPO(p));
  const poInPrevRange = pos.filter((p) => inRange(p.order_date ?? p.created_at, prevFrom, prevTo) && filterPO(p));

  // 7. KPI – Total Spend (from invoices)
  const invoicesInRange     = invoices.filter((inv) => inRange(inv.invoice_date, from, to));
  const invoicesInPrevRange = invoices.filter((inv) => inRange(inv.invoice_date, prevFrom, prevTo));
  const totalSpend     = invoicesInRange.reduce((sum: number, inv: any) => sum + Number(inv.total_amount ?? 0), 0);
  const totalSpendPrev = invoicesInPrevRange.reduce((sum: number, inv: any) => sum + Number(inv.total_amount ?? 0), 0);

  // 8. KPI – Outstanding PO (always current, not date-filtered)
  const outstandingPO = pos.filter((p) => OUTSTANDING_STATUSES.has(p.status) && filterPO(p)).length;

  // 9. KPI – On-Time Delivery
  const poExpectedMap = new Map<number, string | null>();
  for (const p of pos) poExpectedMap.set(Number(p.purchase_order_id), p.expected_date ?? null);

  const grsInRange = grs.filter((g) => inRange(g.receipt_date, from, to));
  let onTime = 0, withExpected = 0;
  for (const g of grsInRange) {
    const expected = poExpectedMap.get(Number(g.purchase_order_id));
    if (!expected || !g.receipt_date) continue;
    withExpected++;
    if (new Date(g.receipt_date) <= new Date(expected)) onTime++;
  }
  const onTimeRate = withExpected > 0 ? (onTime / withExpected) * 100 : 0;

  // 10. KPI – Purchase Returns
  const returnsInRange     = returns.filter((r) => inRange(r.return_date ?? r.created_at, from, to));
  const returnsInPrevRange = returns.filter((r) => inRange(r.return_date ?? r.created_at, prevFrom, prevTo));

  // 11. KPI – Average Supplier Score from TOPSIS
  const validTopsisScores = (topsisScores ?? []).filter(
    (t) => t.score != null && !Number.isNaN(t.score) && t.score > 0
  );
  let avgSupplierScore = 0;
  if (validTopsisScores.length > 0) {
    const total = validTopsisScores.reduce((s, t) => s + t.score, 0);
    avgSupplierScore = (total / validTopsisScores.length) * 100;
  }

  // 12. Chart – Spend Trend (monthly, last 12 months)
  const spendByMonth = new Map<string, number>();
  for (const inv of invoices) {
    const d = new Date(inv.invoice_date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + Number(inv.total_amount ?? 0));
  }
  const spendTrend = buildMonthlyPoints(spendByMonth, 12);

  // 13. Chart – Monthly PO Volume
  const volumeByMonth = new Map<string, number>();
  for (const p of pos) {
    const d = new Date(p.order_date ?? p.created_at);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    volumeByMonth.set(key, (volumeByMonth.get(key) ?? 0) + 1);
  }
  const monthlyVolume = buildMonthlyPoints(volumeByMonth, 12);

  // 14. Chart – PO Status Distribution
  const statusCount = new Map<string, number>();
  for (const p of pos) {
    if (!filterPO(p)) continue;
    statusCount.set(p.status, (statusCount.get(p.status) ?? 0) + 1);
  }
  const poStatusDistribution: POStatusCount[] = Array.from(statusCount.entries()).map(([status, count]) => ({
    status,
    count,
    color: STATUS_COLORS[status] ?? "#94a3b8",
  }));

  // 15. Chart – Top 10 Suppliers by Spend
  const supplierSpendMap = new Map<number, number>();
  for (const inv of invoicesInRange) {
    const sid = Number(inv.supplier_id);
    supplierSpendMap.set(sid, (supplierSpendMap.get(sid) ?? 0) + Number(inv.total_amount ?? 0));
  }
  const topSuppliersBySpend: SupplierSpend[] = Array.from(supplierSpendMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sid, total]) => ({
      supplier_id: sid,
      supplier_name: supplierNameMap.get(sid) ?? `Supplier ${sid}`,
      total,
    }));

  // 16. Chart – Supplier Performance Ranking (AI score)
  let supplierPerformanceRanking: Array<{ supplier: string; score: number }> = [];
  if (validTopsisScores.length > 0) {
    supplierPerformanceRanking = validTopsisScores
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((t) => ({
        supplier: supplierNameMap.get(Number(t.id)) ?? `Supplier ${t.id}`,
        score: parseFloat((t.score * 100).toFixed(1)),
      }));
  }

  // 17. Chart – Purchase Category Distribution
  const categorySpendMap = new Map<string, number>();
  for (const inv of invoicesInRange) {
    const cat = supplierCatMap.get(Number(inv.supplier_id)) ?? "Others";
    categorySpendMap.set(cat, (categorySpendMap.get(cat) ?? 0) + Number(inv.total_amount ?? 0));
  }
  if (categorySpendMap.size === 0) {
    for (const p of poInRange) {
      const cat = supplierCatMap.get(Number(p.supplier_id)) ?? "Others";
      categorySpendMap.set(cat, (categorySpendMap.get(cat) ?? 0) + Number(p.total_amount ?? 0));
    }
  }
  const categoryDistribution: CategorySpend[] = Array.from(categorySpendMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, value]) => ({ category, value }));

  // 18. Chart – Lead Time Trend (monthly avg)
  const leadByMonth = new Map<string, number[]>();
  for (const g of grs) {
    const po = pos.find((p) => Number(p.purchase_order_id) === Number(g.purchase_order_id));
    if (!po?.order_date || !g.receipt_date) continue;
    const days = (new Date(g.receipt_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
    if (days < 0 || days > 365) continue;
    const d = new Date(g.receipt_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = leadByMonth.get(key) ?? [];
    arr.push(days);
    leadByMonth.set(key, arr);
  }
  const leadAvgByMonth = new Map<string, number>();
  for (const [k, arr] of leadByMonth.entries()) {
    leadAvgByMonth.set(k, arr.reduce((s, v) => s + v, 0) / arr.length);
  }
  const leadTimeTrend = buildMonthlyPoints(leadAvgByMonth, 12);

  // 19. Chart – Monthly Return Trend
  const returnByMonth = new Map<string, number>();
  for (const r of returns) {
    const d = new Date(r.return_date ?? r.created_at);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    returnByMonth.set(key, (returnByMonth.get(key) ?? 0) + 1);
  }
  const returnTrend = buildMonthlyPoints(returnByMonth, 12);

  // 20. Chart – Spending by Supplier Category (stacked)
  const catMonthMap = new Map<string, Map<string, number>>();
  for (const inv of invoices) {
    const d = new Date(inv.invoice_date);
    if (isNaN(d.getTime())) continue;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cat = supplierCatMap.get(Number(inv.supplier_id)) ?? "Others";
    if (!catMonthMap.has(monthKey)) catMonthMap.set(monthKey, new Map());
    const m = catMonthMap.get(monthKey)!;
    m.set(cat, (m.get(cat) ?? 0) + Number(inv.total_amount ?? 0));
  }
  const supplierCategorySpend = buildMonthlyStackedPoints(catMonthMap, 12);

  // 21. Procurement Funnel
  const poCreated   = pos.length;
  const poApproved  = pos.filter((p) => !["Draft", "Cancelled"].includes(p.status)).length;
  const grReceived  = grs.filter((g) => ["Received", "Partial"].includes(g.status)).length;
  const invoiced    = invoices.filter((i) => i.status !== "Cancelled").length;
  const paid        = invoices.filter((i) => i.status === "Paid").length;

  const funnel: ProcurementFunnelStep[] = [
    { label: "PO Created",       count: poCreated,   color: "#6366f1" },
    { label: "Approved",         count: poApproved,  color: "#3b82f6" },
    { label: "Goods Received",   count: grReceived,  color: "#0ea5e9" },
    { label: "Invoiced",         count: invoiced,    color: "#10b981" },
    { label: "Paid",             count: paid,        color: "#22c55e" },
  ];

  // 22. Supplier Leaderboard
  const supplierOrderCount = new Map<number, number>();
  const supplierSpendTotal = new Map<number, number>();
  for (const p of pos) {
    const sid = Number(p.supplier_id);
    supplierOrderCount.set(sid, (supplierOrderCount.get(sid) ?? 0) + 1);
  }
  for (const inv of invoices) {
    const sid = Number(inv.supplier_id);
    supplierSpendTotal.set(sid, (supplierSpendTotal.get(sid) ?? 0) + Number(inv.total_amount ?? 0));
  }
  const scoreMap = new Map<number, number>();
  for (const t of validTopsisScores) {
    scoreMap.set(Number(t.id), t.score * 100);
  }

  const leaderboard: SupplierLeaderboardRow[] = suppliers
    .map((s: any) => {
      const sid   = Number(s.supplier_id ?? s.id);
      const score = scoreMap.get(sid);
      if (score == null || Number.isNaN(score) || score <= 0) return null;
      return {
        rank: 0,
        supplier_id: sid,
        supplier_name: s.supplier_name ?? s.nama ?? `Supplier ${sid}`,
        ai_score: parseFloat(score.toFixed(1)),
        orders: supplierOrderCount.get(sid) ?? 0,
        spend: supplierSpendTotal.get(sid) ?? 0,
        risk: (score > 80 ? "green" : score >= 60 ? "yellow" : "red") as "green" | "yellow" | "red",
      };
    })
    .filter((row: SupplierLeaderboardRow | null): row is SupplierLeaderboardRow => row !== null)
    .sort((a: SupplierLeaderboardRow, b: SupplierLeaderboardRow) => b.ai_score - a.ai_score)
    .slice(0, 10)
    .map((row: SupplierLeaderboardRow, i: number) => ({ ...row, rank: i + 1 }));

  // 23. Supplier Risk Summary
  let green = 0, yellow = 0, red = 0;
  for (const t of validTopsisScores) {
    const pct = t.score * 100;
    if (pct > 80) green++;
    else if (pct >= 60) yellow++;
    else red++;
  }
  const riskSummary: SupplierRiskSummary = { green, yellow, red };

  return {
    kpis: {
      totalPO:                   poInRange.length,
      totalPOPrevMonth:          poInPrevRange.length,
      totalSpend,
      totalSpendPrevMonth:       totalSpendPrev,
      outstandingPO,
      avgSupplierScore,
      onTimeDeliveryRate:        onTimeRate,
      purchaseReturnCount:       returnsInRange.length,
      purchaseReturnPrevMonth:   returnsInPrevRange.length,
    },
    charts: {
      spendTrend,
      monthlyVolume,
      poStatusDistribution,
      topSuppliersBySpend,
      supplierPerformanceRanking,
      categoryDistribution,
      leadTimeTrend,
      returnTrend,
      supplierCategorySpend,
    },
    funnel,
    leaderboard,
    riskSummary,
  };
}

// ─── Helper – build 12-month time series ─────────────────────────────────────

function buildMonthlyPoints(map: Map<string, number>, months: number): MonthPoint[] {
  const result: MonthPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    result.push({ month: label, value: map.get(key) ?? 0 });
  }
  return result;
}

function buildMonthlyStackedPoints(
  map: Map<string, Map<string, number>>,
  months: number
): SupplierCategorySpend[] {
  const result: SupplierCategorySpend[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    const entry: SupplierCategorySpend = { month: label };
    const cats = map.get(key);
    if (cats) {
      for (const [cat, val] of cats.entries()) {
        entry[cat] = val;
      }
    }
    result.push(entry);
  }
  return result;
}
