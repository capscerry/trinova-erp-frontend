import { api, type ApiResponse } from "@/lib/api";
import { normalizeSalesStatus } from "@/lib/sales-status";

export type SalesInvoiceStatus =
  | "Draft"
  | "Issued"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export interface SalesInvoiceApi {
  id: number;
  invoiceNumber?: string;
  noFaktur?: string;
  invoiceDate?: string;
  tanggal?: string;
  dueDate?: string;
  jatuhTempo?: string;
  customerId: number;
  customerName?: string;
  salesOrderId?: number | null;
  salesOrderNumber?: string;
  soNumber?: string;
  deliveryOrderId?: number | null;
  deliveryOrderNumber?: string;
  doNumber?: string;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  downPaymentAmount?: number;
  shippingCost?: number;
  grandTotal?: number;
  paidAmount?: number;
  remainingAmount?: number;
  status?: SalesInvoiceStatus | string;
  notes?: string;
}

export interface SalesInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerId: number;
  customerName: string;
  salesOrderId?: number;
  salesOrderNumber?: string;
  deliveryOrderId?: number;
  deliveryOrderNumber?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  downPaymentAmount: number;
  shippingCost: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  status: SalesInvoiceStatus | string;
  notes: string;
}

export interface SalesInvoicePayload {
  header: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    customerId: number;
    salesOrderId?: number | null;
    deliveryOrderId?: number | null;
    notes?: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    downPaymentAmount: number;
    shippingCost: number;
    grandTotal: number;
  };
  detail: {
    productId: number;
    productCode?: string;
    productName?: string;
    uomId?: number;
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    taxAmount: number;
    subtotal: number;
    warehouseId?: number | null;
  }[];
}

export interface SalesInvoiceDetailApi {
  id: number;
  salesInvoiceId: number;
  productId: number;
  productCode?: string;
  productName?: string;
  description?: string;
  quantity: number;
  uomId?: number;
  uomName?: string;
  price: number;
  discount: number;
  discountAmount?: number;
  tax: number;
  taxAmount?: number;
  subtotal: number;
}

export interface SalesInvoiceDetailItem {
  id: number;
  salesInvoiceId: number;
  productId: number;
  productCode: string;
  productName: string;
  description: string;
  quantity: number;
  uomId?: number;
  uomName: string;
  price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export interface SalesInvoiceDetailResponseApi {
  header: SalesInvoiceApi;
  detail: SalesInvoiceDetailApi[];
}

export interface SalesInvoiceFullDetail extends SalesInvoice {
  items: SalesInvoiceDetailItem[];
}

export function mapSalesInvoice(item: SalesInvoiceApi): SalesInvoice {
  return {
    id: item.id,
    invoiceNumber: item.invoiceNumber ?? item.noFaktur ?? "",
    invoiceDate: item.invoiceDate ?? item.tanggal ?? "",
    dueDate: item.dueDate ?? item.jatuhTempo ?? "",
    customerId: item.customerId,
    customerName: item.customerName ?? "",
    salesOrderId: item.salesOrderId ?? undefined,
    salesOrderNumber: item.salesOrderNumber ?? item.soNumber ?? undefined,
    deliveryOrderId: item.deliveryOrderId ?? undefined,
    deliveryOrderNumber: item.deliveryOrderNumber ?? item.doNumber ?? undefined,
    subtotal: item.subtotal ?? 0,
    discountTotal: item.discountTotal ?? 0,
    taxTotal: item.taxTotal ?? 0,
    downPaymentAmount: item.downPaymentAmount ?? 0,
    shippingCost: item.shippingCost ?? 0,
    grandTotal: item.grandTotal ?? 0,
    paidAmount: item.paidAmount ?? 0,
    remainingAmount: item.remainingAmount ?? item.grandTotal ?? 0,
    status: normalizeSalesStatus("sales-invoice", item.status),
    notes: item.notes ?? "",
  };
}

export function mapSalesInvoiceDetailItem(item: SalesInvoiceDetailApi): SalesInvoiceDetailItem {
  return {
    id: item.id,
    salesInvoiceId: item.salesInvoiceId,
    productId: item.productId,
    productCode: item.productCode ?? "",
    productName: item.productName ?? item.description ?? "",
    description: item.description ?? item.productName ?? "",
    quantity: item.quantity ?? 0,
    uomId: item.uomId ?? undefined,
    uomName: item.uomName ?? "",
    price: item.price ?? 0,
    discount: item.discountAmount ?? item.discount ?? 0,
    tax: item.taxAmount ?? item.tax ?? 0,
    subtotal: item.subtotal ?? 0,
  };
}

export function mapSalesInvoiceFullDetail(
  item: SalesInvoiceDetailResponseApi
): SalesInvoiceFullDetail {
  return {
    ...mapSalesInvoice(item.header),
    items: (item.detail ?? []).map(mapSalesInvoiceDetailItem),
  };
}

export const salesInvoiceService = {
  async getAll(): Promise<SalesInvoice[]> {
    const response = await api.get<ApiResponse<SalesInvoiceApi[]>>("/sales-invoice");
    return (response.data.data ?? []).map(mapSalesInvoice);
  },

  async getById(id: number | string): Promise<SalesInvoice> {
    const response = await api.get<ApiResponse<SalesInvoiceApi>>(`/sales-invoice/${id}`);
    const data = response.data.data as SalesInvoiceApi | SalesInvoiceDetailResponseApi;
    if ("header" in data) return mapSalesInvoice(data.header);
    return mapSalesInvoice(data);
  },

  async getFullDetailById(id: number | string): Promise<SalesInvoiceFullDetail> {
    const response = await api.get<ApiResponse<SalesInvoiceDetailResponseApi>>(`/sales-invoice/${id}`);
    return mapSalesInvoiceFullDetail(response.data.data);
  },

  async create(payload: SalesInvoicePayload): Promise<SalesInvoice> {
    const response = await api.post<ApiResponse<SalesInvoiceApi>>("/sales-invoice", payload);
    return mapSalesInvoice(response.data.data);
  },

  async update(id: number | string, payload: SalesInvoicePayload): Promise<void> {
    await api.put(`/sales-invoice/${id}`, payload);
  },

  async remove(id: number | string): Promise<void> {
    await api.delete(`/sales-invoice/${id}`);
  },

  async confirm(id: number | string): Promise<void> {
    await api.patch(`/sales-invoice/${id}/confirm`);
  },
};
