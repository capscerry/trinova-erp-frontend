"use client";

import {
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";

import {
  getCategories,
  Category,
} from "@/lib/services/category.service";

import {
  getSubcategories,
} from "@/lib/services/subcategory.service";

export interface SubcategoryFormData {
  category_id: number;
  code: string;
  name: string;
}

interface Props {
  onSubmit: (
    data: SubcategoryFormData
  ) => Promise<void>;

  loading?: boolean;

  initialData?: {
    category_id: number;
    code: string;
    name: string;
  } | null;
}

export default function SubcategoryForm({
  onSubmit,
  loading = false,
  initialData = null,
}: Props) {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [formData, setFormData] =
    useState<SubcategoryFormData>({
      category_id: 0,
      code: "01",
      name: "",
    });

  const isEdit =
    initialData !== null;

  useEffect(() => {
    fetchCategories();

    // AUTO INCREMENT HANYA SAAT CREATE
    if (!isEdit) {
      generateNextCode();
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        category_id:
          initialData.category_id,
        code: initialData.code,
        name: initialData.name,
      });
    }
  }, [initialData]);

  async function fetchCategories() {
    try {
      const data =
        await getCategories();

      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function generateNextCode() {
    try {
      const subcategories =
        await getSubcategories();

      const validCodes =
        subcategories
          .map((s: any) =>
            Number(s.code)
          )
          .filter(
            (code: number) =>
              !isNaN(code) &&
              code >= 0 &&
              code <= 99
          );

      const maxCode = Math.max(
        ...validCodes,
        0
      );

      const nextCode = String(
        maxCode + 1
      ).padStart(2, "0");

      setFormData((prev) => ({
        ...prev,
        code: nextCode,
      }));
    } catch (error) {
      console.error(error);
    }
  }

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    onSubmit(formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Category
        </label>

        <select
          value={
            formData.category_id
          }
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              category_id:
                Number(
                  e.target.value
                ),
            }))
          }
          className="w-full rounded-lg border px-3 py-2"
          required
        >
          <option value="">
            Select Category
          </option>

          {categories.map(
            (category) => (
              <option
                key={
                  category.category_id
                }
                value={
                  category.category_id
                }
              >
                {
                  category.category_name
                }
              </option>
            )
          )}
        </select>
      </div>

      {/* Code */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Code
        </label>

        <input
          type="text"
          value={formData.code}
          readOnly
          className="w-full rounded-lg border bg-gray-100 px-3 py-2"
        />
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Name
        </label>

        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              name:
                e.target.value,
            }))
          }
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Input subcategory name"
          required
        />
      </div>

      {/* Submit */}
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