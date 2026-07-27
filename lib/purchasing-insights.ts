/**
 * lib/purchasing-insights.ts
 *
 * Pure calculation engine for the AI Purchasing Insight page.
 * All functions are side-effect-free and work on raw API data arrays.
 */

// ─── Raw API shape hints (kept loose so they work regardless of API changes) ──

export interface RawPO {
  purchase_order_id: number;
  po_number: string;
  order_date: string;        // ISO date string
  supplier_id: number;
  supplier?: { supplier_name: string };
  status: string;
  total_amount: number;
}

export interface RawPODetail {
  purchase_order_detail_id: number;
  purchase_order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface RawGR {
  goods_receipt_id: number;
  purchase_order_id: number;
  receipt_date: string;      // ISO date string
  status?: string;
}

export interface RawInvoice {
  purchase_invoice_id: number;
  purchase_order_id?: number;
  goods_receipt_id?: number;
  invoice_date?: string;
  due_date?: string;
  total_amount: number;
  status?: string;
}

export interface RawPayment {
  purchase_payment_id: number;
  purchase_invoice_id?: number;
  payment_date?: string;
  amount: number;
}

export interface RawSupplierProduct {
  supplier_id: number;
  product_id: number;
  supplier_price: number;
  lead_time_days?: number;
  available_stock?: number;
}

export interface RawSupplier {
  supplier_id: number;
  supplier_name: string;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface SpendSummary {
  totalSpend: number;
  totalOrders: number;
  totalApproved: number;
  totalPending: number;
  totalCancelled: number;
  avgOrderValue: number;
  /** Spend grouped by month label "MMM YYYY" → amount */
  spendByMonth: { month: string; amount: number }[];
  /** Spend grouped by supplier_id → { name, amount, orderCount } */
  spendBySupplier: { supplierId: number; name: string; amount: number; orderCount: number }[];
}

export interface LeadTimeStats {
  supplierId: number;
  supplierName: string;
  /** Average days between PO order_date and GR receipt_date */
  avgLeadTimeDays: number;
  grCount: number;
  /** Catalog lead_time_days from supplier-product (if available) */
  catalogLeadTime: number | null;
  /** Diff: actual – catalog (positive = late) */
  leadTimeDelta: number | null;
}

export interface PaymentHealthStats {
  totalInvoiced: number;
  totalPaid: number;
  unpaidAmount: number;
  paymentRate: number; // 0–1
  overdueInvoices: number;
  avgDaysToPayment: number | null;
}

export interface SupplierScore {
  supplierId: number;
  supplierName: string;
  // raw metrics
  totalSpend: number;
  orderCount: number;
  avgLeadTimeDays: number | null;
  catalogLeadTime: number | null;
  avgPrice: number | null;          // avg supplier_price from catalog
  onTimeRate: number;               // 0–1 (GRs within catalogLeadTime)
  invoiceCount: number;
  // AHP-TOPSIS output
  ahpScore: number;                 // 0–1 closeness coefficient
  rank: number;
}

export interface ReorderCandidate {
  productId: number;
  productName: string;
  supplierId: number;
  supplierName: string;
  availableStock: number;
  catalogLeadTime: number | null;
  lastPrice: number | null;
  /** Simple urgency score: lower stock + higher lead time = higher urgency */
  urgencyScore: number;
}

// ─── 1. Spend Summary ─────────────────────────────────────────────────────────

export function calcSpendSummary(
  pos: RawPO[],
  suppliers: RawSupplier[]
): SpendSummary {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s.supplier_name]));

  const totalSpend = pos.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
  const totalOrders = pos.length;
  const totalApproved = pos.filter((p) => ["Approved", "Processed", "Completed", "Partially processed"].includes(p.status)).length;
  const totalPending = pos.filter((p) => ["Draft", "Waiting to be processed"].includes(p.status)).length;
  const totalCancelled = pos.filter((p) => p.status === "Cancelled").length;
  const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

  // Spend by month
  const monthMap = new Map<string, number>();
  for (const po of pos) {
    if (!po.order_date) continue;
    const d = new Date(po.order_date);
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    monthMap.set(label, (monthMap.get(label) ?? 0) + Number(po.total_amount ?? 0));
  }
  const spendByMonth = Array.from(monthMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => {
      // parse back to sort chronologically
      const parse = (s: string) => new Date(s.replace(/(\w+)\s(\d{4})/, "$1 1 $2")).getTime();
      return parse(a.month) - parse(b.month);
    });

  // Spend by supplier
  const supMap = new Map<number, { name: string; amount: number; orderCount: number }>();
  for (const po of pos) {
    const sid = po.supplier_id;
    const name = po.supplier?.supplier_name ?? supplierMap.get(sid) ?? `Supplier ${sid}`;
    const prev = supMap.get(sid) ?? { name, amount: 0, orderCount: 0 };
    supMap.set(sid, {
      name,
      amount: prev.amount + Number(po.total_amount ?? 0),
      orderCount: prev.orderCount + 1,
    });
  }
  const spendBySupplier = Array.from(supMap.entries())
    .map(([supplierId, v]) => ({ supplierId, ...v }))
    .sort((a, b) => b.amount - a.amount);

  return { totalSpend, totalOrders, totalApproved, totalPending, totalCancelled, avgOrderValue, spendByMonth, spendBySupplier };
}

