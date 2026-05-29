import { api } from "../api";

// ─── Purchase Order Header ─────────────────────────────────────
export const getPurchaseOrders = async () => {
  const res = await api.get("/purchase-order");
  return res.data;
};

export const createPurchaseOrder = async (payload: any) => {
  const res = await api.post(
    "/purchase-order",
    payload
  );

  return res.data;
};

// ─── Purchase Order Detail ─────────────────────────────────────
export const getPurchaseOrderDetails = async () => {
  const res = await api.get(
    "/purchase-order-detail"
  );

  return res.data;
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