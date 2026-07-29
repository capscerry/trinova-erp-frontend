/**
 * activity-log.service.ts
 *
 * Centralised activity log for the ERP dashboard timeline.
 *
 * Strategy:
 *  1. Try GET /activity-log?limit=20 — the dedicated backend endpoint that
 *     records every important transaction (PO, GR, Invoice, Payment, etc.).
 *  2. If the endpoint is not available (404 / network error), fall back to
 *     polling the individual purchasing transaction endpoints and shaping them
 *     into ActivityLogEntry objects.
 *
 * All failures are swallowed gracefully — the timeline shows an empty state
 * rather than crashing the dashboard.
 */

import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityModule =
  | "Purchasing"
  | "Inventory"
  | "Sales"
  | "MasterData"
  | "Auth"
  | string;

export type ActivityStatus = "success" | "warning" | "error" | "info";

export interface ActivityLogEntry {
  /** Stable unique key — used as React list key */
  id: string;
  module: ActivityModule;
  activityType: string;
  /** Document type label, e.g. "Purchase Order" */
  documentType: string;
  /** Human-readable document number, e.g. "PO.2026.07.00015" */
  documentNumber: string;
  title: string;
  description: string;
  /** ISO-8601 UTC timestamp */
  createdAt: string;
  userName?: string;
  /** Colour signal for the timeline dot */
  status: ActivityStatus;
  /** Optional deep-link within the app */
  href?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toIso(raw: string | null | undefined): string {
  if (!raw) return new Date(0).toISOString();
  try {
    return new Date(raw).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

function rupiah(n: number | null | undefined): string {
  if (n == null) return "–";
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);
}

/** Map a raw backend activity_type string to a human-readable label */
function activityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    purchase_requisition_created: "Purchase Requisition Created",
    purchase_order_created:       "Purchase Order Created",
    purchase_order_updated:       "Purchase Order Updated",
    purchase_order_approved:      "Purchase Order Approved",
    goods_receipt_created:        "Goods Receipt Created",
    purchase_invoice_created:     "Purchase Invoice Created",
    purchase_return_created:      "Purchase Return Created",
    purchase_payment_created:     "Purchase Payment Created",
    stock_transfer:               "Stock Transfer",
    stock_adjustment:             "Stock Adjustment",
    goods_issue:                  "Goods Issue",
    goods_receipt:                "Goods Receipt",
    stock_opname:                 "Stock Opname",
    sales_order:                  "Sales Order",
    delivery_order:               "Delivery Order",
    invoice:                      "Invoice",
    payment:                      "Payment",
    sales_return:                 "Sales Return",
    product_created:              "Product Created",
    supplier_updated:             "Supplier Updated",
    customer_added:               "Customer Added",
    login:                        "Login",
    logout:                       "Logout",
  };
  return map[type] ?? type;
}

function statusFromActivityType(type: string): ActivityStatus {
  if (type.includes("cancelled") || type.includes("error") || type.includes("failed"))
    return "error";
  if (type.includes("approved") || type.includes("paid") || type.includes("received"))
    return "success";
  if (type.includes("pending") || type.includes("partial"))
    return "warning";
  return "info";
}

const REF_TABLE_HREF: Record<string, string> = {
  purchase_order:        "/pembelian/po",
  purchase_invoice:      "/pembelian/invoice",
  goods_receipt:         "/pembelian/gr",
  purchase_payment:      "/pembelian/payment",
  purchase_down_payment: "/pembelian/pdp",
  purchase_return:       "/pembelian/retur",
  purchase_requisition:  "/pembelian/pdp",
};

// ─── Backend endpoint mapper ──────────────────────────────────────────────────

