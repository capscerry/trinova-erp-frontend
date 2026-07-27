"use client";

import {
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

import {
  getCategories,
  Category,
} from "@/lib/services/category.service";

import {
  getSubcategories,
  ProductSubcategory,
} from "@/lib/services/subcategory.service";

export interface SubcategoryFormData {
  category_id: number;
  code: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;

  onSubmit: (
    data: SubcategoryFormData
  ) => Promise<void>;

  loading?: boolean;

  initialData?: SubcategoryFormData | null;
}

export default function SubcategoryFormModal({
  open,
  onClose,
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
    if (open) {
      fetchCategories();
    }
  }, [open]);

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

  async function generateNextCode(
    categoryId: number
  ) {
    try {
      const subcategories =
        await getSubcategories();

      const validCodes =
        subcategories
          .filter((s: ProductSubcategory) =>
              s.category_id === categoryId
          )
          .map((s: ProductSubcategory) =>
              Number(s.code)
          )
          .filter((code: number) =>
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-linear-to-r from-navy-900 to-navy-600">

            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit
                  ? "Edit Subcategory"
                  : "Tambah Subcategory"}
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                {isEdit
                  ? "Perbarui data subkategori produk"
                  : "Tambahkan data subkategori produk"}
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

          <form onSubmit={handleSubmit}>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <Section title="Subcategory Information">

              <div className="grid grid-cols-2 gap-4">

                <FormField
                  label="Category"
                  required
                >
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      const categoryId = Number(
                        e.target.value
                      );

                      setFormData((prev) => ({
                        ...prev,
                        category_id: categoryId,
                      }));

                      generateNextCode(categoryId);
                    }}
                    className={inputBase}
                    required
                  >
                    <option value="">
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

                <FormField label="Code">
                  <input
                    value={
                      isEdit
                        ? formData.code
                        : `Auto Generated (${formData.code})`
                    }
                    disabled
                    className={`${inputBase} bg-slate-100 cursor-not-allowed`}
                  />
                </FormField>

              </div>

              <div className="mt-4">

                <FormField
                  label="Subcategory Name"
                  required
                >
                  <input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Input subcategory name..."
                    className={inputBase}
                    required
                  />
                </FormField>

              </div>

            </Section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">

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
                : isEdit
                ? "Update Subcategory"
                : "Save Subcategory"}
            </Button>

        </div>

        </form>

        </div>
        </div>
        </>
        );
        }
        
        const inputBase =
        "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-all";

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