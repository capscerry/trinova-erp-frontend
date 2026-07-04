import { api } from "@/lib/api";

export interface InventoryDashboard {
  totalProducts: number;
  safeStock: number;
  criticalStock: number;
  totalStock: number;
}

export async function getInventoryDashboard() {
  const response = await api.get("/InventoryDashboard");
  return response.data as InventoryDashboard;
}