import { api } from "@/lib/api";

export interface ForecastProduct {
  productId: number;
  productName: string;
  forecast: number;
}

export interface InventoryAiSummary {
  forecastMonth: string;
  generatedAt: string;
  forecastedProducts: number;
  averageForecast: number;
  needRestock: number;

  highestDemand: ForecastProduct;
  lowestDemand: ForecastProduct;
  topForecastProducts: ForecastProduct[];

}

export interface InventoryDashboard {
  totalProducts: number;
  safeStock: number;
  criticalStock: number;
  totalStock: number;

  aiSummary: InventoryAiSummary;
}

export async function getInventoryDashboard() {
  const response = await api.get("/InventoryDashboard");
  return response.data as InventoryDashboard;
}