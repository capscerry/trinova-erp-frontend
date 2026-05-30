"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

import {
  getCategories,
  Category,
} from "@/lib/services/category.service";

import {
  getSubcategoriesByCategory,
} from "@/lib/services/subcategory.service";

import {
  getUoms,
  Uom,
} from "@/lib/services/uom.service";

export interface ProductFormData {
  product_name: string;
  product_code: string;
  product_type: string;

  category_id: number;
  subcategory_id: number;
  uom_id: number;
}

interface Subcategory {
  subcategory_id: number;
  category_id: number;
  code: string;
  name: string;
}

interface Props {
  onSubmit: (
    data: ProductFormData
  ) => Promise<void>;

  existingCodes: string[];

  loading?: boolean;

  initialData?: any;
}

export default function ProductForm({
  onSubmit,
  existingCodes,
  loading = false,
  initialData,
}: Props) {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [subcategories, setSubcategories] =
    useState<Subcategory[]>([]);

  const [uoms, setUoms] =
    useState<Uom[]>([]);

    useEffect(() => {
      fetchInitialData();
    }, []);

  const [formData, setFormData] =
    useState<ProductFormData>({
      product_name: "",
      product_code: "",
      product_type: "Spare Part",

      category_id: 0,
      subcategory_id: 0,
      uom_id: 0,
    });

  useEffect(() => {
    if (!initialData) return;

    setFormData({
      product_name:
        initialData.product_name,

      product_code:
        initialData.product_code,

      product_type:
        initialData.product_type,

      category_id:
        initialData.category_id,

      subcategory_id:
        initialData.subcategory_id,

      uom_id:
        initialData.uom_id,
    });

    loadSubcategories(
      initialData.category_id
    );
  }, [initialData]);

  async function loadSubcategories(
    categoryId: number
  ) {
    try {
      const data =
        await getSubcategoriesByCategory(
          categoryId
        );

      setSubcategories(data);

    } catch (error) {
      console.error(error);
    }
  }

  async function fetchInitialData() {
    try {
      const [categoryData, uomData] =
        await Promise.all([
          getCategories(),
          getUoms(),
        ]);

      setCategories(categoryData);
      setUoms(uomData);

    } catch (error) {
      console.error(error);
    }
  }

  async function handleCategoryChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const categoryId = Number(
      e.target.value
    );

    setFormData((prev) => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: 0,
      product_code: "",
    }));

    try {
      await loadSubcategories(
        categoryId
      );

    } catch (error) {
      console.error(error);
    }
  }

  function generateProductCode(
    categoryId: number,
    subcategoryCode: string
  ) {
    const categoryPart = String(
      categoryId
    ).padStart(2, "0");

    const subcategoryPart =
      String(subcategoryCode).padStart(
        2,
        "0"
      );

    const runningNumber = String(
      existingCodes.length + 1
    ).padStart(6, "0");

    return `ITM-${categoryPart}${subcategoryPart}${runningNumber}`;
  }

  function handleSubcategoryChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const subcategoryId = Number(
      e.target.value
    );

    const selectedSubcategory =
      subcategories.find(
        (x) =>
          x.subcategory_id ===
          subcategoryId
      );

    const generatedCode =
      generateProductCode(
        formData.category_id,
        selectedSubcategory?.code ??
          "00"
      );

    setFormData((prev) => ({
      ...prev,
      subcategory_id:
        subcategoryId,
      product_code:
        generatedCode,
    }));
  }

  function handleInputChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } =
      e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name.includes("_id")
          ? Number(value)
          : value,
    }));
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    console.log(
      "FORM DATA:",
      JSON.stringify(formData, null, 2)
    );

    if (
      formData.category_id === 0 ||
      formData.subcategory_id === 0 ||
      formData.uom_id === 0
    ) {
      alert(
        "Category, Subcategory dan UOM wajib dipilih"
      );

      return;
    }
    
    await onSubmit(formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Product Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Product Name
        </label>

        <input
          type="text"
          name="product_name"
          value={
            formData.product_name
          }
          onChange={
            handleInputChange
          }
          className="w-full rounded-lg border px-3 py-2"
          required
        />
      </div>

      {/* Product Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Product Type
        </label>

        <select
          name="product_type"
          value={
            formData.product_type
          }
          onChange={
            handleInputChange
          }
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="Spare Part">
            Spare Part
          </option>

          <option value="Raw Material">
            Raw Material
          </option>

          <option value="Finished Goods">
            Finished Goods
          </option>

          <option value="Service">
            Service
          </option>
        </select>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Category
        </label>

        <select
          value={
            formData.category_id
          }
          onChange={
            handleCategoryChange
          }
          className="w-full rounded-lg border px-3 py-2"
          required
        >
          <option value={0}>
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

      {/* Subcategory */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Subcategory
        </label>

        <select
          value={
            formData.subcategory_id
          }
          onChange={
            handleSubcategoryChange
          }
          className="w-full rounded-lg border px-3 py-2"
          required
        >
          <option value={0}>
            Select Subcategory
          </option>

          {subcategories.map(
            (subcategory) => (
              <option
                key={
                  subcategory.subcategory_id
                }
                value={
                  subcategory.subcategory_id
                }
              >
                {subcategory.name}
              </option>
            )
          )}
        </select>
      </div>

      {/* UOM */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          UOM
        </label>

        <select
          name="uom_id"
          value={
            formData.uom_id
          }
          onChange={
            handleInputChange
          }
          className="w-full rounded-lg border px-3 py-2"
          required
        >
          <option value={0}>
            Select UOM
          </option>

          {uoms.map((uom) => (
            <option
              key={uom.uom_id}
              value={uom.uom_id}
            >
              {uom.uom_name}
            </option>
          ))}
        </select>
      </div>

      {/* Product Code */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Product Code
        </label>

        <input
          type="text"
          value={
            formData.product_code
          }
          readOnly
          className="w-full rounded-lg border bg-slate-100 px-3 py-2"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Save"}
        </Button>
      </div>
    </form>
  );
}