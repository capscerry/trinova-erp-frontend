/**
 * transaction-activity.service.ts
 *
 * Fetches the most-recent records from each purchasing transaction endpoint
 * and converts them into a flat array of NotificationItem-compatible objects,
 * sorted newest-first.
 *
 * Each item carries a stable `sourceKey` (e.g. "po-42") so the caller can
 * deduplicate against notifications that were already push-recorded by
 * notify.success / notify.error during the same session.
 */

import { api } from "@/lib/api";
import type { NotifType, NotificationItem } from "@/lib/notification-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(raw: string | null | undefined): Date {
  if (!raw) return new Date(0);
  return new Date(raw);
}

function rupiah(n: number | null | undefined): string {
  if (n == null) return "–";
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);
}

/**
 * Shape of a fetched activity item before it is converted to a
 * NotificationItem.  The `sourceKey` is used for deduplication.
 */
export interface ActivityRecord {
  /** Stable key used for deduplication, e.g. "po-42" */
  sourceKey: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: Date;
  /** Module label shown in the badge, e.g. "PO" */
  module: string;
  /** Human-readable doc number, e.g. "PO-0000000042" */
  docNumber: string;
}

// ─── Per-module fetchers ───────────────────────────────────────────────────────

async function fetchPOAlerts(): Promise<ActivityRecord[]> {
  try {
    const res = await api.get("/purchase-order");
    const rows: any[] = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? []);

    return rows.map((r) => {
      const num = r.po_number ?? r.nomor ?? `PO-${r.purchase_order_id ?? r.id}`;
      const status: string = r.status ?? "–";
      const supplier: string = r.supplier_name ?? r.supplier ?? "–";

      const type: NotifType =
        status === "Cancelled" ? "error" :
        status === "Approved"  ? "success" :
        status === "Completed" ? "success" :
        "info";

      return {
        sourceKey: `po-${r.purchase_order_id ?? r.id}`,
        type,
        title: `Purchase Order ${num}`,
        message: `Status: ${status} · Supplier: ${supplier}`,
        timestamp: toDate(r.order_date ?? r.tanggal ?? r.created_at),
        module: "PO",
        docNumber: num,
      } satisfies ActivityRecord;
    });
  } catch {
    return [];
  }
}

async function fetchDPAlerts(): Promise<ActivityRecord[]> {
  try {
    const res = await api.get("/purchase-down-payment");
    const rows: any[] = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? []);

    return rows.map((r) => {
      const num = r.dp_number ?? `DP-${r.purchase_down_payment_id ?? r.id}`;
      const status: string = r.status ?? "–";
      const supplier: string = r.supplier_name ?? "–";
      const amount: number = r.amount ?? r.dp_amount ?? 0;

      const type: NotifType =
        status === "Paid"      ? "success" :
        status === "Cancelled" ? "error"   :
        "warning";

      return {
        sourceKey: `dp-${r.purchase_down_payment_id ?? r.id}`,
        type,
        title: `Down Payment ${num}`,
        message: `Rp ${rupiah(amount)} · Status: ${status} · Supplier: ${supplier}`,
        timestamp: toDate(r.payment_date ?? r.dp_date ?? r.created_at),
        module: "DP",
        docNumber: num,
      } satisfies ActivityRecord;
    });
  } catch {
    return [];
  }
}

async function fetchGRAlerts(): Promise<ActivityRecord[]> {
  try {
    const res = await api.get("/goods-receipt");
    const rows: any[] = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? []);

    return rows.map((r) => {
      const num = r.receipt_number ?? r.gr_number ?? `GR-${r.goods_receipt_id ?? r.id}`;
      const status: string = r.status ?? "–";
      const poNum: string = r.po_number ?? "–";

      const type: NotifType =
        status === "Cancelled" ? "error"   :
        status === "Received"  ? "success" :
        "info";

      return {
        sourceKey: `gr-${r.goods_receipt_id ?? r.id}`,
        type,
        title: `Goods Receipt ${num}`,
        message: `Status: ${status} · PO: ${poNum}`,
        timestamp: toDate(r.receipt_date ?? r.created_at),
        module: "GR",
        docNumber: num,
      } satisfies ActivityRecord;
    });
  } catch {
    return [];
  }
}