// ─── 2. Lead-time stats ───────────────────────────────────────────────────────

export function calcLeadTimeStats(
  pos: RawPO[],
  grs: RawGR[],
  supplierProducts: RawSupplierProduct[],
  suppliers: RawSupplier[]
): LeadTimeStats[] {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s.supplier_name]));
  const poMap = new Map(pos.map((p) => [p.purchase_order_id, p]));

  // catalog lead time: min across all products for a supplier
  const catalogMap = new Map<number, number[]>();
  for (const sp of supplierProducts) {
    if (sp.lead_time_days != null) {
      const arr = catalogMap.get(sp.supplier_id) ?? [];
      arr.push(sp.lead_time_days);
      catalogMap.set(sp.supplier_id, arr);
    }
  }
  const avgCatalogLeadTime = (sid: number): number | null => {
    const arr = catalogMap.get(sid);
    if (!arr || arr.length === 0) return null;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  };

  // actual lead time per PO → per supplier
  const supActual = new Map<number, number[]>();
  for (const gr of grs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po || !gr.receipt_date || !po.order_date) continue;
    const days = (new Date(gr.receipt_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
    if (days < 0 || days > 365) continue; // sanity filter
    const arr = supActual.get(po.supplier_id) ?? [];
    arr.push(days);
    supActual.set(po.supplier_id, arr);
  }

  const result: LeadTimeStats[] = [];
  for (const [sid, days] of supActual.entries()) {
    const avgLeadTimeDays = days.reduce((s, v) => s + v, 0) / days.length;
    const catalogLeadTime = avgCatalogLeadTime(sid);
    result.push({
      supplierId: sid,
      supplierName: supplierMap.get(sid) ?? `Supplier ${sid}`,
      avgLeadTimeDays: Math.round(avgLeadTimeDays * 10) / 10,
      grCount: days.length,
      catalogLeadTime: catalogLeadTime !== null ? Math.round(catalogLeadTime * 10) / 10 : null,
      leadTimeDelta: catalogLeadTime !== null ? Math.round((avgLeadTimeDays - catalogLeadTime) * 10) / 10 : null,
    });
  }
  return result.sort((a, b) => a.avgLeadTimeDays - b.avgLeadTimeDays);
}

// ─── 3. Payment health ────────────────────────────────────────────────────────

