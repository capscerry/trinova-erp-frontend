import { api } from "../api";

// ─── Purchase Order Header ─────────────────────────────────────
export const getPurchaseOrders = async () => {
  const res = await api.get("/purchase-order");
  return res.data;
};

export const getNextPONumber = async () => {
  const res = await api.get("/purchase-order/next-number");
  return res.data;
};

export const createPurchaseOrder = async (
  payload: any
) => {
  const res = await api.post(
    "/purchase-order",
    payload
  );

  return res.data;
};

export const updatePurchaseOrder = async (
  id: number,
  payload: any
) => {
  const res = await api.put(
    `/purchase-order/${id}`,
    payload
  );

  return res.data;
};

export const deletePurchaseOrder = async (
  id: number
) => {
  const res = await api.delete(
    `/purchase-order/${id}`
  );

  return res.data;
};

/**
 * Approve a PO via the dedicated backend endpoint.
 * The backend atomically transitions Draft → Approved and deducts
 * available_stock on every supplier-product line. Rolls back if any
 * line has insufficient stock.
 */
export const approvePurchaseOrder = async (id: number) => {
  const res = await api.patch(`/purchase-order/${id}/approve`);
  return res.data;
};

// ─── Purchase Order Detail ─────────────────────────────────────
export const getPurchaseOrderDetails = async () => {
  const res = await api.get(
    "/purchase-order-detail"
  );

  return res.data;
};

/**
 * Fetch details for a single PO.
 * Tries the query-param route first (?purchase_order_id=X), then falls back
 * to filtering the full list client-side so it works regardless of what the
 * backend exposes.
 */
export const getPurchaseOrderDetailsByPO = async (poId: number): Promise<any[]> => {
  // Attempt 1: query-param filtered endpoint.
  // Always filter the response by poId — the backend may ignore the query param
  // and return all rows, so we must never trust "non-empty" as proof of correctness.
  try {
    const res = await api.get(`/purchase-order-detail?purchase_order_id=${poId}`);
    const data: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    const filtered = data.filter(
      (item: any) => Number(item.purchase_order_id) === poId
    );
    // Only use this result if the backend actually filtered correctly.
    if (filtered.length > 0) return filtered;
  } catch {
    // Fall through to the full-list fallback.
  }

  // Attempt 2: fetch the full list and filter client-side.
  // This is the reliable path when the backend doesn't support the query param.
  const all = await getPurchaseOrderDetails();
  const list: any[] = Array.isArray(all) ? all : all?.data ?? [];
  return list.filter(
    (item: any) => Number(item.purchase_order_id) === poId
  );
};

export const createPurchaseOrderDetail = async (
  payload: any
) => {
  const res = await api.post(
    "/purchase-order-detail",
    payload
  );

  return res.data;
};

export const updatePurchaseOrderDetail = async (
  id: number,
  payload: any
) => {
  const res = await api.put(
    `/purchase-order-detail/${id}`,
    payload
  );

  return res.data;
};

export const deletePurchaseOrderDetail = async (
  id: number
) => {
  const res = await api.delete(
    `/purchase-order-detail/${id}`
  );

  return res.data;
};