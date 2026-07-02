import * as XLSX from "xlsx";
import { api } from "../api";

export const getSupplierProducts =
  async () => {

    const response =
      await api.get(
        "/supplier-product"
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

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CatalogRow {
  product_id: number;
  supplier_price?: number;
  available_stock?: number;
  lead_time_days?: number;
}

export interface CatalogValidationResult {
  /** Rows successfully parsed from the file */
  rows: CatalogRow[];
  /** product_ids that appear more than once in the file */
  duplicates: number[];
  /** product_ids that do not exist in master_product for this supplier */
  missingForSupplier: number[];
  /** Human-readable summary of all issues */
  errors: string[];
}

// ─── Parse Excel catalog file client-side ──────────────────────────────────────

export function parseCatalogFile(file: File): Promise<CatalogRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

        const rows: CatalogRow[] = json
          .filter((r) => r.product_id != null && r.product_id !== "")
          .map((r) => ({
            product_id:     Number(r.product_id),
            supplier_price: r.supplier_price != null ? Number(r.supplier_price) : undefined,
            available_stock: r.available_ != null ? Number(r.available_) : undefined,
            lead_time_days: r.lead_time_days != null ? Number(r.lead_time_days) : undefined,
          }));

        resolve(rows);
      } catch (err) {
        reject(new Error("Gagal membaca file Excel. Pastikan format sesuai."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate catalog rows:
 *  1. Detect duplicate product_id entries within the file.
 *  2. Check that every product_id in the file actually exists in master_product.
 *     A product can be catalogued by any supplier — the check is existence only,
 *     not supplier ownership (master_product.supplier_id is the primary supplier,
 *     not a restriction on who else can supply the product).
 *
 * @param rows       - parsed rows from parseCatalogFile()
 * @param supplierId - the newly created supplier's ID (kept for result typing)
 */
export async function validateCatalogRows(
  rows: CatalogRow[],
  supplierId: number
): Promise<CatalogValidationResult> {
  const errors: string[] = [];

  // ── 1. Duplicate product_id check ────────────────────────────────────────────
  const seen = new Map<number, number>();
  for (const row of rows) {
    seen.set(row.product_id, (seen.get(row.product_id) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  if (duplicates.length > 0) {
    errors.push(
      `Produk duplikat ditemukan (product_id): ${duplicates.join(", ")}`
    );
  }

  // ── 2. Product existence check ────────────────────────────────────────────────
  // Verify each product_id exists in master_product. Any supplier can carry any
  // product — we only reject IDs that don't exist at all.
  let missingForSupplier: number[] = [];
  try {
    const res = await api.get("/master-product");

    // Normalise response: handle array, { data: [] }, or { data: { data: [] } }
    let allProducts: any[] = [];
    if (Array.isArray(res.data)) {
      allProducts = res.data;
    } else if (Array.isArray(res.data?.data)) {
      allProducts = res.data.data;
    } else if (Array.isArray(res.data?.data?.data)) {
      allProducts = res.data.data.data;
    }

    // Build a Set of every valid product_id in the master table
    const allProductIds = new Set(
      allProducts.map((p) => Number(p.product_id))
    );

    if (allProductIds.size > 0) {
      // Only run the check if we successfully loaded products
      const uniqueIds = [...new Set(rows.map((r) => r.product_id))];
      missingForSupplier = uniqueIds.filter((id) => !allProductIds.has(id));

      if (missingForSupplier.length > 0) {
        errors.push(
          `Product ID berikut tidak ditemukan di master produk: ` +
            missingForSupplier.join(", ")
        );
      }
    }
    // If allProductIds is empty the endpoint returned no data — skip the check
    // silently rather than falsely blocking all imports.
  } catch {
    // Non-blocking: network failure — skip existence check, let backend validate
  }

  return { rows, duplicates, missingForSupplier, errors };
}

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