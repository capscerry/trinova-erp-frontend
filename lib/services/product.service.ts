import { api } from "@/lib/api";

const BASE_URL = "/api/master-product";

export async function getProducts() {
  const response = await api.get(BASE_URL);
  return response.data.data;
}

export async function createProduct(data: any) {
  const response = await api.post(BASE_URL, data);
  return response.data;
}

export async function updateProduct(data: any) {
  const response = await api.put(BASE_URL, data);
  return response.data;
}

export async function deleteProduct(id: number) {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
}
