import { api } from "../api";

export const getNextSupplierCategoryCode = async (): Promise<string> => {
  const res = await api.get("/api/supplier-category/next-code");
  return res.data?.category_code ?? "";
};

export const migrateSupplierCategoryCodes = async (): Promise<void> => {
  await api.post("/api/supplier-category/migrate-codes");
};

export const getSupplierCategory = async () => {
  const res = await api.get("/api/supplier-category");
  return res.data;
};

export const createSupplierCategory = async (payload: any) => {
  const res = await api.post("/api/supplier-category", payload);
  return res.data;
};

export const updateSupplierCategory = async (id: string, payload: any) => {
  const res = await api.put(`/api/supplier-category/${id}`, payload);
  return res.data;
};

export const deleteSupplierCategory = async (id: string) => {
  const res = await api.delete(`/api/supplier-category/${id}`);
  return res.data;
};
