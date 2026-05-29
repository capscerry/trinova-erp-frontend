import { api } from "../api";

export const getProducts = async () => {

  const res = await api.get(
    "/master-product"
  );

  return res.data;
};