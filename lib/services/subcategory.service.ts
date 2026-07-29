import { api } from "@/lib/api";

const BASE_URL = "/api/product-subcategories";

export interface ProductSubcategory {
  subcategory_id: number;

  category_id: number;

  category?: {
    category_id: number;
    category_name: string;
  };

  code: string;

  name: string;

  is_active?: boolean;

  created_at?: string;

  updated_at?: string;
}

// ─── Get Subcategories ───────────────────────────────────────────────
export async function getSubcategories() {
  const response = await api.get(BASE_URL);
  return response.data;
}

// ─── Get Subcategories By Category ──────────────────────────────────
export async function getSubcategoriesByCategory(categoryId: number) {
  const response = await api.get(
    `${BASE_URL}/by-category/${categoryId}`
  );

  console.log(response.data);

  return response.data;
}

// ─── Create Subcategory ─────────────────────────────────────────────
export async function createSubcategory(
  data: any
) {
  const response = await api.post(BASE_URL, data);
  return response.data;
}

// ─── Update Subcategory ─────────────────────────────────────────────
export async function updateSubcategory(
  id: number,
  data: any
) {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
}

// ─── Delete Subcategory ─────────────────────────────────────────────
export async function deleteSubcategory(
  id: number
) {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
}
