import { api, type ApiResponse } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SalesOrderStatus =
  | "Draft"
  | "Dikonfirmasi"
  | "Diproses"
  | "Dikirim"
  | "Selesai"
  | "Dibatalkan";

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
  productName: string;
  productQty: number;
  productPrice: number;
  productDiscount: number;
  totalPrice: number;
}

export interface SalesOrderDetailApi {
  soNumber: string;
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
  detail: SalesOrderDetailItem[];
}

export interface ProductDropdown {
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  categoryId: number;
  categoryName: string;
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
  customerId: number;
  quotationNumber: string;
  quotationDate: string;
  address: string;
  notes: string;
  isTaxable: boolean;
  isTaxIncluded: boolean;
  subtotal: number;
  discountTotal: number;
  details: {
    productId: number;
    quantity: number;
    uomId: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
  }[];
}

interface SalesQuotationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SalesQuotationFormData) => void | Promise<void>;
  initialData?: SalesQuotationFormData;
  submitting?: boolean;
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
}

export interface SalesOrder {
  id: number;
  nomor: string;
  tanggal: string;
  tanggalKirim: string;
  pelanggan: string;
  poNumber: string;
  keterangan: string;
  status: SalesOrderStatus;
  total: number;
  items: SalesOrderItemApi[];
}

export interface SalesOrderDetail {
  id?: number;
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
  items: SalesOrderDetailItem[];
}

// ─── Payload SO → API ─────────────────────────────────────────────────────────

export interface SalesOrderPayload {
  header: {
    soNumber: string;
    tanggalKirim: string | null;
    poNumber: string;
    soDate: string;
    customerId: number;
    isTaxAble: boolean;
    isTaxIncluded: boolean;
    address: string;
    notes: string;
    subTotal: number;
  };

  detail: {
    productId: number;
    productCode: string;
    productName: string;
    productQty: number;
    productPrice: number;
    discountAmount: number;
    totalPrice: number;
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
  soNumber ? : string;
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
    status: item.status,
    total: item.subTotal,
    items: [],
  };
}

export function mapSalesOrderDetail(item: SalesOrderDetailApi): SalesOrderDetail {
  return {
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
    nomorSo: item.noSo || item.soNumber || "",
    nominalUangMuka: item.nominalUangMuka,
    isTaxable: item.isTaxable,
    isTaxIncluded: item.isTaxIncluded,
    taxAmount: item.taxAmount,
    totalAmount: item.totalAmount,
    syaratPembayaran: item.syaratPembayaran,
    alamat: item.alamat,
    keterangan: item.keterangan,
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
    const response = await api.post<ApiResponse<SalesOrderApi>>(
      "/sales-order",
      payload
    );

    return mapSalesOrder(response.data.data);
  },

  async update(id: number | string, payload: SalesOrderPayload): Promise<void> {
    await api.put(`/sales-order/${id}`, payload);
  },

  async remove(id: number | string): Promise<void> {
    await api.delete(`/sales-order/${id}`);
  },

  async confirm(id: number | string): Promise<void> {
    await api.patch(`/sales-order/${id}/confirm`);
  },

  /** Ambil daftar Sales Order berdasarkan customer — untuk "Ambil dari Pesanan Penjualan" */
  async getByCustomerId(customerId: number): Promise<SalesOrder[]> {
    const response = await api.get<ApiResponse<any[]>>(
      `/sales-order/by-customer/${customerId}`
    );

    return (response.data.data ?? []).map((item: any) => ({
      id: item.orderId ?? item.id,
      nomor: item.soNumber ?? item.nomor,
      tanggal: item.soDate ?? item.tanggal,
      tanggalKirim: item.tanggalKirim ?? "",
      poNumber: item.poNumber ?? "",
      pelanggan: item.customerName ?? item.pelanggan ?? "",
      keterangan: item.notes ?? item.keterangan ?? "",
      status: item.status ?? "Draft",
      total: item.subTotal ?? item.total ?? 0,
      items: [],
    }));
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
  | "Dikirim"
  | "Disetujui"
  | "Ditolak"
  | "Kedaluwarsa";

export interface SalesQuotationApi {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  customerName: string;
  notes: string;
  status: QuotationStatus;
  totalAmount: number;
  items: SalesOrderItemApi[];
}

export interface SalesQuotation {
  id: string;
  nomor: string;
  tanggal: string;
  berlakuHingga: string;
  pelanggan: string;
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
    keterangan: item.notes,
    status: item.status,
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
    quotationNumber: string;
    customerName: string;
    quotationDate: string;
    notes: string;
    /** Grand total final dari backend — sudah dikurangi diskon, ditambah pajak */
    subtotal: number;
    discountTotal?: number;
    taxTotal?: number;
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
  nomor: string;
  tanggal: string;
  pelanggan: string;
  keterangan: string;
  /** Grand total final dari API — sudah dikurangi diskon, ditambah pajak */
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  items: {
    productCode: string;
    productName: string;
    qty: number;
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
      productCode: d.productCode ?? "",
      productName: d.productName,
      qty: d.quantity,
      satuan: d.uomCode ?? "",
      harga: d.price,
      discountPercent,
      totalHarga,
    };
  });

  return {
    id: item.header.id,
    nomor: item.header.quotationNumber,
    tanggal: item.header.quotationDate,
    pelanggan: item.header.customerName,
    keterangan: item.header.notes ?? "",
    subtotal: item.header.subtotal,
    discountTotal: item.header.discountTotal ?? 0,
    taxTotal: item.header.taxTotal ?? 0,
    items,
  };
}

export const salesQuotationService = {
  async getAll(): Promise<SalesQuotation[]> {
  const response = await api.get<ApiResponse<any[]>>(
    "/SalesQuotation"
  );

  return (response.data.data ?? []).map((item) => ({
    id: String(item.id),
    nomor: item.quotationNumber,
    tanggal: item.quotationDate,
    berlakuHingga: "",
    pelanggan: item.customerName,
    keterangan: item.notes ?? "",
    status: "Draft",
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

  /** Ambil daftar quotation berdasarkan customer */
  async getByCustomerId(customerId: number): Promise<SalesQuotation[]> {
    const response = await api.get<ApiResponse<any[]>>(
      `/SalesQuotation/${customerId}`
    );

    return (response.data.data ?? []).map((item: any) => ({
      id: String(item.id),
      nomor: item.quotationNumber,
      tanggal: item.quotationDate,
      berlakuHingga: "",
      pelanggan: item.customerName,
      keterangan: item.notes ?? "",
      status: item.status ?? "Draft",
      total: item.subtotal ?? 0,
      items: [],
    }));
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
  salesOrderId?: number | null;
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
  salesOrderId?: number;
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
    salesOrderId: item.salesOrderId ?? undefined,
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
};