export function calcPaymentHealth(
  invoices: RawInvoice[],
  payments: RawPayment[]
): PaymentHealthStats {
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);

  // Map invoice → total paid
  const paidMap = new Map<number, number>();
  for (const p of payments) {
    const iid = p.purchase_invoice_id;
    if (iid == null) continue;
    paidMap.set(iid, (paidMap.get(iid) ?? 0) + Number(p.amount ?? 0));
  }

  const totalPaid = Array.from(paidMap.values()).reduce((s, v) => s + v, 0);
  const unpaidAmount = Math.max(0, totalInvoiced - totalPaid);
  const paymentRate = totalInvoiced > 0 ? Math.min(1, totalPaid / totalInvoiced) : 0;

  // Overdue: has due_date in the past and not fully paid
  const today = Date.now();
  const overdueInvoices = invoices.filter((inv) => {
    if (!inv.due_date) return false;
    const due = new Date(inv.due_date).getTime();
    const paid = paidMap.get(inv.purchase_invoice_id) ?? 0;
    return due < today && paid < Number(inv.total_amount ?? 0);
  }).length;

  // Avg days from invoice_date → first payment
  const paymentDelays: number[] = [];
  for (const inv of invoices) {
    if (!inv.invoice_date) continue;
    const invTime = new Date(inv.invoice_date).getTime();
    // find earliest payment for this invoice
    const relevantPayments = payments
      .filter((p) => p.purchase_invoice_id === inv.purchase_invoice_id && p.payment_date)
      .map((p) => new Date(p.payment_date!).getTime())
      .filter((t) => !isNaN(t));
    if (relevantPayments.length === 0) continue;
    const firstPayment = Math.min(...relevantPayments);
    const days = (firstPayment - invTime) / 86_400_000;
    if (days >= 0 && days < 365) paymentDelays.push(days);
  }
  const avgDaysToPayment =
    paymentDelays.length > 0
      ? Math.round((paymentDelays.reduce((s, v) => s + v, 0) / paymentDelays.length) * 10) / 10
      : null;

  return { totalInvoiced, totalPaid, unpaidAmount, paymentRate, overdueInvoices, avgDaysToPayment };
}

// ─── 4. AHP + TOPSIS supplier scoring ────────────────────────────────────────
//
// Criteria and weights (fixed, pre-computed via AHP pairwise matrix):
//   - Spend share       15%  Cost → higher share = more strategic, benefit
//   - Order count       10%  Benefit
//   - Avg lead time     30%  Cost   → lower = better
//   - On-time rate      25%  Benefit
//   - Avg price index   20%  Cost   → lower unit price = better
//
// These weights reflect common procurement AHP priorities.

const WEIGHTS = [0.15, 0.10, 0.30, 0.25, 0.20];
const BENEFIT = [true, true, false, true, false];

function vecNorm(col: number[]): number {
  return Math.sqrt(col.reduce((s, v) => s + v * v, 0)) || 1;
}

