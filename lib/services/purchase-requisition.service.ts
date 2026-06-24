import { api } from "../api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseRequisitionDetailApi {
  pr_detail_id?: number;
  pr_id?: number;
  product_id: number;
  product_name?: string;
  qty_requested: number;
  remarks?: string;
  // The product relation may be nested
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
  nomor: string;
  tanggal: string;
  warehouse_id?: number;
  warehouse_name?: string;
  keterangan: string;
  status: string;
  details: PurchaseRequisitionDetail[];
}

function mapPR(item: PurchaseRequisitionApi): PurchaseRequisition {
  return {
    id: item.pr_id,
    nomor: item.pr_number,
    tanggal: item.pr_date,
    warehouse_id: item.warehouse_id ?? item.warehouse?.warehouse_id,
    warehouse_name: item.warehouse?.warehouse_name ?? "",
    keterangan: item.remarks ?? "",
    status: item.status ?? "",
    details: (item.details ?? []).map(d => ({
      pr_detail_id: d.pr_detail_id,
      pr_id: d.pr_id,
      product_id: d.product?.product_id ?? d.product_id,
      product_name: d.product?.product_name ?? d.product_name ?? "",
      qty_requested: d.qty_requested,
      remarks: d.remarks ?? "",
      uom_id: d.product?.uom_id,
    })),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const purchaseRequisitionService = {
  async getAll(): Promise<PurchaseRequisition[]> {
    const res = await api.get("/PurchaseRequisition");
    const list: PurchaseRequisitionApi[] = Array.isArray(res.data)
      ? res.data
      : res.data?.data ?? [];
    return list.map(mapPR);
  },

  async getById(id: number | string): Promise<PurchaseRequisition> {
    const res = await api.get(`/PurchaseRequisition/${id}`);
    const raw: PurchaseRequisitionApi = res.data?.data ?? res.data;
    return mapPR(raw);
  },
};
