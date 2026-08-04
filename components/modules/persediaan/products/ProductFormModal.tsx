"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

import { getCategories, Category, } from "@/lib/services/category.service";

import { getSubcategoriesByCategory, ProductSubcategory } from "@/lib/services/subcategory.service";

import { getUoms, Uom,} from "@/lib/services/uom.service";

import { toast } from "sonner";

import { Loader2, X } from "lucide-react";

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
  open: boolean;
  onClose: () => void;

  onSubmit: (
    data: ProductFormData
  ) => Promise<void>;

  loading?: boolean;

  initialData?: Product | null;
}

export default function ProductFormModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData,
}: Props) {

  const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-all";

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [subcategories, setSubcategories] =
    useState<ProductSubcategory[]>([]);

  const [uoms, setUoms] =
    useState<Uom[]>([]);

    useEffect(() => {
        if (open) {
            void fetchInitialData();
        }
    }, [open]);

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
    if (initialData) {
      setFormData({
        product_name: initialData.product_name,
        category_id: initialData.category_id,
        subcategory_id: initialData.subcategory_id,
        uom_id: initialData.uom_id,
      });

      void loadSubcategories(initialData.category_id);
    } else {
      setFormData({
        product_name: "",
        category_id: 0,
        subcategory_id: 0,
        uom_id: 0,
      });

      setSubcategories([]);
    }
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

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-linear-to-r from-navy-900 to-navy-600">

            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {initialData
                  ? "Edit Product"
                  : "Tambah Product"}
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                {initialData
                  ? "Perbarui data produk"
                  : "Tambahkan data produk"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit}>

            {/* Body */}
              <div className="px-6 pt-6 pb-6 space-y-6">

              <Section title="Product Information">

              {/* Product Name */}
              <FormField
                label="Product Name"
                required
              >
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  placeholder="Input product name..."
                  className={inputBase}
                  required
                />
              </FormField>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-4 mt-4">

                <FormField
                  label="Category"
                  required
                >
                  <select
                    value={formData.category_id}
                    onChange={handleCategoryChange}
                    className={inputBase}
                    required
                  >
                    <option value={0}>
                      Select Category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.category_id}
                        value={category.category_id}
                      >
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Subcategory"
                  required
                >
                  <select
                    disabled={
                      formData.category_id === 0 ||
                      loadingSubcategories
                    }
                    value={formData.subcategory_id}
                    onChange={handleSubcategoryChange}
                    className={inputBase}
                    required
                  >
                    <option value={0}>
                      {formData.category_id === 0
                        ? "Select Category First"
                        : loadingSubcategories
                        ? "Loading subcategories..."
                        : "Select Subcategory"}
                    </option>

                    {subcategories.map((subcategory) => (
                      <option
                        key={subcategory.subcategory_id}
                        value={subcategory.subcategory_id}
                      >
                        {subcategory.name}
                      </option>
                    ))}
                  </select>

                  {loadingSubcategories && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading subcategories...
                    </div>
                  )}
                </FormField>

              </div>

              {/* UOM */}
              <div className="mt-4">

                <FormField
                  label="UOM"
                  required
                >
                  <select
                    name="uom_id"
                    value={formData.uom_id}
                    onChange={handleInputChange}
                    className={inputBase}
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
                </FormField>

              </div>

            </Section>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">

              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : initialData
                    ? "Update Product"
                    : "Save Product"}
              </Button>

            </div>

          </form>

        </div>

      </div>

    </>
  );
}

// Hoisted to module scope (not nested inside ProductFormModal) so React
// keeps a stable component identity across re-renders -- when these were
// declared inside the modal function, every keystroke's setFormData() call
// created a brand-new FormField/Section function on each render, forcing
// React to unmount+remount the whole subtree (including the <input>) and
// drop keyboard focus after every single character.
function FormField({
      label,
      icon,
      required,
      children,
      }: {
      label: string;
      icon?: React.ReactNode;
      required?: boolean;
      children: React.ReactNode;
      }) {
      return (
          <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {icon && (
              <span className="text-slate-400">
                  {icon}
              </span>
              )}

              {label}

              {required && (
              <span className="text-red-500 font-bold">
                  *
              </span>
              )}
          </label>

          {children}
          </div>
      );
      }

      function Section({
      title,
      action,
      children,
      }: {
      title: string;
      action?: React.ReactNode;
      children: React.ReactNode;
      }) {
      return (
          <div className="space-y-3">

          <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {title}
              </h3>

              {action}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-5 shadow-sm">
              {children}
          </div>

          </div>
      );
    }