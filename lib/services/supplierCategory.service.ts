import { api } from "../api";

export const getSupplierCategory =
  async () => {

    const res =
      await api.get(
        "/supplier-category"
      );

    return res.data;
  };

export const createSupplierCategory =
  async (payload: any) => {

    const res =
      await api.post(
        "/supplier-category",
        payload
      );

    return res.data;
  };

export const updateSupplierCategory =
  async (
    id: string,
    payload: any
  ) => {

    const res =
      await api.put(
        `/supplier-category/${id}`,
        payload
      );

    return res.data;
  };

export const deleteSupplierCategory =
  async (id: string) => {

    const res =
      await api.delete(
        `/supplier-category/${id}`
      );

    return res.data;
  };