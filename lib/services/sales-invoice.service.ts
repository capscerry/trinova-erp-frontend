import { api, type ApiResponse } from "@/lib/api";

export type SalesInvoiceStatus =
  | "Draft"
  | "Belum Dibayar"
  | "Dibayar Sebagian"
  | "Lunas"
  | "Dibatalkan";

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
  }[];
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
    status: item.status ?? "Draft",
    notes: item.notes ?? "",
  };
}

export const salesInvoiceService = {
  async getAll(): Promise<SalesInvoice[]> {
    const response = await api.get<ApiResponse<SalesInvoiceApi[]>>("/sales-invoice");
    return (response.data.data ?? []).map(mapSalesInvoice);
  },

  async getById(id: number | string): Promise<SalesInvoice> {
    const response = await api.get<ApiResponse<SalesInvoiceApi>>(`/sales-invoice/${id}`);
    return mapSalesInvoice(response.data.data);
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
