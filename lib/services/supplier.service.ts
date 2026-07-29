import { api } from "../api";

export const getSuppliers = async () => {
  const res = await api.get("/api/supplier");
  return res.data;
};

export const migrateSupplierCodes = async (): Promise<void> => {
  await api.post("/api/supplier/migrate-codes");
};

export const getNextSupplierCode = async (): Promise<string> => {
  const res = await api.get("/api/supplier/next-code");
  return res.data?.supplier_code ?? "";
};

export const createSupplier = async (
  payload: any
) => {
  const res = await api.post(
    "/api/supplier",
    payload
  );

  return res.data;
};

export const updateSupplier = async (
  id: string,
  payload: any
) => {
  const res = await api.put(
    `/api/supplier/${id}`,
    payload
  );

  return res.data;
};

export const deleteSupplier = async (
  id: string
) => {
  const res = await api.delete(
    `/api/supplier/${id}`
  );

  return res.data;
};
