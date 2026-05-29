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