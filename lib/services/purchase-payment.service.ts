import { api } from "../api";

// GET ALL PAYMENT
export const getPurchasePayments =
  async () => {

    const res = await api.get(
      "/purchase-payment"
    );

    return res.data;
};

// GET PAYMENTS BY INVOICE
export const getPaymentsByInvoice =
  async (invoiceId: number) => {

    const res = await api.get(
      `/purchase-payment?purchase_invoice_id=${invoiceId}`
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

// UPDATE PAYMENT
export const updatePurchasePayment =
  async (
    id: number,
    payload: any
  ) => {

    const res = await api.put(
      `/purchase-payment/${id}`,
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