import { api, type ApiResponse } from "@/lib/api";

export interface SalesDashboardOrderItem {
  id: number;
  number: string;
  customerName: string;
  date?: string | null;
  total: number;
  status: string;
}

export interface SalesDashboardInvoiceItem {
  id: number;
  number: string;
  customerName: string;
  date?: string | null;
  grandTotal: number;
  remainingAmount: number;
  status: string;
}

export interface SalesDashboard {
  totalSalesOrder: number;
  salesOrderCount: number;
  totalInvoice: number;
  invoiceCount: number;
  outstandingInvoice: number;
  totalReceipt: number;
  receiptCount: number;
  deliveryCount: number;
  customerCount: number;
  recentSalesOrders: SalesDashboardOrderItem[];
  recentInvoices: SalesDashboardInvoiceItem[];
}

export const EMPTY_SALES_DASHBOARD: SalesDashboard = {
  totalSalesOrder: 0,
  salesOrderCount: 0,
  totalInvoice: 0,
  invoiceCount: 0,
  outstandingInvoice: 0,
  totalReceipt: 0,
  receiptCount: 0,
  deliveryCount: 0,
  customerCount: 0,
  recentSalesOrders: [],
  recentInvoices: [],
};

export const salesDashboardService = {
  async getDashboard(): Promise<SalesDashboard> {
    const response = await api.get<ApiResponse<SalesDashboard>>("/sales-dashboard");
    return response.data.data ?? EMPTY_SALES_DASHBOARD;
  },
};
