import { api } from "@/lib/api";

const BASE_URL = "/api/DemandForecast";

export async function getDemandForecast() {
  const response = await api.get(BASE_URL);
  const result = response.data;

  return result.data ?? result;
}
