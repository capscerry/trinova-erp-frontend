import { api } from "../api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoodsRequestDetailApi {
  goods_request_detail_id?: number;
  goods_request_id?: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  uom_id?: number;
  uom_name?: string;
  notes?: string;
}

export interface GoodsRequestApi {
  goods_request_id: number;
  request_number: string;
  request_date: string;
  request_type?: string;
  notes?: string;
  status?: string;
  total_amount?: number;
  details?: GoodsRequestDetailApi[];
  items?: GoodsRequestDetailApi[];
}

export interface GoodsRequest {
  id: number;
  nomor: string;
  tanggal: string;
  tipe_permintaan: string;
  keterangan: string;
  status: string;
  total: number;
  details: GoodsRequestDetailApi[];
}

function mapGoodsRequest(item: GoodsRequestApi): GoodsRequest {
  return {
    id: item.goods_request_id,
    nomor: item.request_number,
    tanggal: item.request_date,
    tipe_permintaan: item.request_type ?? "",
    keterangan: item.notes ?? "",
    status: item.status ?? "",
    total: item.total_amount ?? 0,
    details: item.details ?? item.items ?? [],
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const goodsRequestService = {
  async getAll(): Promise<GoodsRequest[]> {
    const res = await api.get("/goods-request");
    const list: GoodsRequestApi[] = Array.isArray(res.data)
      ? res.data
      : res.data?.data ?? [];
    return list.map(mapGoodsRequest);
  },

  async getById(id: number | string): Promise<GoodsRequest> {
    const res = await api.get(`/goods-request/${id}`);
    const raw: GoodsRequestApi = res.data?.data ?? res.data;
    return mapGoodsRequest(raw);
  },
};
