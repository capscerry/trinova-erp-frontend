const BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL}/DemandForecast`;

// ─── Get Demand Forecast ─────────────────────────────
export async function getDemandForecast() {
  const response =
    await fetch(BASE_URL);

  if (!response.ok) {
    throw new Error(
      "Failed to fetch demand forecast"
    );
  }

  const result =
    await response.json();

  return result.data ?? result;
}