export function calcSupplierScores(
  pos: RawPO[],
  grs: RawGR[],
  supplierProducts: RawSupplierProduct[],
  invoices: RawInvoice[],
  suppliers: RawSupplier[]
): SupplierScore[] {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s.supplier_name]));
  const poMap = new Map(pos.map((p) => [p.purchase_order_id, p]));

  // ── per-supplier aggregates ───────────────────────────────────────────────
  const agg = new Map<number, {
    spend: number; orders: number;
    actualDays: number[]; catalogDays: number[];
    prices: number[]; invoiceCount: number;
  }>();

  const ensureAgg = (sid: number) => {
    if (!agg.has(sid)) agg.set(sid, { spend: 0, orders: 0, actualDays: [], catalogDays: [], prices: [], invoiceCount: 0 });
    return agg.get(sid)!;
  };

  for (const po of pos) {
    const a = ensureAgg(po.supplier_id);
    a.spend += Number(po.total_amount ?? 0);
    a.orders += 1;
  }

  for (const gr of grs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po || !gr.receipt_date || !po.order_date) continue;
    const days = (new Date(gr.receipt_date).getTime() - new Date(po.order_date).getTime()) / 86_400_000;
    if (days >= 0 && days <= 365) ensureAgg(po.supplier_id).actualDays.push(days);
  }

  for (const sp of supplierProducts) {
    const a = ensureAgg(sp.supplier_id);
    if (sp.lead_time_days != null) a.catalogDays.push(sp.lead_time_days);
    if (sp.supplier_price != null) a.prices.push(Number(sp.supplier_price));
  }

  // Build a GR → supplier_id lookup so invoices that only carry
  // goods_receipt_id (no purchase_order_id) can still be attributed.
  const grSupplierMap = new Map<number, number>();
  for (const gr of grs) {
    const po = poMap.get((gr as any).purchase_order_id);
    if (po) grSupplierMap.set((gr as any).goods_receipt_id, po.supplier_id);
  }

  for (const inv of invoices) {
    let supplierId: number | undefined;

    // Primary join: invoice carries a direct purchase_order_id
    if (inv.purchase_order_id != null) {
      const po = poMap.get(inv.purchase_order_id);
      if (po) supplierId = po.supplier_id;
    }

    // Fallback join: invoice carries only goods_receipt_id → resolve via GR → PO
    if (supplierId == null && inv.goods_receipt_id != null) {
      supplierId = grSupplierMap.get(inv.goods_receipt_id);
    }

    if (supplierId != null) {
      ensureAgg(supplierId).invoiceCount += 1;
    }
  }

  if (agg.size === 0) return [];

  const totalSpend = Array.from(agg.values()).reduce((s, a) => s + a.spend, 0) || 1;

  // ── build raw matrix ──────────────────────────────────────────────────────
  type Row = { sid: number; raw: [number, number, number, number, number] };
  const rows: Row[] = [];

  for (const [sid, a] of agg.entries()) {
    const spendShare = a.spend / totalSpend;
    const orderCount = a.orders;
    const avgLeadTime = a.actualDays.length > 0
      ? a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length
      : (a.catalogDays.length > 0 ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length : 30);
    const catalogLT = a.catalogDays.length > 0 ? a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length : null;
    const onTimeCount = a.actualDays.filter((d, i) => {
      const clt = catalogLT ?? 14;
      return d <= clt;
    }).length;
    const onTimeRate = a.actualDays.length > 0 ? onTimeCount / a.actualDays.length : 0.5;
    const avgPrice = a.prices.length > 0 ? a.prices.reduce((s, v) => s + v, 0) / a.prices.length : 0;

    rows.push({ sid, raw: [spendShare, orderCount, avgLeadTime, onTimeRate, avgPrice] });
  }

  // ── normalise (vector) ────────────────────────────────────────────────────
  const n = rows.length;
  const m = 5;
  const colNorms = Array.from({ length: m }, (_, j) => vecNorm(rows.map((r) => r.raw[j])));
  const norm = rows.map((r) => ({
    sid: r.sid,
    v: r.raw.map((val, j) => val / colNorms[j]) as [number, number, number, number, number],
  }));

  // ── weighted ──────────────────────────────────────────────────────────────
  const weighted = norm.map((r) => ({
    sid: r.sid,
    v: r.v.map((val, j) => val * WEIGHTS[j]) as [number, number, number, number, number],
  }));

  // ── ideal best / worst ────────────────────────────────────────────────────
  const aPlus = Array.from({ length: m }, (_, j) => {
    const col = weighted.map((r) => r.v[j]);
    return BENEFIT[j] ? Math.max(...col) : Math.min(...col);
  });
  const aMinus = Array.from({ length: m }, (_, j) => {
    const col = weighted.map((r) => r.v[j]);
    return BENEFIT[j] ? Math.min(...col) : Math.max(...col);
  });

  // ── separation + closeness ────────────────────────────────────────────────
  const scored = weighted.map((r) => {
    const dPlus = Math.sqrt(r.v.reduce((s, val, j) => s + (val - aPlus[j]) ** 2, 0));
    const dMinus = Math.sqrt(r.v.reduce((s, val, j) => s + (val - aMinus[j]) ** 2, 0));
    const ci = dPlus + dMinus === 0 ? 0 : dMinus / (dPlus + dMinus);
    return { sid: r.sid, ci };
  });

  scored.sort((a, b) => b.ci - a.ci);

  // ── assemble final objects ────────────────────────────────────────────────
  return scored.map(({ sid, ci }, idx) => {
    const a = agg.get(sid)!;
    const catalogLT = a.catalogDays.length > 0
      ? Math.round((a.catalogDays.reduce((s, v) => s + v, 0) / a.catalogDays.length) * 10) / 10
      : null;
    const avgLeadTimeDays = a.actualDays.length > 0
      ? Math.round((a.actualDays.reduce((s, v) => s + v, 0) / a.actualDays.length) * 10) / 10
      : null;
    const onTimeCount = a.actualDays.filter((d) => d <= (catalogLT ?? 14)).length;
    const onTimeRate = a.actualDays.length > 0 ? onTimeCount / a.actualDays.length : 0;
    const avgPrice = a.prices.length > 0
      ? Math.round((a.prices.reduce((s, v) => s + v, 0) / a.prices.length) * 100) / 100
      : null;

    return {
      supplierId: sid,
      supplierName: supplierMap.get(sid) ?? `Supplier ${sid}`,
      totalSpend: a.spend,
      orderCount: a.orders,
      avgLeadTimeDays,
      catalogLeadTime: catalogLT,
      avgPrice,
      onTimeRate,
      invoiceCount: a.invoiceCount,
      ahpScore: Math.round(ci * 10000) / 10000,
      rank: idx + 1,
    };
  });
}

