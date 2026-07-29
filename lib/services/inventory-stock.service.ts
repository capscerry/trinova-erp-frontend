import { api } from "@/lib/api";

const BASE_URL = "/InventoryStock";

export interface InventoryStockPayload {
  product_id: number;
  warehouse_id: number;
  qty_on_hand: number;
  qty_reserved: number;
}

export async function getInventoryStocks() {
  const response = await api.get(BASE_URL);
  return response.data;
}

export const getInventoryStock = getInventoryStocks;

export async function createInventoryStock(payload: InventoryStockPayload) {
  const response = await api.post(BASE_URL, payload);
  return response.data;
}

export async function updateInventoryStock(id: number, payload: InventoryStockPayload) {
  const response = await api.put(`${BASE_URL}/${id}`, payload);
  return response.data;
}

export async function deleteInventoryStock(id: number) {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
}
