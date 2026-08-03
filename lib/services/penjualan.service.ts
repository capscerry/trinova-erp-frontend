import { api, type ApiResponse } from "@/lib/api";

import { isApprovedForPicker, normalizeSalesStatus } from "@/lib/sales-status";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SalesOrderStatus =
  | "Draft"
  | "Processing"
  | "In Delivery"
  | "Completed"
  | "Cancelled";

export interface SalesOrderItemApi {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  subtotal: number;
}

export interface SalesOrderDetailItem {
  productId?: number;
  productCode?: string;
  productName: string;
  productQty: number;
  productPrice: number;
  productDiscount: number;
  totalPrice: number;
  uomId?: number;
  uomCode?: string;
  wareHouseId?: number;
  warehouseName?: string;
}

export interface SalesOrderDetailApi {
  orderId: number;
  soNumber: string;
  customerId: number;
  customerName: string;
  soDate: string;
  tanggalKirim: string;
  poNumber: string;
  address: string;
  keterangan: string;
  /** Grand total final — sudah dikurangi diskon, ditambah pajak */
  total: number;
  discountTotal?: number;
  taxTotal?: number;
  isTaxAble?: boolean;
  status?: SalesOrderStatus;
  isIndent?: boolean;
  quotationId?: number;
  quotationNumber?: string;
  detail: SalesOrderDetailItem[];
}

export interface ProductDropdown {
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  categoryId: number;
  categoryName: string;
  /** Total qty_available (semua gudang) dari /api/product-data */
  stock?: number;
  uom: string;
  uomId: number;         // ← BARU: pastikan backend mengirim ini
}

export interface Product {
  id: number;
  kode: string;
  nama: string;
  satuan: string;
  uomId : number;
  tipe: string;
  kategori: string;
  /** Total stok tersedia (semua gudang) — sumber: /api/product-data */
  stock: number;
}

export interface QuotationItem {
  id: string;
  productId?: number;    // ← BARU: id produk dari API
  uomId?: number;        // ← BARU: id satuan dari API
  produk: string;
  deskripsi: string;
  qty: number;
  satuan: string;
  harga: number;
  diskon: number;
  subtotal: number;
}

 
export interface SalesQuotationFormData {
  /** Opsional — diisi saat mode edit, dipakai untuk upsert ke backend */
  id?: number;
  nomor: string;
  tanggal: string;
  customerId: number | null;
  dipesanOleh: string;
  address: string;
  keterangan: string;
  /** PPN 11% — kalau dicentang, pajak otomatis dihitung & masuk ke Total (selalu inclusive) */
  kenaPajak: boolean;
  items: QuotationItem[];
}

export interface SalesQuotationPayload {
  /** Opsional — kalau diisi, backend akan UPDATE record yang sudah ada (upsert). Kosongkan untuk create baru. */
  id?: number;
  customerId: number;
  quotationNumber: string;
  quotationDate: string;
  address: string;
  notes: string;
  isTaxAble: boolean;
  isTaxIncluded: boolean;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  details: {
    productId: number;
    quantity: number;
    uomId: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
  }[];
}

export interface SalesOrderApi {
  orderId: number;
  soNumber: string;
  soDate: string;
  tanggalKirim: string;
  poNumber: string;
  customerName: string;
  notes: string;
  subTotal: number;
  status: SalesOrderStatus;
  isIndent?: boolean;
}

interface SalesOrderByCustomerApi {
  orderId?: number;
  id?: number;
  soNumber?: string;
  nomor?: string;
  soDate?: string;
  tanggal?: string;
  tanggalKirim?: string;
  poNumber?: string;
  customerName?: string;
  pelanggan?: string;
  address?: string;
  alamat?: string;
  notes?: string;
  keterangan?: string;
  status?: SalesOrderStatus;
  isTaxAble?: boolean;
  isTaxable?: boolean;
  isTaxIncluded?: boolean;
  taxTotal?: number;
  subTotal?: number;
  total?: number;
  isIndent?: boolean;
}

export interface SalesOrder {
  id: number;
  nomor: string;
  tanggal: string;
  tanggalKirim: string;
  pelanggan: string;
  poNumber: string;
  alamat?: string;
  keterangan: string;
  status: SalesOrderStatus;
  kenaPajak?: boolean;
  isTaxIncluded?: boolean;
  taxTotal?: number;
  isIndent?: boolean;
  total: number;
  items: SalesOrderItemApi[];
}

