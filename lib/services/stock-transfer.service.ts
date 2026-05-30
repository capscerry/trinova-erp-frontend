import { api } from "@/lib/api";

export async function getTransfers() {
  const response = await api.get(
    "/StockTransfer"
  );

  return response.data;
}

export async function transferStock(
  payload: any
) {
  const response = await api.post(
    "/StockTransfer",
    payload
  );

  return response.data;
}