// ─── 5. Reorder candidates ────────────────────────────────────────────────────

export function calcReorderCandidates(
  supplierProducts: RawSupplierProduct[],
  suppliers: RawSupplier[],
  poDetails: RawPODetail[]
): ReorderCandidate[] {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s.supplier_name]));

  // last price per product from PO details
  const lastPriceMap = new Map<number, number>();
  for (const d of poDetails) {
    lastPriceMap.set(d.product_id, Number(d.price));
  }

  const candidates: ReorderCandidate[] = [];
  for (const sp of supplierProducts) {
    const stock = Number(sp.available_stock ?? 0);
    if (stock > 100) continue; // only low-stock items
    const leadTime = sp.lead_time_days ?? null;
    // urgency: inverse stock (capped 0–100) + lead time weight
    const stockScore = Math.max(0, 100 - stock); // 0 stock → 100 pts
    const leadScore = leadTime != null ? Math.min(leadTime * 2, 40) : 20;
    const urgencyScore = Math.round(stockScore * 0.7 + leadScore * 0.3);

    candidates.push({
      productId: sp.product_id,
      productName: `Produk #${sp.product_id}`,
      supplierId: sp.supplier_id,
      supplierName: supplierMap.get(sp.supplier_id) ?? `Supplier ${sp.supplier_id}`,
      availableStock: stock,
      catalogLeadTime: leadTime,
      lastPrice: lastPriceMap.get(sp.product_id) ?? null,
      urgencyScore,
    });
  }
  return candidates.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 20);
}

// ─── 6. Spend concentration (Pareto / HHI) ────────────────────────────────────

export interface ConcentrationResult {
  /** % of spend covered by top 20% of suppliers (Pareto) */
  paretoPercent: number;
  /** Herfindahl-Hirschman Index 0–10000 (>2500 = highly concentrated) */
  hhi: number;
  hhiLabel: "Low" | "Moderate" | "High";
}

export function calcSpendConcentration(spendBySupplier: SpendSummary["spendBySupplier"]): ConcentrationResult {
  const total = spendBySupplier.reduce((s, r) => s + r.amount, 0) || 1;
  const sorted = [...spendBySupplier].sort((a, b) => b.amount - a.amount);
  const top20Count = Math.max(1, Math.ceil(sorted.length * 0.2));
  const top20Spend = sorted.slice(0, top20Count).reduce((s, r) => s + r.amount, 0);
  const paretoPercent = Math.round((top20Spend / total) * 100);

  const hhi = Math.round(
    sorted.reduce((s, r) => {
      const share = (r.amount / total) * 100;
      return s + share * share;
    }, 0)
  );

  const hhiLabel: ConcentrationResult["hhiLabel"] =
    hhi >= 2500 ? "High" : hhi >= 1500 ? "Moderate" : "Low";

  return { paretoPercent, hhi, hhiLabel };
}