export interface SalesOrderDetail {
  id?: number;
  customerId?: number;
  nomor: string;
  tanggal: string;
  tanggalKirim: string;
  pelanggan: string;
  poNumber: string;
  alamat?: string;
  keterangan: string;
  status?: SalesOrderStatus;
  /** Grand total final dari API — sudah dikurangi diskon, ditambah pajak */
  total: number;
  discountTotal: number;
  taxTotal: number;
  kenaPajak: boolean;
  isIndent?: boolean;
  quotationId?: number;
  quotationNumber?: string;
  items: SalesOrderDetailItem[];
}

// ─── Payload SO → API ─────────────────────────────────────────────────────────

export interface SalesOrderPayload {
  header: {
    orderId?: number;
    soNumber: string;
    poNumber: string;
    soDate: string;
    customerId: number;
    isTaxAble: boolean;
    isTaxIncluded: boolean;
    address: string;
    notes: string;
    subTotal: number;
    discountTotal?: number;
    taxTotal?: number;
    quotationId?: number | null;
  };

  detail: {
    productId: number;
    productCode: string;
    productName: string;
    productQty: number;
    productPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    totalPrice: number;
    wareHouseId?: number | null;
    uomId?: number;
  }[];
}

// ─── Payload UM → API ─────────────────────────────────────────────────────────

export interface UangMukaPayload {
  id?: number;
  noFaktur: string;
  tanggal: string;
  customerId: number;
  noPO: string;
  noSo: string;
  nominalUangMuka: number;
  isTaxable: boolean;
  isTaxIncluded: boolean;
  taxAmount: number;
  totalAmount: number;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
}

export interface UangMukaApi extends UangMukaPayload {
  customerName?: string;
  soNumber?: string;
  SoNumber?: string;
  status?: string;
}