/** Maps a raw row from GET /activity-log into a normalised ActivityLogEntry */
function mapBackendEntry(raw: any, index: number): ActivityLogEntry {
  const id = String(
    raw.id ??
    raw.activity_log_id ??
    `log-${index}-${Date.now()}`
  );
  const module: ActivityModule =
    raw.module ?? raw.Module ?? "Purchasing";
  const actType: string =
    (raw.activityType ?? raw.activity_type ?? "").toLowerCase();
  const docType: string =
    raw.documentType ?? raw.document_type ?? raw.refTable ?? raw.ref_table ?? "";
  const docNumber: string =
    raw.documentNumber ?? raw.document_number ?? raw.refNumber ?? raw.ref_number ?? "";
  const title: string =
    raw.title ?? activityTypeLabel(actType);
  const description: string =
    raw.description ?? raw.Description ?? "";
  const createdAt: string =
    toIso(raw.createdAt ?? raw.created_at);
  const userName: string =
    raw.userName ?? raw.user_name ?? raw.UserName ?? "";
  const refTable: string =
    (raw.refTable ?? raw.ref_table ?? docType ?? "").toLowerCase().replace(/ /g, "_");
  const refId: number | null =
    raw.refId ?? raw.ref_id ?? null;

  return {
    id,
    module,
    activityType: actType,
    documentType: docType,
    documentNumber: docNumber,
    title,
    description,
    createdAt,
    userName: userName || undefined,
    status: statusFromActivityType(actType),
    href: refTable && refId ? (REF_TABLE_HREF[refTable] ?? undefined) : undefined,
  };
}

// ─── Fallback: build from transaction endpoints ───────────────────────────────

