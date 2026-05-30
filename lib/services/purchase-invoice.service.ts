import { api } from "../api";

// GET ALL INVOICE
export const getPurchaseInvoices =
  async () => {

    const res = await api.get(
      "/purchase-invoice"
    );

    return res.data;
};

// CREATE INVOICE
export const createPurchaseInvoice =
  async (payload: any) => {

    const res = await api.post(
      "/purchase-invoice",
      payload
    );

    return res.data;
};

// UPDATE INVOICE
export const updatePurchaseInvoice =
  async (
    id: number,
    payload: any
  ) => {

    const res = await api.put(
      `/purchase-invoice/${id}`,
      payload
    );

    return res.data;
};

// DELETE INVOICE
export const deletePurchaseInvoice =
  async (id: number) => {

    const res = await api.delete(
      `/purchase-invoice/${id}`
    );

    return res.data;
};