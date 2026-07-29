"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

import { getCategories, Category, } from "@/lib/services/category.service";

import { getSubcategoriesByCategory, ProductSubcategory } from "@/lib/services/subcategory.service";

import { getUoms, Uom,} from "@/lib/services/uom.service";

import { toast } from "sonner";

import { Loader2 } from "lucide-react";

export interface ProductFormData {
  product_name: string;

  category_id: number;
  subcategory_id: number;
  uom_id: number;
}

interface Product {
    product_id:number;

    product_name:string;

    category_id:number;

    subcategory_id:number;

    uom_id:number;
}

interface Props {
  onSubmit: (
    data: ProductFormData
  ) => Promise<void>;

  loading?: boolean;

  initialData?: Product;
}

export default function ProductForm({
  onSubmit,
  loading = false,
  initialData,
}: Props) {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [subcategories, setSubcategories] =
    useState<ProductSubcategory[]>([]);

  const [uoms, setUoms] =
    useState<Uom[]>([]);

    useEffect(() => {
      void fetchInitialData();
    }, []);

  const [formData, setFormData] =
    useState<ProductFormData>({
      product_name: "",

      category_id: 0,
      subcategory_id: 0,
      uom_id: 0,
    });

  const [loadingSubcategories, setLoadingSubcategories] =
  useState(false);

  useEffect(() => {
    if (!initialData) return;

    setFormData({
      product_name:
        initialData.product_name,

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

  async function loadSubcategories(categoryId: number) {
    try {
      setLoadingSubcategories(true);

      const data =
        await getSubcategoriesByCategory(categoryId);

      setSubcategories(data);

    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to load subcategories."
      );

    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function fetchInitialData() {
    try {
      const [categoryData, uomData] =
        await Promise.all([
          getCategories(),
          getUoms(),
        ]);

      console.log("Category:", categoryData);
      console.log("UOM:", uomData);

      setCategories(categoryData);
      setUoms(uomData);

      console.log("Category Data:", categoryData);

    } catch (error) {
      console.error(error);
    }
  }

  async function handleCategoryChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const categoryId = Number(e.target.value);

    setFormData((prev) => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: 0,
    }));

    setSubcategories([]);

    await loadSubcategories(categoryId);
  }

  function handleSubcategoryChange(
      e: React.ChangeEvent<HTMLSelectElement>
  ) {
      setFormData(prev => ({
          ...prev,
          subcategory_id: Number(e.target.value),
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

    if(

    !formData.product_name.trim()

    ||

    formData.category_id===0

    ||

    formData.subcategory_id===0

    ||

    formData.uom_id===0

    ) {
      toast.error(
        "Please complete all required fields."
      );

      console.log("State Categories:", categories);

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
          Product Name <span className="text-red-500 font-bold">*</span>
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

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Category <span className="text-red-500 font-bold">*</span>
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
          Subcategory <span className="text-red-500 font-bold">*</span>
        </label>

        <select
          disabled={
              formData.category_id === 0 ||
              loadingSubcategories
          }
          
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
            {formData.category_id === 0
              ? "Select Category First"
              : loadingSubcategories
                ? "Loading subcategories..."
                : "Select Subcategory"}
          </option>

          {subcategories.map(
            (subcategory) => (
              <option
                  key={subcategory.subcategory_id}
                  value={subcategory.subcategory_id}
              >
                  {subcategory.name}
              </option>
            )
          )}
        </select>

        {loadingSubcategories && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subcategories...
          </div>
        )}
      </div>



      {/* UOM */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          UOM <span className="text-red-500 font-bold">*</span>
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