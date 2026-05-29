const BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL}/master-product`;

// ─── Get Products ───────────────────────────────────────────────
export async function getProducts() {
  const response =
    await fetch(BASE_URL);

  if (!response.ok) {
    throw new Error(
      "Failed to fetch products"
    );
  }

  const result =
    await response.json();

  return result.data;
}

// ─── Create Product ────────────────────────────────────────────
export async function createProduct(
  data: any
) {
  console.log(
    "PAYLOAD",
    JSON.stringify(data, null, 2)
  );

  const response = await fetch(
    BASE_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const responseBody =
    await response.text();

  console.log(
    "STATUS:",
    response.status
  );

  console.log(
    "RESPONSE:",
    responseBody
  );

  if (!response.ok) {
    throw new Error(
      "Failed to create product"
    );
  }

  return JSON.parse(responseBody);
}

// ─── Update Product ────────────────────────────────────────────
export async function updateProduct(
  data: any
) {
  const response = await fetch(
    BASE_URL,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to update product"
    );
  }

  return response.json();
}

// ─── Delete Product ────────────────────────────────────────────
export async function deleteProduct(
  id: number
) {
  const response = await fetch(
    `${BASE_URL}/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Delete failed: ${response.status}`
    );
  }

  return response.json();
}