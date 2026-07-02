import { api } from "@/lib/api";

const BASE_URL = "/OrderFulfillment";

export async function getOrderFulfillments() {
  const response = await api.get(BASE_URL);
  return response.data;
}

export async function createOrderFulfillment(
  payload: {
    product_id: number;
    warehouse_id: number;
    quantity: number;
    notes?: string;
  }
) {
  const response = await api.post(BASE_URL, payload);
  return response.data;
}
