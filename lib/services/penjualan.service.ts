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

export function mapUangMuka(item: UangMukaApi): UangMuka {
  return {
    id: item.id,
    noFaktur: item.noFaktur,
    tanggal: item.tanggal,
    customerId: item.customerId,
    customerName: item.customerName,
    noPO: item.noPO,
    nomorSo: item.noSo,
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

  async getById(id: number | string): Promise<SalesOrder> {
    const response = await api.get<ApiResponse<SalesOrderApi>>(
      `/sales-order/${id}`
    );

    return mapSalesOrder(response.data.data);
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

export const salesQuotationService = {
  async getAll(): Promise<SalesQuotation[]> {
    const response = await api.get<ApiResponse<SalesQuotationApi[]>>(
      "/sales-quotation"
    );

    return (response.data.data ?? []).map(mapSalesQuotation);
  },

  async getById(id: number | string): Promise<SalesQuotation> {
    const response = await api.get<ApiResponse<SalesQuotationApi>>(
      `/sales-quotation/${id}`
    );

    return mapSalesQuotation(response.data.data);
  },

  async create(payload: Partial<SalesQuotationApi>): Promise<SalesQuotation> {
    const response = await api.post<ApiResponse<SalesQuotationApi>>(
      "/sales-quotation",
      payload
    );

    return mapSalesQuotation(response.data.data);
  },

  async update(
    id: number | string,
    payload: Partial<SalesQuotationApi>
  ): Promise<void> {
    await api.put(`/sales-quotation/${id}`, payload);
  },

  async remove(id: number | string): Promise<void> {
    await api.delete(`/sales-quotation/${id}`);
  },
};