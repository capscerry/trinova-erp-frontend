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
  subtotal: number;
}

export interface ProductDropdown {
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  categoryId: number;
  categoryName: string;
  uom: string;
}

export interface Product {
  id: number;
  kode: string;
  nama: string;
  satuan: string;
  tipe: string;
  kategori: string;
}

export interface SalesOrderApi {
  orderId: number;
  soNumber: string;
  soDate: string;
  tanggalKirim: string;
  customerName: string;
  notes: string;
  subTotal: number;
  status: SalesOrderStatus;
}

export interface SalesOrder {
  id: string;
  nomor: string;
  tanggal: string;
  tanggalKirim: string;
  pelanggan: string;
  salesQuotation: string;
  dipesanOleh: string;
  alamatPengiriman: string;
  keterangan: string;
  status: SalesOrderStatus;
  total: number;
  items: SalesOrderItemApi[];
}

// ─── Payload SO → API ─────────────────────────────────────────────────────────

export interface SalesOrderPayload {
  header: {
    soNumber: string;
    tanggalKirim: string | null;
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
  id: number;

  noFaktur: string;
  tanggal: string;

  customerId: number;

  noPO: string;

  nominalUangMuka: number;

  isTaxable: boolean;
  isTaxIncluded: boolean;

  taxAmount: number;

  totalAmount: number;

  syaratPembayaran: string;

  alamat: string;

  keterangan: string;
}

export interface UangMuka {
  noFaktur: string;
  tanggal: string;
  customerId: number;
  noPO: string;

  nominalUangMuka: number;
  nomorSo: string;
  totalAmount: number;

  syaratPembayaran: string;

  alamat: string;
  keterangan: string;
}
// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapSalesOrder(item: SalesOrderApi): SalesOrder {
  return {
    id: String(item.orderId),
    nomor: item.soNumber,
    tanggal: item.soDate,
    tanggalKirim: item.tanggalKirim,
    pelanggan: item.customerName,
    salesQuotation: "",
    dipesanOleh: "",
    alamatPengiriman: "",
    keterangan: item.notes,
    status: item.status,
    total: item.subTotal,
    items: [],
  };
}

export function mapProductData(item: ProductDropdown): Product {
  return {
    id: item.productId,
    kode: item.productCode,
    nama: item.productName,
    satuan: item.uom,
    tipe: item.productType,
    kategori: item.categoryName,
  };
}

export function mapFormToApiPayload(
  form: UangMukaFormData
): UangMukaPayload {

  const taxAmount = form.kenaPajak
    ? form.uangMuka * 0.11
    : 0;

  const totalAmount = form.totalTermasukPajak
    ? form.uangMuka + taxAmount
    : form.uangMuka;

  return {
    id: form.id ?? 0,

    noFaktur: form.noFaktur,

    tanggal: new Date(form.tanggal).toISOString(),

    customerId: Number(form.customerId ?? 0),

    noPO: form.noPO,

    nominalUangMuka: Number(form.uangMuka),

    isTaxable: form.kenaPajak,

    isTaxIncluded: form.totalTermasukPajak,

    taxAmount,

    totalAmount,

    syaratPembayaran: form.syaratPembayaran,

    alamat: form.alamat,

    keterangan: form.keterangan,
  };
}

// ─── Services Sales Order ────────────────────────────────────────────────────

export const salesOrderService = {
  async getAll(): Promise<SalesOrder[]> {
    const res = await api.get<ApiResponse<SalesOrderApi[]>>("/sales-order");
    return (res.data.data ?? []).map(mapSalesOrder);
  },

  async getById(id: string): Promise<SalesOrder> {
    const res = await api.get<ApiResponse<SalesOrderApi>>(
      `/sales-order/${id}`
    );

    return mapSalesOrder(res.data.data);
  },

  async create(payload: SalesOrderPayload): Promise<any> {
    const response = await api.post("/sales-order", payload);
    return response.data.data;
  },

  async update(id: string, payload: SalesOrderPayload): Promise<void> {
    await api.put(`/sales-order/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/sales-order/${id}`);
  },

  async confirm(id: string): Promise<void> {
    await api.patch(`/sales-order/${id}/confirm`);
  },
};

// ─── Services Uang Muka ──────────────────────────────────────────────────────

export const uangMukaService = {
  async getAll(): Promise<UangMuka[]> {
    const response = await api.get<ApiResponse<UangMuka[]>>("/uang-muka");

    return response.data.data ?? [];
  },

  async getById(id: string): Promise<UangMuka> {
    const response = await api.get<ApiResponse<UangMuka>>(
      `/uang-muka/${id}`
    );

    return response.data.data;
  },

  async create(payload: UangMukaPayload): Promise<any> {
    const response = await api.post("/uang-muka", payload);
    return response.data.data;
  },

  async update(id: string, payload: UangMukaPayload): Promise<void> {
    await api.put(`/uang-muka/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/uang-muka/${id}`);
  },
};

// ─── Product Dropdown ────────────────────────────────────────────────────────

export const productDropdownService = {
  async getAll(): Promise<Product[]> {
    const res = await api.get<ApiResponse<ProductDropdown[]>>(
      "/product-data"
    );

    return (res.data.data ?? []).map(mapProductData);
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

export function mapSalesQuotation(
  item: SalesQuotationApi
): SalesQuotation {
  return {
    id: item.id,
    nomor: item.quotationNumber,
    tanggal: item.quotationDate,
    berlakuHingga: item.validUntil,
    pelanggan: item.customerName,
    keterangan: item.notes,
    status: item.status,
    total: item.totalAmount,
    items: item.items,
  };
}

export const salesQuotationService = {
  async getAll(): Promise<SalesQuotation[]> {
    const res = await api.get<ApiResponse<SalesQuotationApi[]>>(
      "/sales-quotation"
    );

    return (res.data.data ?? []).map(mapSalesQuotation);
  },

  async getById(id: string): Promise<SalesQuotation> {
    const res = await api.get<ApiResponse<SalesQuotationApi>>(
      `/sales-quotation/${id}`
    );

    return mapSalesQuotation(res.data.data);
  },

  async create(payload: Partial<SalesQuotationApi>): Promise<void> {
    await api.post("/sales-quotation", payload);
  },

  async update(
    id: string,
    payload: Partial<SalesQuotationApi>
  ): Promise<void> {
    await api.put(`/sales-quotation/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/sales-quotation/${id}`);
  },
};