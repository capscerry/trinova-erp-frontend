const BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL}/product-subcategories`;

export interface ProductSubcategory {
  subcategory_id: number;

  category_id: number;

  category?: {
    category_id: number;
    category_name: string;
  };

  code: string;

  name: string;

  is_active?: boolean;

  created_at?: string;

  updated_at?: string;
}

// ─── Get Subcategories ───────────────────────────────────────────────
export async function getSubcategories() {
  const response =
    await fetch(BASE_URL);

  if (!response.ok) {
    throw new Error(
      "Failed to fetch subcategories"
    );
  }

  return response.json();
}

// ─── Get Subcategories By Category ──────────────────────────────────
export async function getSubcategoriesByCategory(
  categoryId: number
) {
  const response =
    await fetch(
      `${BASE_URL}/by-category/${categoryId}`
    );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch subcategories"
    );
  }

  return response.json();
}

// ─── Create Subcategory ─────────────────────────────────────────────
export async function createSubcategory(
  data: any
) {
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

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.message
    );
  }

  return result;
}

// ─── Update Subcategory ─────────────────────────────────────────────
export async function updateSubcategory(
  id: number,
  data: any
) {
  const response = await fetch(
    `${BASE_URL}/${id}`,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.message
    );
  }

  return result;
}

// ─── Delete Subcategory ─────────────────────────────────────────────
export async function deleteSubcategory(
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