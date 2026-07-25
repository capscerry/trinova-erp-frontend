import { api } from "../api";

// GET ALL GR
export const getGoodsReceipts = async () => {
  const res = await api.get("/goods-receipt");
  return res.data;
};

// GET GRs AVAILABLE FOR PURCHASE RETURN
// Only returns GRs that have at least one detail line with remaining_qty > 0.
// Use this instead of getGoodsReceipts when loading the GR picker in the
// Purchase Return creation form.
export const getGoodsReceiptsForReturn = async () => {
  const res = await api.get("/goods-receipt/for-purchase-return");
  return res.data;
};

// GET AVAILABLE RETURN DETAILS FOR A SPECIFIC GR
// Returns only detail lines where remaining_qty > 0, with product_name,
// quantity (original received), and remaining_qty (max returnable).
// Shape per item: { goods_receipt_detail_id, goods_receipt_id, product_id,
//                   quantity, remaining_qty, product_name }
export const getAvailableReturnDetails = async (grId: number) => {
  const res = await api.get(`/purchase-return/gr/${grId}/available-details`);
  return res.data;
};

// GET NEXT GR NUMBER
export const getNextGRNumber = async () => {
  const res = await api.get("/goods-receipt/next-number");
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

// UPDATE GR
export const updateGoodsReceipt = async (
  id: number,
  payload: Partial<{
    status: string;
    received_by: string;
    receipt_date: string;
    transaction_name: string;
    transaction_detail: string;
  }>
) => {
  const res = await api.put(`/goods-receipt/${id}`, payload);
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