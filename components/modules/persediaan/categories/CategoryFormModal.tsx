"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, FolderTree } from "lucide-react";

export interface CategoryFormData {
  category_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;

  onSubmit: (
    data: CategoryFormData
  ) => Promise<void>;

  loading?: boolean;

  initialData?: {
    category_name: string;
  } | null;
}

export default function CategoryFormModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData = null,
}: Props) {
  const [categoryName, setCategoryName] = useState("");

  const isEdit = initialData !== null;

  useEffect(() => {
    if (open) {
      setCategoryName(initialData?.category_name ?? "");
    }
  }, [open, initialData]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    await onSubmit({
      category_name: categoryName,
    });
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
                  ? "Edit Category"
                  : "Tambah Category"}
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                {isEdit
                  ? "Perbarui data kategori produk"
                  : "Tambahkan data kategori produk"}
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

            <Section title="Category Information">

            <FormField
                label="Category Name"
                icon={<FolderTree size={13} />}
                required
            >
                <input
                type="text"
                value={categoryName}
                onChange={(e) =>
                    setCategoryName(e.target.value)
                }
                placeholder="Input category name..."
                className={inputBase}
                required
                />
            </FormField>

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
                ? "Update Category"
                : "Save Category"}
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