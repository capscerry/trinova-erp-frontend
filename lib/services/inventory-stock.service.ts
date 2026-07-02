import { api } from "@/lib/api";

const BASE_URL = "/InventoryStock";

export async function getInventoryStocks() {
  const response = await api.get(BASE_URL);
  return response.data;
}
