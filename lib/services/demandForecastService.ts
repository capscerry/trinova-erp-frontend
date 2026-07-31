import { api } from "@/lib/api";

const BASE_URL = "/DemandForecast";

export async function getDemandForecast() {
  const response = await api.get(BASE_URL);
  const result = response.data;

  return result.data ?? result;
}

export async function getRealtimeForecast() {
  const response = await api.get(BASE_URL);
  const result = response.data;
  return result.data ?? result;
}

export async function generateMonthlyForecast() {
  const response = await api.post(`${BASE_URL}/generate`);
  const result = response.data;
  return result.data ?? result;
}

export async function getLatestMonthlyForecast() {
  const response = await api.get(`${BASE_URL}/latest`);
  const result = response.data;
  return result.data ?? result;
}

export async function downloadForecast() {
  const response = await api.get(`${BASE_URL}/download`, {
    responseType: "blob",
  });
  return response.data;
}
