import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL;

export async function getStockTransactions() {
  const response = await axios.get(
    `${API_URL}/StockTransaction`
  );

  return response.data;
}