async function buildFromTransactions(): Promise<ActivityLogEntry[]> {
  const safeGet = async (url: string): Promise<any[]> => {
    try {
      const res = await api.get(url);
      const data = res.data;
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  };

  const [pos, grs, invs, pays, rtns, dps] = await Promise.all([
    safeGet("/api/purchase-order"),
    safeGet("/api/goods-receipt"),
    safeGet("/api/purchase-invoice"),
    safeGet("/api/purchase-payment"),
    safeGet("/api/purchase-return"),
    safeGet("/api/purchase-down-payment"),
  ]);

  const entries: ActivityLogEntry[] = [];

  pos.forEach((r: any) => {
    const num = r.po_number ?? `PO-${r.purchase_order_id ?? r.id}`;
    const status: string = (r.status ?? "").toLowerCase();
    entries.push({
      id: `po-${r.purchase_order_id ?? r.id}`,
      module: "Purchasing",
      activityType: status === "approved" ? "purchase_order_approved" : "purchase_order_created",
      documentType: "Purchase Order",
      documentNumber: num,
      title: `Purchase Order ${num}`,
      description: `Status: ${r.status ?? "–"} · Supplier: ${r.supplier?.supplier_name ?? r.supplier_name ?? "–"}`,
      createdAt: toIso(r.order_date ?? r.created_at),
      userName: r.created_by ?? undefined,
      status: status === "cancelled" ? "error" : status === "approved" || status === "completed" ? "success" : "info",
      href: "/api/pembelian/po",
    });
  });

  grs.forEach((r: any) => {
    const num = r.receipt_number ?? `GR-${r.goods_receipt_id ?? r.id}`;
    entries.push({
      id: `gr-${r.goods_receipt_id ?? r.id}`,
      module: "Purchasing",
      activityType: "goods_receipt_created",
      documentType: "Goods Receipt",
      documentNumber: num,
      title: `Goods Receipt ${num}`,
      description: `Status: ${r.status ?? "–"} · PO: ${r.purchase_order?.po_number ?? r.po_number ?? "–"}`,
      createdAt: toIso(r.receipt_date ?? r.created_at),
      userName: r.received_by ?? undefined,
      status: r.status === "Cancelled" ? "error" : r.status === "Received" ? "success" : "info",
      href: "/api/pembelian/gr",
    });
  });

  invs.forEach((r: any) => {
    const num = r.invoice_number ?? `INV-${r.purchase_invoice_id ?? r.id}`;
    const outstanding = Number(r.outstanding_amount ?? 0);
    entries.push({
      id: `inv-${r.purchase_invoice_id ?? r.id}`,
      module: "Purchasing",
      activityType: "purchase_invoice_created",
      documentType: "Purchase Invoice",
      documentNumber: num,
      title: `Purchase Invoice ${num}`,
      description: `Rp ${rupiah(Number(r.total_amount ?? 0))} · Outstanding: Rp ${rupiah(outstanding)} · ${r.supplier_name ?? "–"}`,
      createdAt: toIso(r.invoice_date ?? r.created_at),
      status: r.status === "Paid" ? "success" : r.status === "Cancelled" ? "error" : outstanding > 0 ? "warning" : "info",
      href: "/api/pembelian/invoice",
    });
  });

  pays.forEach((r: any) => {
    const num = r.payment_number ?? `PAY-${r.purchase_payment_id ?? r.id}`;
    entries.push({
      id: `pay-${r.purchase_payment_id ?? r.id}`,
      module: "Purchasing",
      activityType: "purchase_payment_created",
      documentType: "Purchase Payment",
      documentNumber: num,
      title: `Purchase Payment ${num}`,
      description: `Rp ${rupiah(Number(r.amount ?? 0))} · ${r.payment_method ?? "–"} · ${r.supplier_name ?? "–"}`,
      createdAt: toIso(r.payment_date ?? r.created_at),
      status: "success",
      href: "/api/pembelian/payment",
    });
  });

  rtns.forEach((r: any) => {
    const num = r.purchase_return_number ?? `RTN-${r.purchase_return_id ?? r.id}`;
    entries.push({
      id: `rtn-${r.purchase_return_id ?? r.id}`,
      module: "Purchasing",
      activityType: "purchase_return_created",
      documentType: "Purchase Return",
      documentNumber: num,
      title: `Purchase Return ${num}`,
      description: `Rp ${rupiah(Number(r.total_amount ?? 0))} · Status: ${r.status ?? "–"} · ${r.supplier_name ?? "–"}`,
      createdAt: toIso(r.return_date ?? r.created_at),
      status: r.status === "Closed" ? "success" : r.status === "Cancelled" ? "error" : "warning",
      href: "/api/pembelian/retur",
    });
  });

  dps.forEach((r: any) => {
    const num = r.dp_number ?? `DP-${r.purchase_down_payment_id ?? r.id}`;
    entries.push({
      id: `dp-${r.purchase_down_payment_id ?? r.id}`,
      module: "Purchasing",
      activityType: "purchase_payment_created",
      documentType: "Down Payment",
      documentNumber: num,
      title: `Down Payment ${num}`,
      description: `Rp ${rupiah(Number(r.amount ?? r.dp_amount ?? 0))} · Status: ${r.status ?? "–"} · ${r.supplier_name ?? "–"}`,
      createdAt: toIso(r.payment_date ?? r.dp_date ?? r.created_at),
      status: r.status === "Paid" ? "success" : r.status === "Cancelled" ? "error" : "warning",
      href: "/api/pembelian/pdp",
    });
  });

  // Sort newest first and cap at 20
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return entries.slice(0, 20);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches the latest 20 activity log entries for the dashboard timeline.
 *
 * Tries the dedicated /activity-log endpoint first.  Falls back to polling
 * individual transaction endpoints if the dedicated endpoint is unavailable.
 * Never throws — returns an empty array on complete failure.
 */
export async function getRecentActivities(limit = 20): Promise<ActivityLogEntry[]> {
  try {
    // Attempt 1: dedicated activity log endpoint
    const res = await api.get(`/api/activity-log?limit=${limit}`);
    const data = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data?.items ?? []);

    if (Array.isArray(data) && data.length > 0) {
      const mapped = data
        .map((item: any, i: number) => mapBackendEntry(item, i))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      console.log(`[ActivityLog] Loaded ${mapped.length} entries from /activity-log`);
      return mapped;
    }
  } catch (err: any) {
    // 404 = endpoint not implemented yet — use fallback silently
    const status = err?.response?.status ?? err?.status;
    if (status !== 404) {
      console.warn("[ActivityLog] /activity-log request failed:", err?.message ?? err);
    }
  }

  // Attempt 2: build from individual transaction endpoints
  console.log("[ActivityLog] Falling back to transaction endpoint polling");
  try {
    return await buildFromTransactions();
  } catch (err) {
    console.error("[ActivityLog] Fallback also failed:", err);
    return [];
  }
}
