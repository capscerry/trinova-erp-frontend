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
};