async function fetchInvoiceAlerts(): Promise<ActivityRecord[]> {
  try {
    const res = await api.get("/purchase-invoice");
    const rows: any[] = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? []);

    return rows.map((r) => {
      const num = r.invoice_number ?? `INV-${r.purchase_invoice_id ?? r.id}`;
      const status: string = r.status ?? "–";
      const supplier: string = r.supplier_name ?? "–";
      const total: number = r.total_amount ?? 0;

      const type: NotifType =
        status === "Paid"      ? "success" :
        status === "Cancelled" ? "error"   :
        status === "Unpaid"    ? "warning" :
        "info";

      return {
        sourceKey: `inv-${r.purchase_invoice_id ?? r.id}`,
        type,
        title: `Invoice Pembelian ${num}`,
        message: `Rp ${rupiah(total)} · Status: ${status} · Supplier: ${supplier}`,
        timestamp: toDate(r.invoice_date ?? r.created_at),
        module: "Invoice",
        docNumber: num,
      } satisfies ActivityRecord;
    });
  } catch {
    return [];
  }
}

async function fetchPaymentAlerts(): Promise<ActivityRecord[]> {
  try {
    const res = await api.get("/purchase-payment");
    const rows: any[] = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? []);

    return rows.map((r) => {
      const num = r.payment_number ?? `PAY-${r.purchase_payment_id ?? r.id}`;
      const status: string = r.status ?? "–";
      const supplier: string = r.supplier_name ?? "–";
      const amount: number = r.amount ?? 0;

      const type: NotifType =
        status === "Paid"      ? "success" :
        status === "Cancelled" ? "error"   :
        "info";

      return {
        sourceKey: `pay-${r.purchase_payment_id ?? r.id}`,
        type,
        title: `Pembayaran ${num}`,
        message: `Rp ${rupiah(amount)} · Status: ${status} · Supplier: ${supplier}`,
        timestamp: toDate(r.payment_date ?? r.created_at),
        module: "Payment",
        docNumber: num,
      } satisfies ActivityRecord;
    });
  } catch {
    return [];
  }
}

async function fetchReturnAlerts(): Promise<ActivityRecord[]> {
  try {
    const res = await api.get("/purchase-return");
    const rows: any[] = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? []);

    return rows.map((r) => {
      const num =
        r.purchase_return_number ?? `RTN-${r.purchase_return_id ?? r.id}`;
      const status: string = r.status ?? "–";
      const supplier: string = r.supplier_name ?? "–";
      const total: number = r.total_amount ?? 0;

      const type: NotifType =
        status === "Closed"           ? "success" :
        status === "Cancelled"        ? "error"   :
        status === "Deduction Locked" ? "warning" :
        "info";

      return {
        sourceKey: `rtn-${r.purchase_return_id ?? r.id}`,
        type,
        title: `Retur Pembelian ${num}`,
        message: `Rp ${rupiah(total)} · Status: ${status} · Supplier: ${supplier}`,
        timestamp: toDate(r.return_date ?? r.created_at),
        module: "Retur",
        docNumber: num,
      } satisfies ActivityRecord;
    });
  } catch {
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches all transaction types in parallel and returns them sorted
 * newest-first.  Individual endpoint failures are swallowed so that
 * a single unavailable module does not break the whole panel.
 */
export async function fetchAllTransactionAlerts(): Promise<ActivityRecord[]> {
  const [pos, dps, grs, invs, pays, rtns] = await Promise.all([
    fetchPOAlerts(),
    fetchDPAlerts(),
    fetchGRAlerts(),
    fetchInvoiceAlerts(),
    fetchPaymentAlerts(),
    fetchReturnAlerts(),
  ]);

  const all = [...pos, ...dps, ...grs, ...invs, ...pays, ...rtns];

  // Sort newest-first
  all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return all;
}

/**
 * Convert an ActivityRecord to a NotificationItem so it can be
 * inserted directly into the NotificationContext state.
 */
export function activityToNotification(
  record: ActivityRecord,
  counter: number
): NotificationItem {
  return {
    id: `tx-${record.sourceKey}-${counter}`,
    type: record.type,
    title: record.title,
    message: record.message,
    timestamp: record.timestamp,
    read: false,
  };
}
