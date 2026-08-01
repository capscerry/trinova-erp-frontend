import { api } from "@/lib/api";
import { getPurchaseOrders, updatePurchaseOrder } from "./po.service";
import { createPurchasePayment } from "./purchase-payment.service";
import type { ReturnLineItem } from "@/components/modules/pembelian/PurchaseReturnFormModal";

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
  target_invoice_id?: number;
}

export const getPurchaseReturns = async () => {
  const response = await api.get("/purchase-return");
  return response.data;
};

/**
 * Backend has no single-record GET endpoint for Purchase Return -- fetch the
 * full list and filter client-side. Fine at this data scale (same pattern
 * would need revisiting if the list grows very large).
 */
export const getPurchaseReturnById = async (id: number): Promise<any | null> => {
  const response = await api.get("/purchase-return");
  const list = response.data?.data ?? response.data ?? [];
  const arr = Array.isArray(list) ? list : [];
  return (
    arr.find(
      (r: any) => Number(r.purchase_return_id ?? r.id) === Number(id)
    ) ?? null
  );
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

/**
 * Returns the GR detail lines (product_name + quantity) for the given
 * purchase return. Used by the Accept Loss modal to display the exact
 * products and quantities that were originally returned.
 */
export const getReturnDetails = async (returnId: number) => {
  const response = await api.get(`/purchase-return/${returnId}/details`);
  return response.data;
};

// ─── Settlement helpers ───────────────────────────────────────────────────────

/**
 * Option A — Accept Loss.
 * Closes the return as "Closed". The backend atomically marks the linked
 * GR as "Returned" and reduces remaining_qty.
 */
export const resolveAcceptLoss = async (
  returnId: number,
  returnItems: ReturnLineItem[],
  supplierId: number,
  returnAmount: number,
  _goodsReceiptId?: number  // kept for call-site compatibility; unused
) => {
  const itemSummary = returnItems
    .map((i) => `${i.product_name} x${i.qty_return}`)
    .join(", ");

  const result = await updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: `Accept Loss settled. Supplier returned fixed goods: ${itemSummary}. Total value: Rp ${returnAmount}. Stock restored.`,
  });

  return result;
};

// Fetches the full PO record and patches only total_amount.
// Required because PUT /purchase-order/:id expects the complete body.
async function patchPOTotal(poId: number, newTotal: number): Promise<void> {
  const res = await getPurchaseOrders();
  const list: any[] = Array.isArray(res) ? res : (res.data ?? []);
  const po = list.find((p: any) => Number(p.purchase_order_id) === poId);
  if (!po) throw new Error(`PO id ${poId} not found`);
  await updatePurchaseOrder(poId, {
    po_number:          po.po_number,
    supplier_id:        Number(po.supplier_id),
    order_date:         (po.order_date ?? "").split("T")[0],
    expected_date:      po.expected_date ? (po.expected_date ?? "").split("T")[0] : null,
    status:             po.status,
    total_amount:       newTotal,
    transaction_name:   po.transaction_name  ?? "",
    transaction_detail: po.transaction_detail ?? "",
  });
}

/**
 * Option B — Next PO Deduction.
 * Deducts the return total from the selected PO's total_amount and locks
 * the return as "Deduction Locked". The backend atomically marks the linked
 * GR as "Returned" and reduces remaining_qty.
 */
export const resolveNextPODeduction = async (
  returnId: number,
  targetPOId: number,
  targetPONumber: string,
  deductionAmount: number,
  newPOTotal: number,
  _goodsReceiptId?: number  // kept for call-site compatibility; unused
) => {
  await patchPOTotal(targetPOId, newPOTotal);

  const result = await updatePurchaseReturn(returnId, {
    status: "Deduction Locked",
    notes: `Deduction of Rp ${deductionAmount} applied to PO ${targetPONumber}. PO new total: Rp ${newPOTotal}.`,
  });

  return result;
};

/**
 * Option C — Cash Refund.
 * Posts a "Return Credit" payment against the invoice, then closes the
 * return as "Closed". The backend atomically marks the linked GR as
 * "Returned" and reduces remaining_qty.
 */
export const confirmCashRefund = async (
  returnId: number,
  targetInvoiceId: number,
  targetInvoiceNumber: string,
  deductionAmount: number,
  returnDate: string,
  _goodsReceiptId?: number  // kept for call-site compatibility; unused
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

  // Close the return, recording the linked invoice id
  const result = await updatePurchaseReturn(returnId, {
    status:            "Closed",
    target_invoice_id: targetInvoiceId,
    notes:             `Cash refund confirmed. Rp ${deductionAmount} credited against invoice ${targetInvoiceNumber}.`,
  });

  return result;
};
