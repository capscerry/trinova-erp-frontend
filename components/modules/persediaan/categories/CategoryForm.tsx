"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export interface CategoryFormData {
  category_name: string;
}

interface Props {
  onSubmit: (
    data: CategoryFormData
  ) => Promise<void>;

  loading?: boolean;

  initialData?: {
    category_name: string;
  } | null;
}

export default function CategoryForm({
  onSubmit,
  loading = false,
  initialData = null,
}: Props) {
  const [categoryName, setCategoryName] =
    useState("");

  const isEdit =
    initialData !== null;

  useEffect(() => {
    if (initialData) {
      setCategoryName(
        initialData.category_name
      );
    }
  }, [initialData]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    await onSubmit({
      category_name: categoryName,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Category Name <span className="text-red-500 font-bold">*</span>
        </label>

        <input
          type="text"
          value={categoryName}
          onChange={(e) =>
            setCategoryName(
              e.target.value
            )
          }
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Input category name"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : isEdit
            ? "Update"
            : "Save"}
        </Button>
      </div>
    </form>
  );
}