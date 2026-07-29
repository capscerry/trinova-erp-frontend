import { api } from "@/lib/api";

export interface Warehouse {
  warehouse_id: number;

  warehouse_name: string;

  description?: string;

  warehouse_address?: string;

  warehouse_type?: string;
}

export async function getWarehouses() {
  const response = await api.get(
    "/api/master-warehouse"
  );

  return response.data.data;
}

export async function createWarehouse(
  data: {
    warehouse_name: string;
    description?: string;
    warehouse_address?: string;
    warehouse_type?: string;
  }
) {
  const response = await api.post(
    "/api/master-warehouse",
    data
  );

  return response.data;
}

export async function updateWarehouse(
  data: Warehouse
) {
  const response = await api.put(
    "/api/master-warehouse",
    data
  );

  return response.data;
}

export async function deleteWarehouse(
  id: number
) {
  const response = await api.delete(
    `/api/master-warehouse/${id}`
  );

  return response.data;
}