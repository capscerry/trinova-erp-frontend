import { api } from "@/lib/api";

export async function getTransfers() {
  const response = await api.get("/api/StockTransfer");
  return response.data;
}

export async function getTransferById(id: number) {
  const response = await api.get(`/api/StockTransfer/${id}`);
  return response.data;
}

export async function transferStock(payload: any) {
  const response = await api.post(
    "/api/StockTransfer",
    payload
  );

  return response.data;
}

export async function processTransfer(
  id: number
) {
  const response = await api.put(
    `/api/StockTransfer/${id}/process`
  );

  return response.data;
}

export async function completeTransfer(
  id: number
) {
  const response = await api.put(
    `/api/StockTransfer/${id}/complete`
  );

  return response.data;
}

export async function cancelTransfer(
  movementId: number
) {
  const response = await api.put(
    `/api/StockTransfer/${movementId}/cancel`
  );

  return response.data;
}
