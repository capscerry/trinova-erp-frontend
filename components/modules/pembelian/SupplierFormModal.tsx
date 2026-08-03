"use client";

import React, { useState } from "react";
import { X, Upload } from "lucide-react";
import { emailError, phoneError, sanitizePhoneInput } from "@/lib/validation";

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
    status: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      supplier_code: string;
      supplier_name: string;
      no_telp_bisnis: string;
      email: string;
      alamat: string;
      category_supplier: string;
      status: string;
    }>
  >;
  categories: {
    category_supplier: string;
    nama_category: string;
    is_active?: boolean;
  }[];
  onClose: () => void;
  onSave: () => void;
  saving? :boolean;
  setCatalogFile: React.Dispatch<React.SetStateAction<File | null>>;
}

const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500 transition";
const errorInputClass = "!border-red-400 focus:!ring-red-500/30";

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
        <span>
          {label}
          {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
        </span>
        {hint && (
          <span className="ml-auto text-[11px] font-normal normal-case tracking-normal text-slate-400">
            {hint}
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
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
  saving = false,
  setCatalogFile,
}: SupplierFormModalProps) {
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [errors, setErrors] = useState<{ email?: string; no_telp_bisnis?: string }>({});

  if (!open) return null;

  // Only show active categories in the dropdown
  const activeCategories = categories.filter(
    (c) => c.is_active === undefined || c.is_active === true
  );

  const handleSave = () => {
    if(saving) return;
    const nextErrors = {
      email: emailError(formData.email),
      no_telp_bisnis: phoneError(formData.no_telp_bisnis),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.no_telp_bisnis) return;
    onSave();
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

              <FormField label="Nama Supplier" required>
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

              <FormField label="Category Supplier" required>
                <select
                  value={formData.category_supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, category_supplier: e.target.value })
                  }
                  className={inputBase}
                >
                  <option value="">Pilih Category</option>
                  {activeCategories.map((item) => (
                    <option
                      key={item.category_supplier}
                      value={item.category_supplier}
                    >
                      {item.nama_category}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Telepon" error={errors.no_telp_bisnis} hint="Hanya angka">
                <input
                  type="text"
                  placeholder="08123456789"
                  value={formData.no_telp_bisnis}
                  onChange={(e) => {
                    setFormData({ ...formData, no_telp_bisnis: sanitizePhoneInput(e.target.value) });
                    if (errors.no_telp_bisnis) setErrors((prev) => ({ ...prev, no_telp_bisnis: undefined }));
                  }}
                  className={`${inputBase} ${errors.no_telp_bisnis ? errorInputClass : ""}`}
                />
              </FormField>

              <FormField label="Email" error={errors.email}>
                <input
                  type="email"
                  placeholder="supplier@email.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`${inputBase} ${errors.email ? errorInputClass : ""}`}
                />
              </FormField>

              {/* Status toggle - spans both columns */}
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Status
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "Active" })}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      formData.status === "Active"
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "Inactive" })}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-slate-200 ${
                      formData.status === "Inactive"
                        ? "bg-slate-500 text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
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

            {/* UPLOAD CATALOG - only on create */}
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
                      <Upload size={14} />
                      Upload Catalog
                    </label>

                    <input
                      id="catalog-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCatalogFile(file);
                        setSelectedFileName(file.name);
                      }}
                    />

                    {selectedFileName && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg text-sm font-medium">
                        - {selectedFileName}
                      </span>
                    )}
                  </div>

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
              onClick={handleSave}
              disabled = {saving}
              className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 hover:bg-navy-700 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
               {saving ? "Menyimpan..." : isEdit ? "Update Supplier" : "Simpan Supplier"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
