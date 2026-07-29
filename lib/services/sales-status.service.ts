import { api } from "@/lib/api";
import type { SalesStatusModule } from "@/lib/sales-status";

export interface UpdateSalesStatusPayload {
  status: string;
  note?: string;
  updatedBy?: string;
}

export const salesStatusService = {
  async update(
    module: SalesStatusModule,
    id: number | string,
    payload: UpdateSalesStatusPayload
  ): Promise<void> {
    await api.patch(`/api/sales-status/${module}/${id}`, payload);
  },
};
