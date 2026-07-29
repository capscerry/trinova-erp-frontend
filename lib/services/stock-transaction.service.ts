import { api } from "@/lib/api";

export async function getStockTransactions() {
  const response = await api.get("/StockTransaction");
  return response.data;
}
