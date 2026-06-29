import { api } from "../api";

export const getInventoryStock = async () => {
  const res = await api.get("/InventoryStock");
  return res.data;
};

export const createInventoryStock = async (payload: {
  product_id: number;
  warehouse_id: number;
  qty_on_hand: number;
  qty_reserved: number;
}) => {
  const res = await api.post("/InventoryStock", payload);
  return res.data;
};

export const updateInventoryStock = async (
  id: number,
  payload: {
    product_id: number;
    warehouse_id: number;
    qty_on_hand: number;
    qty_reserved: number;
  }
) => {
  const res = await api.put(`/InventoryStock/${id}`, payload);
  return res.data;
};

export const deleteInventoryStock = async (id: number) => {
  const res = await api.delete(`/InventoryStock/${id}`);
  return res.data;
};
