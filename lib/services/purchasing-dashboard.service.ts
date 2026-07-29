import { api, type ApiResponse } from "@/lib/api";

export interface PurchasingDashboardActivityItem {
  id: number;
  module: string;
  activityType: string;
  title: string;
  description?: string | null;
  refTable?: string | null;
  refId?: number | null;
  refNumber?: string | null;
  userName?: string | null;
  createdAt: string;
}

export interface PurchasingDashboardUpcomingActivityItem {
  activityType: string;
  title: string;
  description?: string | null;
  refTable?: string | null;
  refId?: number | null;
  refNumber?: string | null;
  activityDate: string;
  priority: "danger" | "warning" | "normal" | string;
}

export interface PurchasingDashboard {
  totalSupplier: number;
  totalPurchaseOrder: number;
  totalGoodsReceipt: number;
  totalPurchaseAmount: number;
  recentActivities: PurchasingDashboardActivityItem[];
  upcomingActivities: PurchasingDashboardUpcomingActivityItem[];
}

export const EMPTY_PURCHASING_DASHBOARD: PurchasingDashboard = {
  totalSupplier: 0,
  totalPurchaseOrder: 0,
  totalGoodsReceipt: 0,
  totalPurchaseAmount: 0,
  recentActivities: [],
  upcomingActivities: [],
};

const pick = <T>(source: any, camel: string, snake: string, fallback: T): T =>
  (source?.[camel] ?? source?.[snake] ?? fallback) as T;

const mapActivity = (item: any): PurchasingDashboardActivityItem => ({
  id: Number(pick(item, "id", "id", 0)),
  module: String(pick(item, "module", "module", "purchasing")),
  activityType: String(pick(item, "activityType", "activity_type", "")),
  title: String(pick(item, "title", "title", "")),
  description: pick(item, "description", "description", null),
  refTable: pick(item, "refTable", "ref_table", null),
  refId: pick(item, "refId", "ref_id", null),
  refNumber: pick(item, "refNumber", "ref_number", null),
  userName: pick(item, "userName", "user_name", null),
  createdAt: String(pick(item, "createdAt", "created_at", "")),
});

const mapUpcoming = (item: any): PurchasingDashboardUpcomingActivityItem => ({
  activityType: String(pick(item, "activityType", "activity_type", "")),
  title: String(pick(item, "title", "title", "")),
  description: pick(item, "description", "description", null),
  refTable: pick(item, "refTable", "ref_table", null),
  refId: pick(item, "refId", "ref_id", null),
  refNumber: pick(item, "refNumber", "ref_number", null),
  activityDate: String(pick(item, "activityDate", "activity_date", "")),
  priority: String(pick(item, "priority", "priority", "normal")),
});

export const purchasingDashboardService = {
  async getDashboard(): Promise<PurchasingDashboard> {
    const response = await api.get<ApiResponse<any>>("/api/purchasing/dashboard");
    const data = response.data.data ?? {};

    return {
      totalSupplier: Number(pick(data, "totalSupplier", "total_supplier", 0)),
      totalPurchaseOrder: Number(pick(data, "totalPurchaseOrder", "total_purchase_order", 0)),
      totalGoodsReceipt: Number(pick(data, "totalGoodsReceipt", "total_goods_receipt", 0)),
      totalPurchaseAmount: Number(pick(data, "totalPurchaseAmount", "total_purchase_amount", 0)),
      recentActivities: (pick<any[]>(data, "recentActivities", "recent_activities", []) ?? []).map(mapActivity),
      upcomingActivities: (pick<any[]>(data, "upcomingActivities", "upcoming_activities", []) ?? []).map(mapUpcoming),
    };
  },
};