export interface UangMuka {
  id?: number;
  noFaktur: string;
  tanggal: string;
  customerId: number;
  customerName?: string;
  noPO: string;
  nomorSo: string;
  nominalUangMuka: number;
  isTaxable: boolean;
  isTaxIncluded: boolean;
  taxAmount: number;
  totalAmount: number;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
  status?: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapSalesOrder(item: SalesOrderApi): SalesOrder {
  return {
    id: item.orderId,
    nomor: item.soNumber,
    tanggal: item.soDate,
    tanggalKirim: item.tanggalKirim,
    poNumber: item.poNumber,
    pelanggan: item.customerName,
    keterangan: item.notes,
    status: normalizeSalesStatus("sales-order", item.status) as SalesOrderStatus,
    isIndent: item.isIndent ?? false,
    total: item.subTotal,
    items: [],
  };
}

export function mapSalesOrderDetail(item: SalesOrderDetailApi): SalesOrderDetail {
  return {
    id: item.orderId,
    customerId: item.customerId,
    nomor: item.soNumber,
    tanggal: item.soDate,
    tanggalKirim: item.tanggalKirim,
    poNumber: item.poNumber,
    pelanggan: item.customerName,
    alamat: item.address,
    keterangan: item.keterangan,
    total: item.total,
    discountTotal: item.discountTotal ?? 0,
    taxTotal: item.taxTotal ?? 0,
    kenaPajak: item.isTaxAble ?? false,
    status: normalizeSalesStatus("sales-order", item.status) as SalesOrderStatus,
    isIndent: item.isIndent ?? false,
    quotationId: item.quotationId ?? undefined,
    quotationNumber: item.quotationNumber ?? undefined,
    items: item.detail ?? [],
  };
}

export function mapProductData(item: ProductDropdown): Product {
  return {
    id: item.productId,
    kode: item.productCode,
    nama: item.productName,
    satuan: item.uom,
    uomId: item.uomId,    // ← BARU
    tipe: item.productType,
    kategori: item.categoryName,
    stock: item.stock ?? 0,
  };
}

export function mapUangMuka(item: UangMukaApi): UangMuka {
  return {
    id: item.id,
    noFaktur: item.noFaktur,
    tanggal: item.tanggal,
    customerId: item.customerId,
    customerName: item.customerName,
    noPO: item.noPO,
    nomorSo: item.noSo || item.soNumber || item.SoNumber || "",
    nominalUangMuka: item.nominalUangMuka,
    isTaxable: item.isTaxable,
    isTaxIncluded: item.isTaxIncluded,
    taxAmount: item.taxAmount,
    totalAmount: item.totalAmount,
    syaratPembayaran: item.syaratPembayaran,
    alamat: item.alamat,
    keterangan: item.keterangan,
    status: normalizeSalesStatus("down-payment", item.status),
  };
}

// ─── Services Sales Order ────────────────────────────────────────────────────

export const salesOrderService = {
  async getAll(): Promise<SalesOrder[]> {
    const response = await api.get<ApiResponse<SalesOrderApi[]>>(
      "/sales-order"
    );

    return (response.data.data ?? []).map(mapSalesOrder);
  },

  async getById(id: number | string): Promise<SalesOrderDetail> {
  const response = await api.get<ApiResponse<SalesOrderDetailApi>>(
    `/sales-order/${id}`
  );

    return mapSalesOrderDetail(response.data.data);
  },

  async create(payload: SalesOrderPayload): Promise<SalesOrder> {
    const response = await api.post<ApiResponse<{ header: SalesOrderApi; detail: unknown[] }>>(
      "/sales-order",
      payload
    );

    // Backend membungkus response create dalam { header, detail } — BEDA
    // dengan endpoint list/get yang mengembalikan field rata (flat). Kalau
    // langsung di-mapSalesOrder tanpa unwrap dulu, semua field (termasuk id)
    // jadi undefined karena mapSalesOrder mencari item.orderId, bukan
    // item.header.orderId.
    return mapSalesOrder(response.data.data.header);
  },

  async update(id: number | string, payload: SalesOrderPayload): Promise<void> {
    await api.put(`/sales-order/${id}`, payload);
  },

  async remove(id: number | string): Promise<void> {
    await api.delete(`/sales-order/${id}`);
  },

  /** Batalkan Sales Order — melepas reservasi stok untuk bagian yang belum dikirim */
  async cancel(id: number | string): Promise<void> {
    await api.patch(`/sales-order/${id}/cancel`);
  },

  /** Ambil daftar Sales Order berdasarkan customer — untuk "Ambil dari Pesanan Penjualan" */
  async getByCustomerId(customerId: number): Promise<SalesOrder[]> {
    const response = await api.get<ApiResponse<SalesOrderByCustomerApi[]>>(
      `/sales-order/by-customer/${customerId}`
    );

    return (response.data.data ?? [])
      .map((item) => ({
        id: item.orderId ?? item.id ?? 0,
        nomor: item.soNumber ?? item.nomor ?? "",
        tanggal: item.soDate ?? item.tanggal ?? "",
        tanggalKirim: item.tanggalKirim ?? "",
        poNumber: item.poNumber ?? "",
        pelanggan: item.customerName ?? item.pelanggan ?? "",
        alamat: item.address ?? item.alamat ?? "",
        keterangan: item.notes ?? item.keterangan ?? "",
        status: normalizeSalesStatus("sales-order", item.status) as SalesOrderStatus,
        kenaPajak: Boolean(item.isTaxAble ?? item.isTaxable ?? false),
        isTaxIncluded: Boolean(item.isTaxIncluded ?? item.isTaxAble ?? item.isTaxable ?? false),
        taxTotal: Number(item.taxTotal ?? 0),
        isIndent: Boolean(item.isIndent ?? false),
        total: item.subTotal ?? item.total ?? 0,
        items: [],
      }))
      .filter((item) => isApprovedForPicker("sales-order", item.status));
  },

  /** Detail items SO (kode produk, qty, harga) — untuk isi referensi di form Uang Muka */
  async getDetailItems(orderId: number | string): Promise<SalesOrderDetailItem[]> {
    const response = await api.get<ApiResponse<SalesOrderDetailApi>>(
      `/sales-order/${orderId}`
    );

    return response.data.data?.detail ?? [];
  },
};

// ─── Services Uang Muka ──────────────────────────────────────────────────────

export const uangMukaService = {
  async getAll(): Promise<UangMuka[]> {
    const response = await api.get<ApiResponse<UangMukaApi[]>>("/uang-muka");

    return (response.data.data ?? []).map(mapUangMuka);
  },

  async getById(id: number | string): Promise<UangMuka> {
    const response = await api.get<ApiResponse<UangMukaApi>>(
      `/uang-muka/${id}`
    );

    return mapUangMuka(response.data.data);
  },

  async create(payload: UangMukaPayload): Promise<UangMuka> {
    const response = await api.post<ApiResponse<UangMukaApi>>(
      "/uang-muka",
      payload
    );

    return mapUangMuka(response.data.data);
  },

  async update(id: number | string, payload: UangMukaPayload): Promise<void> {
    await api.put(`/uang-muka/${id}`, payload);
  },

  async remove(id: number | string): Promise<void> {
    await api.delete(`/uang-muka/${id}`);
  },
};

// ─── Product Dropdown ────────────────────────────────────────────────────────

export const productDropdownService = {
  async getAll(): Promise<Product[]> {
    const response = await api.get<ApiResponse<ProductDropdown[]>>(
      "/product-data"
    );

    return (response.data.data ?? []).map(mapProductData);
  },
};

// ─── Sales Quotation ─────────────────────────────────────────────────────────

export type QuotationStatus =
  | "Draft"
  | "Approved"
  | "Processed"
  | "Rejected"
  | "Cancelled";

export interface SalesQuotationApi {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  customerName: string;
  address : string;
  notes: string;
  status: QuotationStatus;
  totalAmount: number;
  items: SalesOrderItemApi[];
}

interface SalesQuotationListItemApi {
  id: number | string;
  quotationNumber?: string;
  quotationDate?: string;
  customerName?: string;
  address?: string;
  notes?: string;
  status?: QuotationStatus;
  subtotal?: number;
}

export interface SalesQuotation {
  id: string;
  nomor: string;
  tanggal: string;
  berlakuHingga: string;
  pelanggan: string;
  alamat : string;
  keterangan: string;
  status: QuotationStatus;
  total: number;
  items: SalesOrderItemApi[];
}

export function mapSalesQuotation(item: SalesQuotationApi): SalesQuotation {
  return {
    id: item.id,
    nomor: item.quotationNumber,
    tanggal: item.quotationDate,
    berlakuHingga: item.validUntil,
    pelanggan: item.customerName,
    alamat : item.address ?? "",
    keterangan: item.notes,
    status: normalizeSalesStatus("quotation", item.status) as QuotationStatus,
    total: item.totalAmount,
    items: item.items ?? [],
  };
}

// ─── Quotation Detail Items (GET /api/quotation-detail/{quotationId}) ─────────

export interface QuotationDetailItemApi {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  uomId: number;
  uomCode: string;
  price: number;
  discountPercent?: number;
}

export interface QuotationDetailItem {
  productId: number;
  productCode: string;
  productName: string;
  qty: number;
  uomId: number;
  satuan: string;
  /** Harga asli per unit, SEBELUM diskon */
  harga: number;
  /** Persentase diskon dari quotation (0 jika tidak ada) */
  discountPercent: number;
}

export function mapQuotationDetailItem(item: QuotationDetailItemApi): QuotationDetailItem {
  return {
    productId: item.productId,
    productCode: item.productCode ?? "",
    productName: item.productName,
    qty: item.quantity,
    uomId: item.uomId,
    satuan: item.uomCode ?? "",
    harga: item.price,
    discountPercent: item.discountPercent ?? 0,
  };
}

// ─── Quotation Full Detail (untuk halaman Detail & Print Penawaran) ──────────
// Sumber: GET /api/header-detail/{id}

export interface SalesQuotationHeaderDetailApi {
  header: {
    id: number;
    customerId: number;
    quotationNumber: string;
    customerName: string;
    customerEmail?: string;
    quotationDate: string;
    address?: string;
    notes: string;
    /** Grand total final dari backend — sudah dikurangi diskon, ditambah pajak */
    subtotal: number;
    discountTotal?: number;
    taxTotal?: number;
    isTaxAble?: boolean;
    status?: QuotationStatus;
  };
  detail: {
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    uomId: number;
    uomCode: string;
    price: number;
    discountPercent?: number;
  }[];
}

export interface SalesQuotationDetail {
  id: number;
  customerId: number;
  nomor: string;
  tanggal: string;
  pelanggan: string;
  pelangganEmail?: string;
  alamat: string;
  keterangan: string;
  /** Grand total final dari API — sudah dikurangi diskon, ditambah pajak */
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  kenaPajak: boolean;
  status?: QuotationStatus;
  items: {
    productId: number;
    productCode: string;
    productName: string;
    qty: number;
    uomId?: number;
    satuan: string;
    harga: number;
    discountPercent: number;
    /** Total per baris SETELAH diskon (pajak dihitung & ditampilkan di header) */
    totalHarga: number;
  }[];
}

export function mapSalesQuotationDetail(item: SalesQuotationHeaderDetailApi): SalesQuotationDetail {
  const items = (item.detail ?? []).map((d) => {
    const discountPercent = d.discountPercent ?? 0;
    const lineGross = d.price * d.quantity;
    const totalHarga = lineGross * (1 - discountPercent / 100);

    return {
      productId: d.productId,
      productCode: d.productCode ?? "",
      productName: d.productName,
      qty: d.quantity,
      uomId: d.uomId,
      satuan: d.uomCode ?? "",
      harga: d.price,
      discountPercent,
      totalHarga,
    };
  });

  return {
    id: item.header.id,
    customerId: item.header.customerId,
    nomor: item.header.quotationNumber,
    tanggal: item.header.quotationDate,
    pelanggan: item.header.customerName,
    pelangganEmail: item.header.customerEmail ?? "",
    alamat: item.header.address ?? "",
    keterangan: item.header.notes ?? "",
    subtotal: item.header.subtotal,
    discountTotal: item.header.discountTotal ?? 0,
    taxTotal: item.header.taxTotal ?? 0,
    kenaPajak: item.header.isTaxAble ?? false,
    status: normalizeSalesStatus("quotation", item.header.status) as QuotationStatus,
    items,
  };
}

export const salesQuotationService = {
  async getAll(): Promise<SalesQuotation[]> {
  const response = await api.get<ApiResponse<SalesQuotationListItemApi[]>>(
    "/SalesQuotation"
  );

  return (response.data.data ?? []).map((item) => ({
    id: String(item.id),
    nomor: item.quotationNumber ?? "",
    tanggal: item.quotationDate ?? "",
    berlakuHingga: "",
    pelanggan: item.customerName ?? "",
    alamat : item.address ?? "",
    keterangan: item.notes ?? "",
    status: normalizeSalesStatus("quotation", item.status) as QuotationStatus,
    total: item.subtotal ?? 0,
    items: [],
  }));
},

  async getById(id: number | string): Promise<SalesQuotation> {
    const response = await api.get<ApiResponse<SalesQuotationApi>>(
      `/SalesQuotation/${id}`
    );

    return mapSalesQuotation(response.data.data);
  },

  /** Detail items untuk "Ambil dari Penawaran Penjualan" di form SO */
  async getDetailItems(quotationId: number | string): Promise<QuotationDetailItem[]> {
    const response = await api.get<ApiResponse<QuotationDetailItemApi[]>>(
      `/quotation-detail/${quotationId}`
    );

    return (response.data.data ?? []).map(mapQuotationDetailItem);
  },

  /** Detail lengkap (header + items) untuk halaman Detail & Print Penawaran. */
  async getFullDetailById(id: number | string): Promise<SalesQuotationDetail> {
    const response = await api.get<ApiResponse<SalesQuotationHeaderDetailApi>>(
      `/header-detail/${id}`
    );

    return mapSalesQuotationDetail(response.data.data);
  },

  /**
   * Kirim penawaran ke email pelanggan terdaftar (SMTP di backend).
   * `attachment` (opsional) adalah PDF hasil render halaman Cetak/PDF di
   * sisi frontend (lihat lib/pdf/quotationPdf.tsx) — dikirim sebagai base64
   * supaya backend tinggal melampirkannya ke email, bukan generate ulang.
   */
  async sendEmail(
    id: number | string,
    message?: string,
    attachment?: { base64: string; fileName: string }
  ): Promise<string> {
    const response = await api.post<ApiResponse<null>>(
      `/SalesQuotation/${id}/send-email`,
      {
        message: message && message.length > 0 ? message : undefined,
        attachmentBase64: attachment?.base64,
        attachmentFileName: attachment?.fileName,
      }
    );

    return response.data.message ?? "Email penawaran berhasil dikirim.";
  },

  /** Ambil daftar quotation berdasarkan customer */
  async getByCustomerId(customerId: number): Promise<SalesQuotation[]> {
    const response = await api.get<ApiResponse<SalesQuotationListItemApi[]>>(
      `/SalesQuotation/${customerId}`
    );

    return (response.data.data ?? [])
      .map((item) => ({
        id: String(item.id),
        nomor: item.quotationNumber ?? "",
        tanggal: item.quotationDate ?? "",
        berlakuHingga: "",
        pelanggan: item.customerName ?? "",
        alamat : item.address ?? "",
        keterangan: item.notes ?? "",
        status: normalizeSalesStatus("quotation", item.status) as QuotationStatus,
        total: item.subtotal ?? 0,
        items: [],
      }))
      .filter((item) => isApprovedForPicker("quotation", item.status));
  },

  async create(payload: SalesQuotationPayload): Promise<SalesQuotation> {
    const response = await api.post<ApiResponse<SalesQuotationApi>>(
      "/SalesQuotation",
      payload
    );
    return mapSalesQuotation(response.data.data);
  },

  async update(
    id: number | string,
    payload: Partial<SalesQuotationApi>
  ): Promise<void> {
    await api.put(`/SalesQuotation/${id}`, payload);
  },

  async remove(id: number | string): Promise<void> {
    await api.delete(`/SalesQuotation/${id}`);
  },
};

// ─── Bank Dropdown ────────────────────────────────────────────────────────────

export interface BankApi {
  id: number;
  bankName: string;
  bankAccount: string;
}

export interface Bank {
  id: number;
  nama: string;
  noRekening: string;
}

export function mapBank(item: BankApi): Bank {
  return {
    id: item.id,
    nama: item.bankName,
    noRekening: item.bankAccount,
  };
}

export const bankService = {
  async getAll(): Promise<Bank[]> {
    const response = await api.get<ApiResponse<BankApi[]>>("/bank");
    return (response.data.data ?? []).map(mapBank);
  },
};

// ─── Penerimaan Penjualan (Sales Receipt) ─────────────────────────────────────

export interface PenerimaanPenjualanApi {
  id: number;
  noBukti: string;
  customerId: number;
  customerName: string;
  bankId: number;
  bankName: string;
  nilaiPembayaran: number;
  tanggalBayar: string;
  uangMukaId?: number | null;
  uangMukaNumber?: string | null;
  salesOrderId?: number | null;
  salesOrderNumber?: string | null;
  salesInvoiceId?: number | null;
  status?: string;
}

export interface PenerimaanPenjualan {
  id: number;
  noBukti: string;
  customerId: number;
  pelanggan: string;
  bankId: number;
  bank: string;
  nilaiPembayaran: number;
  tanggalBayar: string;
  uangMukaId?: number;
  uangMukaNumber?: string;
  salesOrderId?: number;
  salesOrderNumber?: string;
  salesInvoiceId?: number;
  status?: string;
}

/** Payload untuk POST /api/sales-receipt — id TIDAK dikirim (auto dari backend) */
export interface PenerimaanPenjualanPayload {
  noBukti: string;
  customerId: number;
  bankId: number;
  nilaiPembayaran: number;
  tanggalBayar: string;
  uangMukaId?: number | null;
  salesOrderId?: number | null;
  salesInvoiceId?: number | null;
}

export function mapPenerimaanPenjualan(item: PenerimaanPenjualanApi): PenerimaanPenjualan {
  return {
    id: item.id,
    noBukti: item.noBukti,
    customerId: item.customerId,
    pelanggan: item.customerName,
    bankId: item.bankId,
    bank: item.bankName,
    nilaiPembayaran: item.nilaiPembayaran,
    tanggalBayar: item.tanggalBayar,
    uangMukaId: item.uangMukaId ?? undefined,
    uangMukaNumber: item.uangMukaNumber ?? undefined,
    salesOrderId: item.salesOrderId ?? undefined,
    salesOrderNumber: item.salesOrderNumber ?? undefined,
    salesInvoiceId: item.salesInvoiceId ?? undefined,
    status: normalizeSalesStatus("sales-receipt", item.status),
  };
}

export const penerimaanPenjualanService = {
  async getAll(): Promise<PenerimaanPenjualan[]> {
    const response = await api.get<ApiResponse<PenerimaanPenjualanApi[]>>(
      "/sales-receipt"
    );
    return (response.data.data ?? []).map(mapPenerimaanPenjualan);
  },

  async create(payload: PenerimaanPenjualanPayload): Promise<PenerimaanPenjualan> {
    const response = await api.post<ApiResponse<PenerimaanPenjualanApi>>(
      "/sales-receipt",
      payload
    );
    return mapPenerimaanPenjualan(response.data.data);
  },

  async update(id: number | string, payload: PenerimaanPenjualanPayload): Promise<void> {
    await api.put(`/sales-receipt/${id}`, payload);
  },

  async getById(id: number | string): Promise<PenerimaanPenjualan> {
    const list = await this.getAll();
    const found = list.find((item) => Number(item.id) === Number(id));
    if (!found) throw new Error("Penerimaan penjualan tidak ditemukan");
    return found;
  },
};

