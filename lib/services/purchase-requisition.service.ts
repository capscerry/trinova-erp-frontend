import { api } from "@/lib/api";

export interface PurchaseRequisition {
  pr_id: number;
  pr_number: string;
  pr_date: string;
  warehouse_id: number;
  status: string;
  remarks?: string;

  warehouse?: {
    warehouse_id: number;
    warehouse_name: string;
  };
}

export interface PurchaseRequisitionDetail {
  product_id: number;
  qty_requested: number;
  remarks?: string;
}

export interface CreatePurchaseRequisitionRequest {
  pr_date: string;
  warehouse_id: number;
  remarks?: string;

  details: PurchaseRequisitionDetail[];
}

export async function getPurchaseRequisitions() {
  const response = await api.get<PurchaseRequisition[]>(
    "/PurchaseRequisition"
  );

  return response.data;
}

export async function getPurchaseRequisitionById(
  id: number
) {
  const response = await api.get<PurchaseRequisition>(
    `/PurchaseRequisition/${id}`
  );

  return response.data;
}

export async function createPurchaseRequisition(
  payload: CreatePurchaseRequisitionRequest
) {
  const response = await api.post(
    "/PurchaseRequisition",
    payload
  );

  return response.data;
}

export async function updatePurchaseRequisition(
  id: number,
  payload: PurchaseRequisition
) {
  const response = await api.put(
    `/PurchaseRequisition/${id}`,
    payload
  );

  return response.data;
}

export async function deletePurchaseRequisition(
  id: number
) {
  const response = await api.delete(
    `/PurchaseRequisition/${id}`
  );

  return response.data;
}