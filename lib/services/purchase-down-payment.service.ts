import { api } from "../api";

// ─── Purchase Down Payment ─────────────────────────────────────

export const getPurchaseDownPayments =
  async () => {
    const res = await api.get(
      "/purchase-down-payment"
    );

    return res.data;
  };

/** Same endpoint the print page uses. */
export const getPurchaseDownPaymentById = async (id: number): Promise<any> => {
  const res = await api.get(`/purchase-down-payment/${id}`);
  return res.data?.data ?? res.data;
};

export const createPurchaseDownPayment =
  async (payload: any) => {
    const res = await api.post(
      "/purchase-down-payment",
      payload
    );

    return res.data;
  };

export const updatePurchaseDownPayment =
  async (id: number, payload: any) => {
    const res = await api.put(
      `/purchase-down-payment/${id}`,
      payload
    );

    return res.data;
  };

export const deletePurchaseDownPayment =
  async (id: number) => {
    const res = await api.delete(
      `/purchase-down-payment/${id}`
    );

    return res.data;
  };

export const getDownPaymentsByPurchaseOrder =
  async (purchaseOrderId: number) => {
    const res = await api.get(
      `/purchase-down-payment?purchase_order_id=${purchaseOrderId}`
    );

    return res.data;
  };