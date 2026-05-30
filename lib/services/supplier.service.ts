import { api } from "../api";

export const getSuppliers = async () => {
  const res = await api.get("/supplier");
  return res.data;
};

export const createSupplier = async (
  payload: any
) => {
  const res = await api.post(
    "/supplier",
    payload
  );

  return res.data;
};

export const updateSupplier = async (
  id: string,
  payload: any
) => {
  const res = await api.put(
    `/supplier/${id}`,
    payload
  );

  return res.data;
};

export const deleteSupplier = async (
  id: string
) => {
  const res = await api.delete(
    `/supplier/${id}`
  );

  return res.data;
};