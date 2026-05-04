"use client";

import { useState, useEffect } from "react";
import { X, User, Mail, Phone, MapPin, Hash, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CustomerFormData {
  kode: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  status: string;
  category: string;
}

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => void;
  /** Isi ini kalau modal dipakai untuk Edit */
  initialData?: CustomerFormData;
}

// ─── Auto-generate kode customer ─────────────────────────────────────────────
function generateKode(): string {
  const num = Math.floor(Math.random() * 900) + 100;
  return `CUST-${num}`;
}

const EMPTY_FORM: CustomerFormData = {
  kode: "",
  nama: "",
  email: "",
  telepon: "",
  alamat: "",
  status: "Aktif",
  category: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function CustomerModal({ open, onClose, onSubmit, initialData }: CustomerModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [categories, setCategories] = useState<Array<{ id: number; namaKategori: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch kategori customer untuk dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch("https://localhost:7283/api/category-customer");
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const data = await response.json();
        setCategories(data.data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Reset / isi form saat modal dibuka
  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData);
      } else {
        setForm({ ...EMPTY_FORM, kode: generateKode() });
      }
    }
  }, [open, initialData]);

  // Tutup modal saat tekan Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (field: keyof CustomerFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
      />

      {/* ── Modal ────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl
                        border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header - Fixed */}
          <div className="flex items-center justify-between px-8 py-5
                          bg-gradient-to-r from-navy-900 to-navy-600 flex-shrink-0">
            <div>
              <h2 className="text-white font-semibold text-lg tracking-tight">
                {isEdit ? "Edit Customer" : "Tambah Customer Baru"}
              </h2>
              <p className="text-slate-300 text-sm mt-1">
                {isEdit ? "Perbarui data customer" : "Isi data customer di bawah ini"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="px-8 py-6 space-y-5 overflow-y-auto flex-1">

            {/* Kode Customer - read only */}
            <FormField
              label="Kode Customer"
              icon={<Hash size={16} />}
              hint="Auto-generate"
            >
              <input
                type="text"
                value={form.kode}
                readOnly
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-200
                           bg-slate-50 text-slate-500 font-mono cursor-not-allowed
                           focus:outline-none"
              />
            </FormField>

            {/* Nama Customer */}
            <FormField label="Nama Customer" icon={<User size={16} />} required>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="Contoh: PT Maju Bersama"
                className={inputClass}
              />
            </FormField>

            {/* Category Customer */}
            <FormField label="Kategori Customer" required>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                disabled={loadingCategories}
                className={cn(inputClass, loadingCategories && "bg-slate-50 cursor-not-allowed opacity-60")}
              >
                <option value="">
                  {loadingCategories ? "Memuat kategori..." : "-- Pilih Kategori --"}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.namaKategori}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Email & Telepon - 2 kolom */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email" icon={<Mail size={16} />} required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@company.com"
                  className={inputClass}
                />
              </FormField>

              <FormField label="No. Telepon" icon={<Phone size={16} />} required>
                <input
                  type="text"
                  value={form.telepon}
                  onChange={(e) => set("telepon", e.target.value)}
                  placeholder="021-xxxxxxx"
                  className={inputClass}
                />
              </FormField>
            </div>

            {/* Alamat */}
            <FormField label="Alamat" icon={<MapPin size={16} />}>
              <textarea
                value={form.alamat}
                onChange={(e) => set("alamat", e.target.value)}
                placeholder="Jl. Contoh No. 1, Kota"
                rows={2}
                className={cn(inputClass, "resize-none")}
              />
            </FormField>

            {/* Status */}
            <FormField label="Status" icon={<ToggleLeft size={16} />}>
              <div className="flex gap-3">
                {(["Aktif", "Non-aktif"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-all",
                      form.status === s
                        ? s === "Aktif"
                          ? "bg-green-50 border-green-400 text-green-700"
                          : "bg-red-50 border-red-400 text-red-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </FormField>

          </div>

          {/* Footer - Fixed */}
          <div className="flex items-center justify-end gap-3 px-8 py-4
                          border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-slate-700
                         bg-white border border-slate-300 rounded-lg
                         hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              className="px-8 py-2.5 text-sm font-semibold text-white
                         bg-navy-900 hover:bg-navy-800 rounded-lg
                         transition-colors shadow-sm"
            >
              {isEdit ? "Simpan Perubahan" : "Tambah Customer"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── FormField wrapper ────────────────────────────────────────────────────────
function FormField({
  label,
  icon,
  hint,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
        {icon && <span className="text-slate-500">{icon}</span>}
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold">*</span>}
        {hint && <span className="ml-auto text-[11px] font-normal text-slate-400 normal-case tracking-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Shared input class ───────────────────────────────────────────────────────
const inputClass = `
  w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white
  text-slate-800 placeholder-slate-400 font-sans
  focus:outline-none focus:ring-2 focus:ring-navy-600/30 focus:border-navy-500
  transition-all
`;