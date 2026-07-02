"use client";

import React, { useState } from "react";
import { X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { parseCatalogFile } from "@/lib/services/supplier-product.service";

interface SupplierFormModalProps {
  open: boolean;
  isEdit: boolean;
  formData: {
    supplier_code: string;
    supplier_name: string;
    no_telp_bisnis: string;
    email: string;
    alamat: string;
    category_supplier: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      supplier_code: string;
      supplier_name: string;
      no_telp_bisnis: string;
      email: string;
      alamat: string;
      category_supplier: string;
    }>
  >;
  categories: {
    category_supplier: string;
    nama_category: string;
  }[];
  onClose: () => void;
  onSave: () => void;
  setCatalogFile: React.Dispatch<React.SetStateAction<File | null>>;
  /** Errors injected from the parent after server-side / post-create validation */
  catalogErrors?: string[];
}

const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500 transition";

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SupplierFormModal({
  open,
  isEdit,
  formData,
  setFormData,
  categories,
  onClose,
  onSave,
  setCatalogFile,
  catalogErrors = [],
}: SupplierFormModalProps) {
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  /** Duplicate product_ids detected client-side while parsing the file */
  const [duplicateIds, setDuplicateIds] = useState<number[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  if (!open) return null;

  const allCatalogErrors = [
    ...(duplicateIds.length > 0
      ? [`Produk duplikat ditemukan (product_id): ${duplicateIds.join(", ")}`]
      : []),
    ...catalogErrors,
  ];
  const hasCatalogErrors = allCatalogErrors.length > 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setDuplicateIds([]);

    try {
      const rows = await parseCatalogFile(file);

      // ── Duplicate check ──────────────────────────────────────────────────────
      const seen = new Map<number, number>();
      for (const row of rows) {
        seen.set(row.product_id, (seen.get(row.product_id) ?? 0) + 1);
      }
      const dupes = [...seen.entries()]
        .filter(([, count]) => count > 1)
        .map(([id]) => id);

      setDuplicateIds(dupes);
      setCatalogFile(file);
      setSelectedFileName(file.name);
    } catch {
      setDuplicateIds([]);
      setCatalogFile(file);
      setSelectedFileName(file.name);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">

          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Supplier" : "Tambah Supplier"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit
                  ? "Perbarui data supplier"
                  : "Tambahkan supplier baru ke sistem"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

            {/* Section label */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Informasi Supplier
            </p>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Kode Supplier">
                <input
                  type="text"
                  placeholder="SUP-001"
                  value={formData.supplier_code}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_code: e.target.value })
                  }
                  className={inputBase}
                />
              </FormField>

              <FormField label="Nama Supplier">
                <input
                  type="text"
                  placeholder="PT Supplier Jaya"
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_name: e.target.value })
                  }
                  className={inputBase}
                />
              </FormField>

              <FormField label="Category Supplier">
                <select
                  value={formData.category_supplier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category_supplier: e.target.value,
                    })
                  }
                  className={inputBase}
                >
                  <option value="">Pilih Category</option>
                  {categories.map((item) => (
                    <option
                      key={item.category_supplier}
                      value={item.category_supplier}
                    >
                      {item.nama_category}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Telepon">
                <input
                  type="text"
                  placeholder="08123456789"
                  value={formData.no_telp_bisnis}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      no_telp_bisnis: e.target.value,
                    })
                  }
                  className={inputBase}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  placeholder="supplier@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={inputBase}
                />
              </FormField>
            </div>

            <FormField label="Alamat">
              <textarea
                placeholder="Alamat supplier"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData({ ...formData, alamat: e.target.value })
                }
                className={`${inputBase} h-24 resize-none`}
              />
            </FormField>

            {/* UPLOAD CATALOG — only on create */}
            {!isEdit && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Upload Supplier Catalog
                </p>

                <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label
                      htmlFor="catalog-upload"
                      className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 text-gold-400 px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition"
                    >
                      📤 Upload Catalog
                    </label>

                    <input
                      id="catalog-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {isParsing && (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 text-sm">
                        <Loader2 size={14} className="animate-spin" />
                        Memvalidasi file…
                      </span>
                    )}

                    {!isParsing && selectedFileName && !hasCatalogErrors && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg text-sm font-medium">
                        <CheckCircle2 size={14} />
                        {selectedFileName}
                      </span>
                    )}

                    {!isParsing && selectedFileName && hasCatalogErrors && (
                      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-medium">
                        <AlertCircle size={14} />
                        {selectedFileName}
                      </span>
                    )}
                  </div>

                  {/* Validation error panel */}
                  {hasCatalogErrors && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                      {allCatalogErrors.map((err, i) => (
                        <p key={i} className="text-xs text-red-700 flex gap-1.5 items-start">
                          <AlertCircle size={12} className="mt-0.5 shrink-0" />
                          {err}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="space-y-0.5 text-sm">
                    <p className="font-semibold text-slate-600 text-xs">Format Excel</p>
                    <p className="text-slate-500 text-xs">
                      product_id, supplier_price, available_, lead_time_days
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Lead time days = estimasi hari pengiriman barang
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              onClick={onSave}
              disabled={duplicateIds.length > 0 || isParsing}
              className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 hover:bg-navy-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEdit ? "Update Supplier" : "Simpan Supplier"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
