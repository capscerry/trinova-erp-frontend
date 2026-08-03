import { api } from "../api";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A computed stock summary for a single supplier-product row. */
export interface SupplierStockSummary {
  /** Raw available_stock stored on the supplier-product row (= catalog stock minus approved PO deductions already applied by backend). */
  available_stock: number;
  /** Sum of PO quantities for all active (Approved, non-cancelled) POs that have not been fully received. */
  reserved_quantity: number;
  /** Reconstructed original catalog stock = available_stock + reserved_quantity. */
  catalog_stock: number;
  /** What the user can still order = available_stock (already accounts for approved POs). */
  available_to_order: number;
}

/**
 * Build a per-product reservation map from the raw PO list and PO detail list.
 *
 * Logic:
 *   reserved_quantity per product =
 *     SUM( po_detail.quantity )
 *     FOR all PO details where:
 *       - the parent PO status is "Approved" (stock was deducted but goods not fully received)
 *       - and NOT Cancelled / Completed
 *
 * "Received" GR quantities reduce the reservation on the backend by restoring
 * available_stock as items are received — so the available_stock the API returns
 * already reflects partial GR completions.  We therefore only need the approved
 * PO quantities that are still outstanding to reconstruct "catalog_stock".
 *
 * @param poList    - raw array of purchase-order headers from the API
 * @param poDetails - raw array of purchase-order-detail rows from the API
 * @returns map of product_id (string) → outstanding reserved quantity
 */
export function buildReservationMap(
  poList: any[],
  poDetails: any[]
): Record<string, number> {
  // Build a set of PO IDs that are actively reserving stock (Approved but not fully done)
  const activePoIds = new Set<number>(
    poList
      .filter((po: any) => {
        const s = (po.status ?? po.informasi ?? "").toString();
        return s === "Approved" || s === "Partially processed";
      })
      .map((po: any) => Number(po.purchase_order_id ?? po.id))
  );

  const map: Record<string, number> = {};

  for (const detail of poDetails) {
    const poId = Number(detail.purchase_order_id ?? 0);
    if (!activePoIds.has(poId)) continue;

    const productId = String(detail.product_id ?? "");
    if (!productId) continue;

    const qty = Number(detail.quantity ?? 0);
    map[productId] = (map[productId] ?? 0) + qty;
  }

  return map;
}

/**
 * Enrich a supplier-product row with stock summary fields.
 * @param item         - raw supplier-product row from the API
 * @param reservation  - output of buildReservationMap
 */
export function computeStockSummary(
  item: any,
  reservation: Record<string, number>
): SupplierStockSummary {
  const productId = String(item.product_id ?? "");
  const availableStock = Number(item.available_stock ?? 0);
  const reservedQty = reservation[productId] ?? 0;
  // Reconstruct what the supplier originally uploaded:
  // Backend already deducted approved PO quantities from available_stock,
  // so the original catalog value = current available_stock + reserved.
  const catalogStock = availableStock + reservedQty;

  return {
    available_stock: availableStock,
    reserved_quantity: reservedQty,
    catalog_stock: catalogStock,
    available_to_order: availableStock,
  };
}

export const getSupplierProducts =
  async () => {

    const response =
      await api.get(
        "/supplier-product"
      );

    return response.data;
};

export const getSupplierProductsBySupplier =
  async (supplierId: number) => {

    const response =
      await api.get(
        `/supplier-product/by-supplier/${supplierId}`
      );

    return response.data;
};

/**
 * Patch a supplier-product record.
 * Used to update available_stock after PO approval (deduct)
 * or after a purchase return is created (restore).
 *
 * @param id  - supplier_product_id (the PK of the supplier-product row)
 * @param payload - fields to update, e.g. { available_stock: 42 }
 */
export const updateSupplierProduct = async (
  id: number,
  payload: { available_stock?: number; [key: string]: any }
) => {
  const response = await api.put(`/supplier-product/${id}`, payload);
  return response.data;
};

/**
 * Remove a single catalog row -- used from the Supplier Detail view to
 * clean up a stray/duplicate entry left over from a bad Excel upload.
 */
export const deleteSupplierProduct = async (id: number) => {
  const response = await api.delete(`/supplier-product/${id}`);
  return response.data;
};

/**
 * Restore stock for a returned item.
 * Calls POST /api/supplier-product/restore-stock on the backend which
 * does an atomic available_stock += quantity — no race condition.
 */
export const restoreStock = async (
  productId: number,
  supplierId: number,
  quantity: number
) => {
  const response = await api.post("/supplier-product/restore-stock", {
    product_id: productId,
    supplier_id: supplierId,
    quantity,
  });
  return response.data;
};

export const importSupplierCatalog =
  async (
    supplierId: number,
    file: File
  ) => {

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await api.post(

        `/supplier-product/import/${supplierId}`,

        formData,

        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

    return response.data;
};