const BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL}/OrderFulfillment`;

export async function getOrderFulfillments() {
  const response =
    await fetch(BASE_URL);

  if (!response.ok) {
    throw new Error(
      "Failed to fetch order fulfillment"
    );
  }

  return response.json();
}

export async function createOrderFulfillment(
  payload: {
    product_id: number;
    warehouse_id: number;
    quantity: number;
    notes?: string;
  }
) {
  const response =
    await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    });

  if (!response.ok) {
    throw new Error(
      "Failed to create order fulfillment"
    );
  }

  return response.json();
}