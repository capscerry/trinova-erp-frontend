import { api } from "@/lib/api";

export async function getStockTransactions() {
  const response = await api.get("/api/StockTransaction");
  return response.data;
}
