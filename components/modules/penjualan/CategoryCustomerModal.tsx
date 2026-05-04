"use client";

import { useState, useEffect } from "react";
import { X, Hash, Tag, FileText, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KategoriFormData {
  id : number;
  nama: string;
}

interface KategoriModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: KategoriFormData) => void;
  initialData?: KategoriFormData;
}



const EMPTY_FORM: KategoriFormData = {
  id: 0,
  nama: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function KategoriCustomerModal({ open, onClose, onSubmit, initialData }: KategoriModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<KategoriFormData>(EMPTY_FORM);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initialData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (field: keyof KategoriFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => { onSubmit(form); onClose(); };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit ? "Perbarui data kategori customer" : "Isi data kategori di bawah ini"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Nama */}
            <FormField label="Nama Kategori" icon={<Tag size={14} />} required>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="Contoh: Pelanggan Premium"
                className={inputClass}
              />
            </FormField>

           

            
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600
                         bg-white border border-slate-200 rounded-lg
                         hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-sm font-semibold text-gold-400
                         bg-navy-900 hover:bg-navy-700 rounded-lg transition-colors shadow-sm"
            >
              {isEdit ? "Simpan Perubahan" : "Tambah Kategori"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({
  label, icon, hint, required, children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-400 font-bold">*</span>}
        {hint && (
          <span className="ml-auto text-[10px] font-normal text-slate-400 normal-case tracking-normal">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

const inputClass = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all
`;