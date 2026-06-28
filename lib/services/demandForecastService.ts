const BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL}/DemandForecast`;

export async function getDemandForecast() {
  console.log("Calling:", BASE_URL);

  const response = await fetch(BASE_URL);

  console.log("Status:", response.status);

  const result = await response.json();

  console.log(result);

  if (!response.ok) {
    throw new Error(
      result.message ?? "Failed to fetch demand forecast"
    );
  }

  return result.data ?? result;
}