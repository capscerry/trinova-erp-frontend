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