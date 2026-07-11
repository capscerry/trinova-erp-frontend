import { api, type ApiResponse } from "@/lib/api";
import { normalizeSalesStatus } from "@/lib/sales-status";

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
  status?: string;
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
  status?: string;
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
    status: normalizeSalesStatus("delivery-order", item.status),
  };
}

function extractDeliveryOrderHeader(
  body:
    | ApiResponse<DeliveryOrderHeaderApi>
    | DeliveryOrderHeaderApi
    | { header?: DeliveryOrderHeaderApi }
    | null
    | undefined
) {
  if (!body) return undefined;
  if ("data" in body && body.data) return body.data;
  if ("header" in body && body.header) return body.header;
  return body as DeliveryOrderHeaderApi;
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
  warehouseId?: number;
  warehouseName?: string;
}

export interface PengirimanDetailItem {
  productId: number;
  productCode: string;
  productName: string;
  uomId?: number;
  satuan: string;
  qtyDipesan: number;
  qtyDikirim: number;
  warehouseId?: number;
  warehouseName?: string;
}

export interface PengirimanPenjualanFullDetail extends PengirimanPenjualan {
  items: PengirimanDetailItem[];
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
    warehouseId: item.warehouseId ?? undefined,
    warehouseName: item.warehouseName ?? undefined,
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
  warehouseId?: number | null;
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
    const list = await this.getAll();
    const found = list.find((item) => Number(item.id) === Number(id));
    if (!found) throw new Error("Pengiriman penjualan tidak ditemukan");
    return found;
  },

  async getFullDetailById(id: number | string): Promise<PengirimanPenjualanFullDetail> {
    const [header, items] = await Promise.all([
      this.getById(id),
      this.getDetailItems(id),
    ]);
    return { ...header, items };
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
    const header = extractDeliveryOrderHeader(response.data);

    if (header?.id) {
      return mapPengirimanPenjualan(header);
    }

    const inserted = await this.getAll();
    const found = inserted.find((item) =>
      item.noSuratJalan === payload.header.doNumber ||
      (
        item.customerId === payload.header.customerId &&
        item.noPO === payload.header.poNumber &&
        item.tanggalKirim?.slice(0, 10) === payload.header.doDate?.slice(0, 10)
      )
    );

    if (found) return found;

    return {
      id: 0,
      noSuratJalan: payload.header.doNumber ?? "",
      tanggalKirim: payload.header.doDate,
      customerId: payload.header.customerId,
      pelanggan: "",
      soId: payload.header.soId ?? undefined,
      noPO: payload.header.poNumber,
      shippingTypeId: payload.header.deliveryCategoryId,
      shippingType: "",
      alamatPengiriman: payload.header.address ?? "",
      keterangan: payload.header.notes ?? "",
      status: "Draft",
    };
  },

  async update(id: number | string, payload: PengirimanPenjualanPayload): Promise<void> {
    await api.put(`/delivery-order/${id}`, payload);
  },
};
