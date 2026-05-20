import { api, type ApiResponse } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SalesOrderStatus =
  | "Draft" | "Dikonfirmasi" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan";

export interface SalesOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}


export interface ProductDropdown{
  productId : number,
  productCode : string,
  productName : string,
  productType: string,
  categoryId : number,
  categoryName :string ,
  uom : string
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
  id: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  customerName: string;
  quotationNumber?: string;
  orderedBy: string;
  deliveryAddress: string;
  notes: string;
  status: SalesOrderStatus;
  totalAmount: number;
  items: SalesOrderItem[];
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
  items: SalesOrderItem[];
}

export interface SalesOrderPayload {
  header: {
    id: number;
    soNumber: string;
    tanggalKirim: string | null;
    soDate: string;
    customerId: number;
    isTaxAble: boolean;
    isTaxIncluded: boolean;
    address: string;
    notes: string;
  };
  detail: {
    orderId: number;
    productId: number;
    productCode: string;
    productName: string;
    productQty: number;
    productPrice: number;
    discountAmount: number;
    totalPrice: number;
    wareHouseId: number | null;
  }[];
}



// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapSalesOrder(item: SalesOrderApi): SalesOrder {
  return {
    id: item.id,
    nomor: item.orderNumber,
    tanggal: item.orderDate,
    tanggalKirim: item.deliveryDate,
    pelanggan: item.customerName,
    salesQuotation: item.quotationNumber ?? "",
    dipesanOleh: item.orderedBy,
    alamatPengiriman: item.deliveryAddress,
    keterangan: item.notes,
    status: item.status,
    total: item.totalAmount,
    items: item.items,
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

// ─── Service ──────────────────────────────────────────────────────────────────

export const salesOrderService = {
  async getAll(): Promise<SalesOrder[]> {
    const res = await api.get<ApiResponse<SalesOrderApi[]>>("/sales-order");
    return (res.data.data ?? []).map(mapSalesOrder);
  },

  async getById(id: string): Promise<SalesOrder> {
    const res = await api.get<ApiResponse<SalesOrderApi>>(`/sales-order/${id}`);
    return mapSalesOrder(res.data.data);
  },

  async create(payload: SalesOrderPayload): Promise<void> {
    await api.post("/sales-order", payload);
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

// ─── Sales Quotation ──────────────────────────────────────────────────────────

export type QuotationStatus = "Draft" | "Dikirim" | "Disetujui" | "Ditolak" | "Kedaluwarsa";

export interface SalesQuotationApi {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  customerName: string;
  notes: string;
  status: QuotationStatus;
  totalAmount: number;
  items: SalesOrderItem[];
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
  items: SalesOrderItem[];
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
    items: item.items,
  };
}

export const salesQuotationService = {
  async getAll(): Promise<SalesQuotation[]> {
    const res = await api.get<ApiResponse<SalesQuotationApi[]>>("/sales-quotation");
    return (res.data.data ?? []).map(mapSalesQuotation);
  },

  async getById(id: string): Promise<SalesQuotation> {
    const res = await api.get<ApiResponse<SalesQuotationApi>>(`/sales-quotation/${id}`);
    return mapSalesQuotation(res.data.data);
  },

  async create(payload: Partial<SalesQuotationApi>): Promise<void> {
    await api.post("/sales-quotation", payload);
  },

  async update(id: string, payload: Partial<SalesQuotationApi>): Promise<void> {
    await api.put(`/sales-quotation/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/sales-quotation/${id}`);
  },
};

export const productDropdownService = {
  async getAll(): Promise<Product[]>{
    const res = await api.get<ApiResponse<ProductDropdown[]>>("/product-data");
    return (res.data.data ?? []).map(mapProductData);
  }
}
