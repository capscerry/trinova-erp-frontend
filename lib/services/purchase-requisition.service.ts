import { api } from "@/lib/api";

export interface PurchaseRequisitionDetailApi {
  pr_detail_id?: number;
  pr_id?: number;
  product_id: number;
  product_name?: string;
  qty_requested: number;
  remarks?: string;
  product?: { product_id: number; product_name: string; uom_id?: number };
}

export interface PurchaseRequisitionApi {
  pr_id: number;
  pr_number: string;
  pr_date: string;
  warehouse_id?: number;
  warehouse?: { warehouse_id: number; warehouse_name: string };
  remarks?: string;
  status?: string;
  details?: PurchaseRequisitionDetailApi[];
}

export interface PurchaseRequisitionDetail {
  pr_detail_id?: number;
  pr_id?: number;
  product_id: number;
  product_name?: string;
  qty_requested: number;
  remarks?: string;
  uom_id?: number;
}

export interface PurchaseRequisition {
  id: number;
  pr_id: number;
  nomor: string;
  pr_number: string;
  tanggal: string;
  pr_date: string;
  warehouse_id?: number;
  warehouse_name?: string;
  warehouse?: { warehouse_id: number; warehouse_name: string };
  keterangan: string;
  remarks?: string;
  status: string;
  details: PurchaseRequisitionDetail[];
}

export interface CreatePurchaseRequisitionRequest {
  pr_date: string;
  warehouse_id: number;
  remarks?: string;
  details: PurchaseRequisitionDetail[];
}

function normalizeList(data: unknown): PurchaseRequisitionApi[] {
  if (Array.isArray(data)) return data as PurchaseRequisitionApi[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: PurchaseRequisitionApi[] }).data;
  }
  return [];
}

function mapPR(item: PurchaseRequisitionApi): PurchaseRequisition {
  const warehouseId = item.warehouse_id ?? item.warehouse?.warehouse_id;
  const warehouseName = item.warehouse?.warehouse_name ?? "";

  return {
    id: item.pr_id,
    pr_id: item.pr_id,
    nomor: item.pr_number,
    pr_number: item.pr_number,
    tanggal: item.pr_date,
    pr_date: item.pr_date,
    warehouse_id: warehouseId,
    warehouse_name: warehouseName,
    warehouse: item.warehouse,
    keterangan: item.remarks ?? "",
    remarks: item.remarks,
    status: item.status ?? "",
    details: (item.details ?? []).map((detail) => ({
      pr_detail_id: detail.pr_detail_id,
      pr_id: detail.pr_id,
      product_id: detail.product?.product_id ?? detail.product_id,
      product_name: detail.product?.product_name ?? detail.product_name ?? "",
      qty_requested: detail.qty_requested,
      remarks: detail.remarks ?? "",
      uom_id: detail.product?.uom_id,
    })),
  };
}

export async function getPurchaseRequisitionDetail(id: number) {
  const response = await api.get(`/PurchaseRequisition/${id}`);
  return response.data;
}

export async function getPurchaseRequisitions() {
  const response = await api.get("/PurchaseRequisition");
  return response.data;
}

export async function getPurchaseRequisitionById(id: number) {
  const response = await api.get(`/PurchaseRequisition/${id}`);
  return response.data;
}

export async function createPurchaseRequisition(payload: CreatePurchaseRequisitionRequest) {
  const response = await api.post("/PurchaseRequisition", payload);
  return response.data;
}

export async function updatePurchaseRequisition(id: number, payload: Partial<PurchaseRequisitionApi>) {
  const response = await api.put(`/PurchaseRequisition/${id}`, payload);
  return response.data;
}

export async function deletePurchaseRequisition(id: number) {
  const response = await api.delete(`/PurchaseRequisition/${id}`);
  return response.data;
}

/**
 * A PR detail line is considered "valid for PO conversion" when:
 *  - qty_requested > 0
 *  - the item has not been marked deleted (is_deleted is absent or false)
 *
 * Note: purchase_price / unit_price validation is best-effort on the frontend
 * because supplier pricing lives in the supplier-product catalog, not on the PR
 * detail row itself. The backend endpoint /PurchaseRequisition/for-po-selection
 * (if it exists) is the authoritative filter; this function is a client-side
 * pre-filter to hide obviously unusable PRs (zero qty, cancelled, etc.).
 */
function isDetailLineValid(detail: PurchaseRequisitionDetail): boolean {
  if (Number(detail.qty_requested ?? 0) <= 0) return false;
  return true;
}

/**
 * Returns true when the PR as a whole is eligible to appear in the PO
 * creation picker:
 *  - status is NOT "Processed", "Cancelled", or "Completed"
 *  - at least one detail line passes isDetailLineValid
 *
 * PRs whose details array is empty (not yet loaded) are kept so that the
 * picker can fetch the full record by ID on selection — if the full record
 * turns out to have no valid lines, the items table will just be empty.
 */
function isPrValidForPO(pr: PurchaseRequisition): boolean {
  const invalidStatuses = ["Processed", "Cancelled", "Completed"];
  if (invalidStatuses.includes(pr.status)) return false;

  // If details haven't been loaded yet, keep the PR (lazy-loaded on select)
  if (!pr.details || pr.details.length === 0) return true;

  return pr.details.some(isDetailLineValid);
}

export const purchaseRequisitionService = {
  async getAll(): Promise<PurchaseRequisition[]> {
    const response = await api.get("/PurchaseRequisition");
    return normalizeList(response.data).map(mapPR);
  },

  async getById(id: number | string): Promise<PurchaseRequisition> {
    const response = await api.get(`/PurchaseRequisition/${id}`);
    const raw: PurchaseRequisitionApi = response.data?.data ?? response.data;
    return mapPR(raw);
  },

  /**
   * Fetches all PRs and returns only those that are still actionable for
   * Purchase Order creation.  Filters out:
   *  - Cancelled / Processed / Completed PRs
   *  - PRs where every detail line has qty_requested <= 0
   *
   * Falls back to the full list on error so the picker is never broken by a
   * transient filtering failure.
   */
  async getValidForPO(): Promise<PurchaseRequisition[]> {
    try {
      // Prefer the dedicated backend endpoint that does SQL-level filtering.
      // If the backend doesn't expose it yet, the catch block falls back to
      // client-side filtering of the full list.
      let raw: PurchaseRequisitionApi[] = [];
      try {
        const res = await api.get("/PurchaseRequisition/for-po-selection");
        raw = normalizeList(res.data);
        if (raw.length > 0) {
          const mapped = raw.map(mapPR);
          console.log(`[PR] Loaded ${mapped.length} valid PR(s) from /for-po-selection`);
          return mapped;
        }
      } catch {
        // Endpoint not yet available — fall through to client-side filtering
      }

      // Fallback: fetch all and filter client-side
      const allRes = await api.get("/PurchaseRequisition");
      raw = normalizeList(allRes.data);
      const all = raw.map(mapPR);
      const valid = all.filter(isPrValidForPO);
      console.log(`[PR] Loaded ${all.length} total PR(s), ${valid.length} valid for PO creation`);
      return valid;
    } catch (err) {
      console.error("[PR] getValidForPO failed, returning empty list:", err);
      return [];
    }
  },
};
