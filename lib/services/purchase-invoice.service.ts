import { api } from "../api";

// ─── Internal helper ──────────────────────────────────────────────────────────

function toArray(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.items)) return d.items;
  }
  return [];
}

// ─── GET ALL INVOICE ──────────────────────────────────────────────────────────
/**
 * Fetches all Purchase Invoices.
 * Returns the raw response object (not an array) to preserve the existing
 * call-sites that do `res.data || []`.
 */
export const getPurchaseInvoices = async () => {
  try {
    console.log("[Invoice] Loading Purchase Invoices...");
    const res = await api.get("/api/purchase-invoice");
    // Normalise: some backends return { data: [...] }, others return [...] directly
    const raw = res.data;
    if (Array.isArray(raw)) {
      console.log(`[Invoice] Loaded ${raw.length} invoice(s)`);
      return raw;
    }
    const list = toArray(raw);
    console.log(`[Invoice] Loaded ${list.length} invoice(s)`);
    // Preserve original shape for callers that do `res.data || []`
    return raw ?? [];
  } catch (err: any) {
    console.error("[Invoice] Purchase Invoice retrieval failed:", err?.message ?? err);
    // Return a shape that satisfies both `Array.isArray(res)` and `res.data` callers
    return { data: [] };
  }
};

// ─── CREATE INVOICE ───────────────────────────────────────────────────────────
export const createPurchaseInvoice = async (payload: any) => {
  if (!payload?.goods_receipt_id) {
    throw new Error("goods_receipt_id diperlukan untuk membuat Purchase Invoice.");
  }
  if (!payload?.supplier_id) {
    throw new Error("supplier_id diperlukan untuk membuat Purchase Invoice.");
  }
  console.log("[Invoice] Creating Purchase Invoice for GR:", payload.goods_receipt_id);
  const res = await api.post("/api/purchase-invoice", payload);
  return res.data ?? {};
};

// ─── UPDATE INVOICE ───────────────────────────────────────────────────────────
export const updatePurchaseInvoice = async (id: number, payload: any) => {
  if (!id || id <= 0) throw new Error("ID Purchase Invoice tidak valid.");
  console.log(`[Invoice] Updating Purchase Invoice ${id}...`);
  const res = await api.put(`/api/purchase-invoice/${id}`, payload);
  return res.data ?? {};
};

// ─── DELETE INVOICE ───────────────────────────────────────────────────────────
export const deletePurchaseInvoice = async (id: number) => {
  if (!id || id <= 0) throw new Error("ID Purchase Invoice tidak valid.");
  console.log(`[Invoice] Deleting Purchase Invoice ${id}...`);
  const res = await api.delete(`/api/purchase-invoice/${id}`);
  return res.data ?? {};
};

// ─── GET UNPAID INVOICES BY SUPPLIER ─────────────────────────────────────────
export const getUnpaidInvoicesBySupplier = async (supplierId: number): Promise<any[]> => {
  try {
    if (!supplierId || supplierId <= 0) return [];
    const res = await api.get(`/api/purchase-invoice/unpaid/${supplierId}`);
    return toArray(res.data);
  } catch (err: any) {
    console.error(`[Invoice] getUnpaidInvoicesBySupplier(${supplierId}) failed:`, err?.message ?? err);
    return [];
  }
};

// ─── GET UNPAID INVOICES FOR A SPECIFIC RETURN ───────────────────────────────
/**
 * Calls GET /api/purchase-return/{id}/invoices so the frontend never needs
 * to know the supplier_id — the backend walks the GR chain itself.
 */
export const getUnpaidInvoicesForReturn = async (purchaseReturnId: number): Promise<any[]> => {
  try {
    if (!purchaseReturnId || purchaseReturnId <= 0) return [];
    const res = await api.get(`/api/purchase-return/${purchaseReturnId}/invoices`);
    return toArray(res.data);
  } catch (err: any) {
    console.error(`[Invoice] getUnpaidInvoicesForReturn(${purchaseReturnId}) failed:`, err?.message ?? err);
    return [];
  }
};

// ─── GET NEXT TAX INVOICE NUMBER ─────────────────────────────────────────────
/**
 * Calls GET /api/purchase-invoice/next-tax-number to get the next unique,
 * auto-incremented nomor faktur pajak (e.g. "FP-0000000001").
 */
export const getNextTaxInvoiceNumber = async (): Promise<string> => {
  try {
    const res = await api.get("/api/purchase-invoice/next-tax-number");
    return (
      res.data?.nomor_faktur_pajak ??
      res.data?.next_number ??
      res.data ??
      ""
    );
  } catch (err: any) {
    console.error("[Invoice] getNextTaxInvoiceNumber failed:", err?.message ?? err);
    return "";
  }
};

// ─── SYNC ALL INVOICE STATUSES (backfill) ────────────────────────────────────
/**
 * Fires POST /api/purchase-invoice/sync-status to recalculate and update the
 * status column for every non-Cancelled invoice based on live payment data.
 * Failures are swallowed — this is a background maintenance call.
 */
export const syncAllInvoiceStatuses = async () => {
  try {
    const res = await api.post("/api/purchase-invoice/sync-status");
    return res.data ?? {};
  } catch (err: any) {
    // Non-fatal: log and continue — pages load even if sync fails
    console.warn("[Invoice] syncAllInvoiceStatuses failed (non-fatal):", err?.message ?? err);
    return {};
  }
};
