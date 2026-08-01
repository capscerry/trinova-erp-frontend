import { api } from "../api";

// ─── Internal helper ──────────────────────────────────────────────────────────

/** Normalise any list response to a plain array, never null. */
function toArray(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.items)) return d.items;
  }
  return [];
}

// ─── GET ALL GR ───────────────────────────────────────────────────────────────
/**
 * Fetches all Goods Receipts.
 * Returns an empty array (never throws) so pages never crash on a bad response.
 */
export const getGoodsReceipts = async (): Promise<any[]> => {
  try {
    console.log("[GR] Loading Goods Receipts...");
    const res = await api.get("/goods-receipt");
    const list = toArray(res.data);
    console.log(`[GR] Loaded ${list.length} Goods Receipt(s)`);
    return list;
  } catch (err: any) {
    console.error("[GR] Goods Receipt retrieval failed:", err?.message ?? err);
    return [];
  }
};

// ─── GET GRs AVAILABLE FOR PURCHASE RETURN ────────────────────────────────────
/**
 * Only returns GRs that have at least one detail line with remaining_qty > 0.
 * Use this instead of getGoodsReceipts when loading the GR picker in the
 * Purchase Return creation form.
 */
export const getGoodsReceiptsForReturn = async (): Promise<any[]> => {
  console.log("[GR] Loading Goods Receipts for return...");
  const res = await api.get("/goods-receipt/for-purchase-return");
  return toArray(res.data);
};

// ─── GET AVAILABLE RETURN DETAILS FOR A SPECIFIC GR ──────────────────────────
/**
 * Returns only detail lines where remaining_qty > 0, with product_name,
 * quantity (original received), and remaining_qty (max returnable).
 * Shape per item: { goods_receipt_detail_id, goods_receipt_id, product_id,
 *                   quantity, remaining_qty, product_name }
 */
export const getAvailableReturnDetails = async (grId: number): Promise<any[]> => {
  if (!grId || grId <= 0) {
    console.warn("[GR] getAvailableReturnDetails called with invalid grId:", grId);
    return [];
  }
  console.log(`[GR] Loading available return details for GR ${grId}...`);
  const res = await api.get(`/api/purchase-return/gr/${grId}/available-details`);
  return toArray(res.data);
};

// ─── GET NEXT GR NUMBER ───────────────────────────────────────────────────────
export const getNextGRNumber = async () => {
  try {
    const res = await api.get("/goods-receipt/next-number");
    return res.data ?? {};
  } catch (err: any) {
    console.error("[GR] getNextGRNumber failed:", err?.message ?? err);
    return {};
  }
};

// ─── GET GR BY ID (header + items) ───────────────────────────────────────────
/** Same endpoint the print page uses -- header fields plus a nested items[] array. */
export const getGoodsReceiptById = async (id: number): Promise<any> => {
  const res = await api.get(`/goods-receipt/${id}`);
  return res.data?.data ?? res.data;
};

// ─── CREATE GR ────────────────────────────────────────────────────────────────
export const createGoodsReceipt = async (payload: any) => {
  if (!payload?.purchase_order_id) {
    throw new Error("purchase_order_id diperlukan untuk membuat Goods Receipt.");
  }
  console.log("[GR] Creating Goods Receipt for PO:", payload.purchase_order_id);
  const res = await api.post("/goods-receipt", payload);
  return res.data ?? {};
};

// ─── UPDATE GR ────────────────────────────────────────────────────────────────
/**
 * Updates non-status fields of a Goods Receipt.
 * Status is always determined by the backend based on received vs ordered
 * quantities — it must not be passed from the frontend.
 */
export const updateGoodsReceipt = async (
  id: number,
  payload: Partial<{
    received_by: string;
    receipt_date: string;
    transaction_name: string;
    transaction_detail: string;
  }>
) => {
  if (!id || id <= 0) throw new Error("ID Goods Receipt tidak valid.");
  console.log(`[GR] Updating Goods Receipt ${id}...`);
  const res = await api.put(`/goods-receipt/${id}`, payload);
  return res.data ?? {};
};

// ─── CANCEL GR ────────────────────────────────────────────────────────────────
/**
 * Cancels a Goods Receipt via the dedicated backend endpoint.
 * The backend sets status = "Cancelled" — the frontend never sets status directly.
 */
export const cancelGoodsReceipt = async (id: number) => {
  if (!id || id <= 0) throw new Error("ID Goods Receipt tidak valid.");
  console.log(`[GR] Cancelling Goods Receipt ${id}...`);
  const res = await api.patch(`/goods-receipt/${id}/cancel`);
  return res.data ?? {};
};

// ─── RECALCULATE GR STATUS ────────────────────────────────────────────────────
/**
 * Asks the backend to recalculate and persist the status of a single GR.
 * Rules (applied by backend):
 *   - Cancelled  → if GR is already marked cancelled
 *   - Open       → received quantity = 0
 *   - Partial    → total received < ordered quantity
 *   - Received   → total received = ordered quantity
 * Call this after any GR creation, edit, or cancellation to ensure the
 * status returned on the next GET reflects the latest quantities.
 */
export const recalculateGRStatus = async (id: number): Promise<void> => {
  if (!id || id <= 0) return;
  try {
    console.log(`[GR] Recalculating status for GR ${id}...`);
    await api.patch(`/goods-receipt/${id}/recalculate-status`);
  } catch (err: any) {
    // Non-fatal: log and continue — the next full refresh will pick up the right status.
    console.warn(`[GR] recalculateGRStatus failed for GR ${id}:`, err?.message ?? err);
  }
};

// ─── CREATE GR DETAIL ────────────────────────────────────────────────────────
export const createGoodsReceiptDetail = async (payload: any) => {
  if (!payload?.goods_receipt_id) {
    throw new Error("goods_receipt_id diperlukan untuk membuat GR Detail.");
  }
  const res = await api.post("/goods-receipt-detail", payload);
  return res.data ?? {};
};
