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
    const res = await api.get("/api/goods-receipt");
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
  try {
    console.log("[GR] Loading Goods Receipts for return...");
    const res = await api.get("/api/goods-receipt/for-purchase-return");
    return toArray(res.data);
  } catch (err: any) {
    console.error("[GR] getGoodsReceiptsForReturn failed:", err?.message ?? err);
    return [];
  }
};

// ─── GET AVAILABLE RETURN DETAILS FOR A SPECIFIC GR ──────────────────────────
/**
 * Returns only detail lines where remaining_qty > 0, with product_name,
 * quantity (original received), and remaining_qty (max returnable).
 * Shape per item: { goods_receipt_detail_id, goods_receipt_id, product_id,
 *                   quantity, remaining_qty, product_name }
 */
export const getAvailableReturnDetails = async (grId: number): Promise<any[]> => {
  try {
    if (!grId || grId <= 0) {
      console.warn("[GR] getAvailableReturnDetails called with invalid grId:", grId);
      return [];
    }
    console.log(`[GR] Loading available return details for GR ${grId}...`);
    const res = await api.get(`/api/purchase-return/gr/${grId}/available-details`);
    return toArray(res.data);
  } catch (err: any) {
    console.error(`[GR] getAvailableReturnDetails failed for GR ${grId}:`, err?.message ?? err);
    return [];
  }
};

// ─── GET NEXT GR NUMBER ───────────────────────────────────────────────────────
export const getNextGRNumber = async () => {
  try {
    const res = await api.get("/api/goods-receipt/next-number");
    return res.data ?? {};
  } catch (err: any) {
    console.error("[GR] getNextGRNumber failed:", err?.message ?? err);
    return {};
  }
};

// ─── CREATE GR ────────────────────────────────────────────────────────────────
export const createGoodsReceipt = async (payload: any) => {
  if (!payload?.purchase_order_id) {
    throw new Error("purchase_order_id diperlukan untuk membuat Goods Receipt.");
  }
  console.log("[GR] Creating Goods Receipt for PO:", payload.purchase_order_id);
  const res = await api.post("/api/goods-receipt", payload);
  return res.data ?? {};
};

// ─── UPDATE GR ────────────────────────────────────────────────────────────────
export const updateGoodsReceipt = async (
  id: number,
  payload: Partial<{
    status: string;
    received_by: string;
    receipt_date: string;
    transaction_name: string;
    transaction_detail: string;
  }>
) => {
  if (!id || id <= 0) throw new Error("ID Goods Receipt tidak valid.");
  console.log(`[GR] Updating Goods Receipt ${id}...`);
  const res = await api.put(`/api/goods-receipt/${id}`, payload);
  return res.data ?? {};
};

// ─── CREATE GR DETAIL ────────────────────────────────────────────────────────
export const createGoodsReceiptDetail = async (payload: any) => {
  if (!payload?.goods_receipt_id) {
    throw new Error("goods_receipt_id diperlukan untuk membuat GR Detail.");
  }
  const res = await api.post("/api/goods-receipt-detail", payload);
  return res.data ?? {};
};
