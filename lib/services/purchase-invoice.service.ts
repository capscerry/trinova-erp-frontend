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

// GET UNPAID INVOICES BY SUPPLIER
export const getUnpaidInvoicesBySupplier =
  async (supplierId: number) => {

    const res = await api.get(
      `/purchase-invoice/unpaid/${supplierId}`
    );

    return res.data;
};

// GET UNPAID INVOICES FOR A SPECIFIC RETURN (resolves supplier server-side)
// Calls GET /api/purchase-return/{id}/invoices so the frontend never needs
// to know the supplier_id — the backend walks the GR chain itself.
export const getUnpaidInvoicesForReturn =
  async (purchaseReturnId: number) => {
    const res = await api.get(
      `/purchase-return/${purchaseReturnId}/invoices`
    );
    return res.data;
};

// SYNC ALL INVOICE STATUSES (backfill)
// Fires POST /purchase-invoice/sync-status to recalculate and update the
// status column for every non-Cancelled invoice based on live payment data.
export const syncAllInvoiceStatuses =
  async () => {
    const res = await api.post(
      "/purchase-invoice/sync-status"
    );
    return res.data;
};
