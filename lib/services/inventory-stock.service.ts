const BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL}/InventoryStock`;

export async function getInventoryStocks() {
  const response =
    await fetch(BASE_URL);

  if (!response.ok) {
    throw new Error(
      "Failed to fetch inventory stocks"
    );
  }

  return await response.json();
}