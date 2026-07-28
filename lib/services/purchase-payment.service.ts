import { api } from "../api";

// ─── Internal helper ──────────────────────────────────────────────────────────

function toArray(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.items)) return d.items;
  }
  return [];
}

// ─── GET ALL PAYMENT ──────────────────────────────────────────────────────────
/**
 * Fetches all Purchase Payments.
 * Preserves the `{ data: [] }` envelope shape that existing callers expect,
 * but returns a safe fallback object instead of throwing on failure.
 */
export const getPurchasePayments = async () => {
  try {
    console.log("[Payment] Loading Purchase Payments...");
    const res = await api.get("/purchase-payment");
    const raw = res.data;
    const list = toArray(raw);
    console.log(`[Payment] Loaded ${list.length} payment(s)`);
    // Preserve original response shape; callers use `res.data || []`
    return raw ?? { data: [] };
  } catch (err: any) {
    console.error("[Payment] Purchase Payment retrieval failed:", err?.message ?? err);
    return { data: [] };
  }
};

// ─── GET PAYMENTS BY INVOICE ──────────────────────────────────────────────────
export const getPaymentsByInvoice = async (invoiceId: number): Promise<any[]> => {
  try {
    if (!invoiceId || invoiceId <= 0) return [];
    const res = await api.get(`/purchase-payment?purchase_invoice_id=${invoiceId}`);
    return toArray(res.data);
  } catch (err: any) {
    console.error(`[Payment] getPaymentsByInvoice(${invoiceId}) failed:`, err?.message ?? err);
    return [];
  }
};

// ─── CREATE PAYMENT ───────────────────────────────────────────────────────────
export const createPurchasePayment = async (payload: any) => {
  if (!payload?.purchase_invoice_id) {
    throw new Error("purchase_invoice_id diperlukan untuk membuat Purchase Payment.");
  }
  if (payload.amount == null || Number(payload.amount) <= 0) {
    throw new Error("Amount harus lebih dari 0.");
  }
  console.log("[Payment] Creating Purchase Payment for invoice:", payload.purchase_invoice_id);
  const res = await api.post("/purchase-payment", payload);
  return res.data ?? {};
};

// ─── UPDATE PAYMENT ───────────────────────────────────────────────────────────
export const updatePurchasePayment = async (id: number, payload: any) => {
  if (!id || id <= 0) throw new Error("ID Purchase Payment tidak valid.");
  console.log(`[Payment] Updating Purchase Payment ${id}...`);
  const res = await api.put(`/purchase-payment/${id}`, payload);
  return res.data ?? {};
};

// ─── DELETE PAYMENT ───────────────────────────────────────────────────────────
export const deletePurchasePayment = async (id: number) => {
  if (!id || id <= 0) throw new Error("ID Purchase Payment tidak valid.");
  console.log(`[Payment] Deleting Purchase Payment ${id}...`);
  const res = await api.delete(`/purchase-payment/${id}`);
  return res.data ?? {};
};
