import { api, type ApiResponse } from "@/lib/api";

// ─── Header ───────────────────────────────────────────────────────────────────

export interface SalesReturnHeaderApi {
  id: number;
  returnNumber: string;
  returnDate: string;
  customerId: number;
  customerName?: string;
  deliveryOrderId: number;
  doNumber?: string;
  salesOrderId?: number;
  soNumber?: string;
  notes?: string;
  status: string;
  createdAt?: string;
}

export interface SalesReturn {
  id: number;
  noRetur: string;
  tanggal: string;
  customerId: number;
  pelanggan: string;
  deliveryOrderId: number;
  noSuratJalan?: string;
  salesOrderId?: number;
  noSo?: string;
  keterangan?: string;
  status: string;
}

export function mapSalesReturn(item: SalesReturnHeaderApi): SalesReturn {
  return {
    id: item.id,
    noRetur: item.returnNumber,
    tanggal: item.returnDate,
    customerId: item.customerId,
    pelanggan: item.customerName ?? "",
    deliveryOrderId: item.deliveryOrderId,
    noSuratJalan: item.doNumber ?? undefined,
    salesOrderId: item.salesOrderId ?? undefined,
    noSo: item.soNumber ?? undefined,
    keterangan: item.notes ?? undefined,
    status: item.status || "Completed",
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface SalesReturnDetailApi {
  id: number;
  returnId: number;
  productId: number;
  productCode?: string;
  productName?: string;
  warehouseId: number;
  warehouseName?: string;
  qty: number;
  uomId?: number;
  uomName?: string;
  reason?: string;
}

export interface SalesReturnDetailItem {
  productId: number;
  productCode: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  qty: number;
  uomId?: number;
  satuan: string;
  reason?: string;
}

export function mapSalesReturnDetailItem(item: SalesReturnDetailApi): SalesReturnDetailItem {
  return {
    productId: item.productId,
    productCode: item.productCode ?? "",
    productName: item.productName ?? "",
    warehouseId: item.warehouseId,
    warehouseName: item.warehouseName ?? "",
    qty: item.qty,
    uomId: item.uomId,
    satuan: item.uomName ?? "",
    reason: item.reason ?? undefined,
  };
}

export interface SalesReturnFullDetail extends SalesReturn {
  items: SalesReturnDetailItem[];
}

interface SalesReturnDetailResponseApi {
  header: SalesReturnHeaderApi;
  detail: SalesReturnDetailApi[];
}

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface SalesReturnPayload {
  header: {
    returnNumber: string;
    returnDate: string;
    customerId: number;
    deliveryOrderId: number;
    salesOrderId?: number | null;
    notes?: string;
  };
  detail: {
    productId: number;
    warehouseId: number;
    qty: number;
    uomId?: number;
    reason?: string;
  }[];
}

export const salesReturnService = {
  async getAll(): Promise<SalesReturn[]> {
    const response = await api.get<ApiResponse<SalesReturnHeaderApi[]>>("/api/sales-return");
    return (response.data.data ?? []).map(mapSalesReturn);
  },

  async getDetailById(id: number | string): Promise<SalesReturnFullDetail> {
    const response = await api.get<ApiResponse<SalesReturnDetailResponseApi>>(`/api/sales-return/${id}`);
    const { header, detail } = response.data.data;
    return {
      ...mapSalesReturn(header),
      items: (detail ?? []).map(mapSalesReturnDetailItem),
    };
  },

  /** Sisa qty yang masih bisa diretur per produk untuk satu Delivery Order (qty dikirim - yang sudah pernah diretur). */
  async getReturnableQty(deliveryOrderId: number | string): Promise<Record<number, number>> {
    const response = await api.get<ApiResponse<Record<number, number>>>(
      `/api/sales-return/returnable/${deliveryOrderId}`
    );
    return response.data.data ?? {};
  },

  async create(payload: SalesReturnPayload): Promise<SalesReturn> {
    const response = await api.post<ApiResponse<{ id: number }>>("/api/sales-return", payload);
    return mapSalesReturn({
      id: response.data.data.id,
      returnNumber: payload.header.returnNumber,
      returnDate: payload.header.returnDate,
      customerId: payload.header.customerId,
      deliveryOrderId: payload.header.deliveryOrderId,
      salesOrderId: payload.header.salesOrderId ?? undefined,
      notes: payload.header.notes,
      status: "Completed",
    });
  },
};
