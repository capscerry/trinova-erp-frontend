import { api } from "../api";

// GET ALL GR
export const getGoodsReceipts = async () => {

  const res = await api.get(
    "/goods-receipt"
  );

  return res.data;
};

// CREATE GR
export const createGoodsReceipt = async (
  payload: any
) => {

  const res = await api.post(
    "/goods-receipt",
    payload
  );

  return res.data;
};

// CREATE GR DETAIL
export const createGoodsReceiptDetail = async (
  payload: any
) => {

  const res = await api.post(
    "/goods-receipt-detail",
    payload
  );

  return res.data;
};