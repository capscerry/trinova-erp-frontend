import { api } from "@/lib/api";
import { getPurchaseOrders, updatePurchaseOrder } from "./po.service";
import { createPurchasePayment } from "./purchase-payment.service";

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

// ─── Internal helper: fetch the full PO record and patch total_amount ─────────
// The backend PUT /purchase-order/:id requires the full header body,
// so we fetch the current record first and merge only total_amount.

async function patchPOTotal(poId: number, newTotal: number): Promise<void> {
  const res = await getPurchaseOrders();
  const list: any[] = Array.isArray(res) ? res : (res.data ?? []);
  const po = list.find((p: any) => Number(p.purchase_order_id) === poId);

  if (!po) throw new Error(`PO id ${poId} not found`);

  const fullPayload = {
    po_number:         po.po_number,
    supplier_id:       Number(po.supplier_id),
    order_date:        (po.order_date ?? "").split("T")[0],
    expected_date:     po.expected_date
                         ? (po.expected_date ?? "").split("T")[0]
                         : null,
    status:            po.status,
    total_amount:      newTotal,
    transaction_name:  po.transaction_name  ?? "",
    transaction_detail: po.transaction_detail ?? "",
  };

  await updatePurchaseOrder(poId, fullPayload);
}

// ─── Settlement helpers ───────────────────────────────────────────────────────

/**
 * Option A — Replacement.
 * Deducts the return amount from the chosen PO's total as a discount,
 * then closes the return with status "Closed".
 */
export const resolveReplacement = async (
  returnId: number,
  targetPOId: number,
  targetPONumber: string,
  newPOTotal: number,
  returnAmount: number
) => {
  await patchPOTotal(targetPOId, newPOTotal);

  return updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: `Replacement settled. Return amount Rp ${returnAmount} applied as discount to PO ${targetPONumber}. PO new total: Rp ${newPOTotal}.`,
  });
};

/**
 * Option B — Next PO Deduction.
 * Deducts the return total from the selected PO's total_amount,
 * then locks the return as "Deduction Locked".
 */
export const resolveNextPODeduction = async (
  returnId: number,
  targetPOId: number,
  targetPONumber: string,
  deductionAmount: number,
  newPOTotal: number
) => {
  await patchPOTotal(targetPOId, newPOTotal);

  return updatePurchaseReturn(returnId, {
    status: "Deduction Locked",
    notes: `Deduction of Rp ${deductionAmount} applied to PO ${targetPONumber}. PO new total: Rp ${newPOTotal}.`,
  });
};

/**
 * Option C — Cash Refund.
 * Posts a "Return Credit" payment against the invoice equal to the return
 * amount. This reduces the invoice's outstanding_amount via the payment
 * system (the backend blocks direct total_amount edits on invoices).
 * Then closes the return as "Closed".
 */
export const confirmCashRefund = async (
  returnId: number,
  targetInvoiceId: number,
  targetInvoiceNumber: string,
  deductionAmount: number,
  returnDate: string
) => {
  // Create a Return Credit payment against the invoice
  await createPurchasePayment({
    purchase_invoice_id: targetInvoiceId,
    payment_date:        returnDate,
    amount:              deductionAmount,
    payment_method:      "Return Credit",
    notes:               `Return credit from purchase return. Invoice: ${targetInvoiceNumber}.`,
    status:              "Paid",
    transaction_name:    "Return Credit",
    transaction_detail:  `Return deduction of Rp ${deductionAmount} from invoice ${targetInvoiceNumber}.`,
  });

  // Close the return
  return updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: `Cash refund confirmed. Rp ${deductionAmount} credited against invoice ${targetInvoiceNumber}.`,
  });
};
