import { api, type ApiResponse } from "@/lib/api";

export interface SecurityActivityItem {
  id: number;
  module: string;
  activityType: "login_failed" | "unauthorized_access" | "authentication_required" | string;
  title: string;
  description?: string | null;
  refTable?: string | null;
  refId?: number | null;
  refNumber?: string | null;
  userId: number;
  userName: string;
  ipAddress?: string | null;
  createdAt: string;
}

export const securityActivityService = {
  async getAlerts(take = 12): Promise<SecurityActivityItem[]> {
    const response = await api.get<ApiResponse<SecurityActivityItem[]>>("/security-activity", {
      params: { take },
    });

    return response.data.data ?? [];
  },
};