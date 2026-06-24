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
    const response = await api.get<ShippingTypeApi[]>("/shipping-type");
    return (response.data ?? []).map(mapShippingType);
  },
};

// ─── Cek Stok Gudang (untuk validasi qty kirim vs stok tersedia) ──────────────
// CATATAN: struktur response GET /InventoryStock BELUM DIKONFIRMASI dari
// backend — field di bawah ini ASUMSI SEMENTARA. Begitu struktur asli
// dikonfirmasi, cukup sesuaikan StockItemApi + mapStockItem, tidak perlu
// ubah kode lain (PengirimanModal cuma panggil inventoryStockService.getAll()).

export interface StockItemApi {
  productId: number;
  warehouseId: number;
  qtyAvailable: number;
}

export interface StockItem {
  productId: number;
  warehouseId: number;
  qty: number;
}

export function mapStockItem(item: StockItemApi): StockItem {
  return {
    productId: item.productId,
    warehouseId: item.warehouseId,
    qty: item.qtyAvailable,
  };
}

export const inventoryStockService = {
  /** Ambil SEMUA stok (semua produk, semua gudang) — filter per gudang dilakukan di frontend untuk sekarang */
  async getAll(): Promise<StockItem[]> {
    const response = await api.get<ApiResponse<StockItemApi[]>>("/InventoryStock");
    return (response.data.data ?? []).map(mapStockItem);
  },

  /** Helper: cari qty stok untuk satu productId di satu warehouseId tertentu */
  findQty(stocks: StockItem[], productId: number, warehouseId: number): number {
    const found = stocks.find(
      (s) => s.productId === productId && s.warehouseId === warehouseId
    );
    return found?.qty ?? 0;
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
  poNumber?: string;
  soNumber?: string;
  deliveryCategoryId: number;
  deliveryShippingName?: string;
  warehouseId?: number;
  warehouseName?: string;
  address?: string;
  notes?: string;
}

export interface PengirimanPenjualan {
  id: number;
  noSuratJalan: string;
  tanggalKirim: string;
  customerId: number;
  pelanggan: string;
  noSo?: string;
  noPO?: string;
  shippingTypeId: number;
  shippingType: string;
  warehouseId?: number;
  warehouseName?: string;
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
    noPO: item.poNumber ?? undefined,
    shippingTypeId: item.deliveryCategoryId,
    shippingType: item.deliveryShippingName ?? "",
    warehouseId: item.warehouseId ?? undefined,
    warehouseName: item.warehouseName ?? undefined,
    alamatPengiriman: item.address ?? "",
    keterangan: item.notes ?? "",
  };
}

// ─── Detail Item (dari GetDoDetail, di-fetch terpisah saat buka Detail/Edit) ──

export interface DeliveryOrderDetailApi {
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

/** Payload untuk POST /api/do-header (create/upsert) — id opsional: kosong = create, terisi = update */
export interface PengirimanPenjualanPayload {
  id?: number;
  doNumber: string;
  doDate: string;
  customerId: number;
  soId?: number | null;
  poNumber?: string;
  deliveryCategoryId: number;
  warehouseId?: number | null;
  address: string;
  notes?: string;
  detail: {
    productId: number;
    uomId?: number;
    qtyDipesan: number;
    qtyDikirim: number;
  }[];
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

  /** create() berperan sebagai upsert — kirim payload.id untuk update record yang sudah ada */
  async create(payload: PengirimanPenjualanPayload): Promise<PengirimanPenjualan> {
    const response = await api.post<ApiResponse<DeliveryOrderHeaderApi>>(
      "/do-header",
      payload
    );
    return mapPengirimanPenjualan(response.data.data);
  },
};