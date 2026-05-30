import { api } from "@/lib/api";

export interface Category {
  category_id: number;
  category_name: string;
}

export async function getCategories() {
  const response = await api.get(
    "/master-product-category"
  );

  return response.data.data;
}

export async function createCategory(
  data: {
    category_name: string;
  }
) {
  const response = await api.post(
    "/master-product-category",
    data
  );

  return response.data;
}

export async function updateCategory(
  data: Category
) {
  const response = await api.put(
    "/master-product-category",
    data
  );

  return response.data;
}

export async function deleteCategory(
  id: number
) {
  const response = await api.delete(
    `/master-product-category/${id}`
  );

  return response.data;
}