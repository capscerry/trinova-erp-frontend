import { api } from "../api";

export const getSupplierCategory = async () => {
  const res = await api.get("/supplier-category");
  return res.data;
};

export const getNextSupplierCategoryCode = async (): Promise<string> => {
  const res = await api.get("/supplier-category/next-code");
  return res.data?.category_code ?? "";
};

export const migrateSupplierCategoryCodes = async (): Promise<void> => {
  await api.post("/supplier-category/migrate-codes");
};

export const createSupplierCategory = async (payload: any) => {
  const res = await api.post("/supplier-category", payload);
  return res.data;
};

export const updateSupplierCategory = async (id: string, payload: any) => {
  const res = await api.put(`/supplier-category/${id}`, payload);
  return res.data;
};

export const deleteSupplierCategory = async (id: string) => {
  const res = await api.delete(`/supplier-category/${id}`);
  return res.data;
};
