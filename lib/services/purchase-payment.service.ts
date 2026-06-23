import { api } from "../api";

// GET ALL PAYMENT
export const getPurchasePayments =
  async () => {

    const res = await api.get(
      "/purchase-payment"
    );

    return res.data;
};

// CREATE PAYMENT
export const createPurchasePayment =
  async (payload: any) => {

    const res = await api.post(
      "/purchase-payment",
      payload
    );

    return res.data;
};

// DELETE PAYMENT
export const deletePurchasePayment =
  async (id: number) => {

    const res = await api.delete(
      `/purchase-payment/${id}`
    );

    return res.data;
};