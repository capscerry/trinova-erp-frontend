import { api } from "@/lib/api";

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

// ─── Settlement-specific helpers ─────────────────────────────────────────────

/**
 * A: Replacement — confirms a replacement GR has been received.
 * Closes the return by setting status to CLOSED.
 */
export const resolveReplacement = async (
  returnId: number,
  replacementGRNumber: string
) => {
  return updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: `Replacement GR: ${replacementGRNumber}`,
  });
};

/**
 * B: Next PO Deduction — locks a deduction amount against a specific future PO.
 * Records the deduction in the return notes; the backend applies it to the PO
 * when processing the status change. No separate PO mutation from the frontend.
 */
export const resolveNextPODeduction = async (
  returnId: number,
  targetPOId: number,
  targetPONumber: string,
  deductionAmount: number
) => {
  return updatePurchaseReturn(returnId, {
    status: "Deduction Locked",
    notes: `Deduction of ${deductionAmount} locked against PO ${targetPONumber} (ID: ${targetPOId})`,
  });
};

/**
 * C: Cash Refund — user confirms the transfer receipt has been received.
 * Closes the return immediately.
 */
export const confirmCashRefund = async (
  returnId: number,
  transferRef: string,
  transferDate: string
) => {
  return updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: `Cash refund received. Transfer ref: ${transferRef}, Date: ${transferDate}`,
  });
};

/**
 * D: Open Credit — marks the return as Credit Applied and records the credit
 * amount in the notes. The backend is responsible for applying the credit to
 * the supplier's balance when it processes the status change; no separate
 * frontend call is needed (and no /supplier-credit endpoint exists).
 */
export const applyOpenCredit = async (
  returnId: number,
  supplierId: number,
  creditAmount: number
) => {
  return updatePurchaseReturn(returnId, {
    status: "Credit Applied",
    notes: `Open credit of ${creditAmount} applied to supplier ID ${supplierId}`,
  });
};
