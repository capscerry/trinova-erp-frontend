import { api } from "../api";

// ─── Purchase Down Payment ─────────────────────────────────────

export const getPurchaseDownPayments =
  async () => {
    const res = await api.get(
      "/purchase-down-payment"
    );

    return res.data;
  };

export const createPurchaseDownPayment =
  async (payload: any) => {
    const res = await api.post(
      "/purchase-down-payment",
      payload
    );

    return res.data;
  };