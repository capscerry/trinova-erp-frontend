import { api } from "@/lib/api";
import { updatePurchaseInvoice } from "./purchase-invoice.service";

export interface PurchaseReturnPayload {
  goods_receipt_id: number;
  purchase_return_number: string;
  return_date: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_number: string;
  total_amount: number;
  settlement_option: string;
  notes: string;
  status: string;
  closing_condition: string;
  transaction_name: string;
  transaction_detail: string;
}

export const getPurchaseReturns = async () => {
  const response = await api.get("/purchase-return");
  return response.data;
};

export const getNextReturnNumber = async (): Promise<string> => {
  const response = await api.get("/purchase-return/next-number");
  return response.data?.next_number ?? response.data;
};

export const createPurchaseReturn = async (payload: PurchaseReturnPayload) => {
  const response = await api.post("/purchase-return", payload);
  return response.data;
};

export const updatePurchaseReturn = async (
  id: number,
  payload: Partial<PurchaseReturnPayload> & { status?: string }
) => {
  const response = await api.put(`/purchase-return/${id}`, payload);
  return response.data;
};

export const deletePurchaseReturn = async (id: number) => {
  const response = await api.delete(`/purchase-return/${id}`);
  return response.data;
};

// ─── Settlement helpers ───────────────────────────────────────────────────────

/**
 * Option A — Replacement.
 * Marks the return as Closed. The parent page will open the GR form
 * pre-filled with the returned items (handled in the UI layer).
 */
export const resolveReplacement = async (returnId: number) => {
  return updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: "Replacement GR initiated from settlement modal.",
  });
};

/**
 * Option B — Next PO Deduction.
 * Deducts the return amount from the linked invoice's total_amount,
 * then locks the return as "Deduction Locked".
 */
export const resolveNextPODeduction = async (
  returnId: number,
  targetInvoiceId: number,
  targetInvoiceNumber: string,
  deductionAmount: number,
  currentInvoiceTotal: number
) => {
  const newTotal = Math.max(0, currentInvoiceTotal - deductionAmount);

  // Deduct from invoice first
  await updatePurchaseInvoice(targetInvoiceId, { total_amount: newTotal });

  // Then lock the return
  return updatePurchaseReturn(returnId, {
    status: "Deduction Locked",
    notes: `Deduction of Rp ${deductionAmount} applied to invoice ${targetInvoiceNumber}. Invoice total: Rp ${currentInvoiceTotal} → Rp ${newTotal}.`,
  });
};

/**
 * Option C — Cash Refund.
 * Deducts the return amount from the linked invoice's total_amount,
 * then closes the return.
 */
export const confirmCashRefund = async (
  returnId: number,
  targetInvoiceId: number,
  targetInvoiceNumber: string,
  deductionAmount: number,
  currentInvoiceTotal: number
) => {
  const newTotal = Math.max(0, currentInvoiceTotal - deductionAmount);

  // Deduct from invoice first
  await updatePurchaseInvoice(targetInvoiceId, { total_amount: newTotal });

  // Then close the return
  return updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: `Cash refund confirmed. Rp ${deductionAmount} deducted from invoice ${targetInvoiceNumber}. Invoice total: Rp ${currentInvoiceTotal} → Rp ${newTotal}.`,
  });
};
