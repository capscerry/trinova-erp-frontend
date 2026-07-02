import { api } from "@/lib/api";
import { getPurchaseOrders, updatePurchaseOrder } from "./po.service";
import { restoreStock } from "./supplier-product.service";
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
 * Option A — Accept Loss.
 * The supplier ships back fixed goods of the exact same product and quantity.
 * Stock is restored for every returned line item, then the return is closed.
 */
export const resolveAcceptLoss = async (
  returnId: number,
  returnItems: ReturnLineItem[],
  supplierId: number,
  returnAmount: number
) => {
  // Restore stock for each returned line item
  for (const item of returnItems) {
    if (item.product_id && item.qty_return > 0) {
      await restoreStock(item.product_id, supplierId, item.qty_return);
    }
  }

  const itemSummary = returnItems
    .map((i) => `${i.product_name} x${i.qty_return}`)
    .join(", ");

  return updatePurchaseReturn(returnId, {
    status: "Closed",
    notes: `Accept Loss settled. Supplier returned fixed goods: ${itemSummary}. Total value: Rp ${returnAmount}. Stock restored.`,
  });
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

  // Close the return, recording the linked invoice id
  return updatePurchaseReturn(returnId, {
    status:            "Closed",
    target_invoice_id: targetInvoiceId,
    notes:             `Cash refund confirmed. Rp ${deductionAmount} credited against invoice ${targetInvoiceNumber}.`,
  });
};
