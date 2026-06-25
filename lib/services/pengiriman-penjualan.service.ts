import { api, type ApiResponse } from "@/lib/api";

// ─── Tipe Pengiriman (Shipping Type) ──────────────────────────────────────────
// CATATAN: endpoint "/shipping-type" adalah ASUMSI SEMENTARA. Ganti URL ini
// begitu endpoint sebenarnya dikonfirmasi — tidak ada tempat lain yang perlu
// diubah karena seluruh halaman/modal Pengiriman Penjualan memanggil lewat
// shippingTypeService.getAll(), bukan langsung ke URL.

export interface ShippingTypeApi {
  id: number;
  shippingName: string;
}

export interface ShippingType {
  id: number;
  nama: string;
}

export function mapShippingType(item: ShippingTypeApi): ShippingType {
  return {
    id: item.id,
    nama: item.shippingName,
  };
}

export const shippingTypeService = {
  async getAll(): Promise<ShippingType[]> {
    // CATATAN: endpoint ini mengembalikan ARRAY LANGSUNG (bukan dibungkus
    // { success, message, data } seperti endpoint lain di project ini),
    // jadi tidak bisa pakai ApiResponse<T> generic seperti biasa.
    const response = await api.get<ApiResponse<ShippingTypeApi[]>>("/shipping-type");
    return (response.data.data?? []).map(mapShippingType);
  },
};

// ─── Pengiriman Penjualan / Delivery Order ────────────────────────────────────

/** Field persis sesuai DeliveryOrderHeaderDTO di backend (camelCase hasil serialize JSON) */
export interface DeliveryOrderHeaderApi {
  id: number;
  customerId: number;
  doDate: string;
  customerName?: string;
  doNumber?: string;
  soNumber?: string;
  poNumber?: string;
  deliveryCategoryId: number;
  deliveryShippingName?: string;
  address?: string;
  notes?: string;
  soId?: number;
}

export interface PengirimanPenjualan {
  id: number;
  noSuratJalan: string;
  tanggalKirim: string;
  customerId: number;
  pelanggan: string;
  noSo?: string;
  soId?: number;
  noPO?: string;
  shippingTypeId: number;
  shippingType: string;
  alamatPengiriman: string;
  keterangan: string;
}

export function mapPengirimanPenjualan(item: DeliveryOrderHeaderApi): PengirimanPenjualan {
  return {
    id: item.id,
    noSuratJalan: item.doNumber ?? "",
    tanggalKirim: item.doDate,
    customerId: item.customerId,
    pelanggan: item.customerName ?? "",
    noSo: item.soNumber ?? undefined,
    soId: item.soId ?? undefined,
    noPO: item.poNumber ?? undefined,
    shippingTypeId: item.deliveryCategoryId,
    shippingType: item.deliveryShippingName ?? "",
    alamatPengiriman: item.address ?? "",
    keterangan: item.notes ?? "",
  };
}

// ─── Detail Item (dari GetDoDetail, di-fetch terpisah saat buka Detail/Edit) ──

export interface DeliveryOrderDetailApi {
  doId?: number;
  productId: number;
  productCode?: string;
  productName: string;
  uomId: number;
  uomName?: string;
  qtyDikirim: number;
  qtyDipesan: number;
}

export interface PengirimanDetailItem {
  productId: number;
  productCode: string;
  productName: string;
  uomId?: number;
  satuan: string;
  qtyDipesan: number;
  qtyDikirim: number;
}

export function mapPengirimanDetailItem(item: DeliveryOrderDetailApi): PengirimanDetailItem {
  return {
    productId: item.productId,
    productCode: item.productCode ?? "",
    productName: item.productName,
    uomId: item.uomId,
    satuan: item.uomName ?? "",
    qtyDipesan: item.qtyDipesan,
    qtyDikirim: item.qtyDikirim,
  };
}

// ─── Payload POST /api/delivery-order ─────────────────────────────────────────
// CATATAN: struktur ini NESTED ({ header, detail }), bukan flat — mengikuti
// persis bentuk model backend `PengirimanPenjualan` (Header + List<Detail>).
// Field di header PERSIS sama dengan yang dibaca controller
// (InsertDeliveryOrderHeader) — jangan tambah field lain selain ini.

export interface DeliveryOrderHeaderPayload {
  customerId: number;
  doDate: string;
  doNumber?: string;
  poNumber?: string;
  deliveryCategoryId: number;
  address?: string;
  notes?: string;
  soId?: number | null;
}

export interface DeliveryOrderDetailPayload {
  productId: number;
  uomId?: number;
  qtyDipesan: number;
  qtyDikirim: number;
}

export interface PengirimanPenjualanPayload {
  header: DeliveryOrderHeaderPayload;
  detail: DeliveryOrderDetailPayload[];
}

export const pengirimanPenjualanService = {
  async getAll(): Promise<PengirimanPenjualan[]> {
    const response = await api.get<ApiResponse<DeliveryOrderHeaderApi[]>>(
      "/do-header"
    );
    return (response.data.data ?? []).map(mapPengirimanPenjualan);
  },

  async getById(id: number | string): Promise<PengirimanPenjualan> {
    const response = await api.get<ApiResponse<DeliveryOrderHeaderApi>>(
      `/do-header/${id}`
    );
    return mapPengirimanPenjualan(response.data.data);
  },

  /** Detail item — dipanggil terpisah saat buka halaman Detail/Edit (GetDoDetail di backend) */
  async getDetailItems(id: number | string): Promise<PengirimanDetailItem[]> {
    const response = await api.get<ApiResponse<DeliveryOrderDetailApi[]>>(
      `/do-detail/${id}`
    );
    return (response.data.data ?? []).map(mapPengirimanDetailItem);
  },

  /** Create Delivery Order baru — backend murni INSERT, tidak ada mode update/upsert untuk saat ini */
  async create(payload: PengirimanPenjualanPayload): Promise<PengirimanPenjualan> {
    const response = await api.post<ApiResponse<DeliveryOrderHeaderApi>>(
      "/delivery-order",
      payload
    );
    return mapPengirimanPenjualan(response.data.data);
  },
};