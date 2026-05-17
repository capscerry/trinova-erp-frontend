"use client";

import { useState, useEffect } from "react";
import { X, Check, ArrowRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SalesOrderFormData,
  type SalesOrderModalProps,
  PROSES_LINKS,
  EMPTY_FORM,
  generateNomor,
} from "./sales_order/SalesOrderType";
import { SalesOrderHeaderForm } from "./sales_order/SalesOrderHeader";
import { SalesOrderDetailForm } from "./sales_order/SalesOrderDetail";

export type { SalesOrderItem, SalesOrderFormData } from "./sales_order/SalesOrderType";

// ─── Component ────────────────────────────────────────────────────────────────
export function SalesOrderModal({
  open, onClose, onSubmit, submitting = false,
  initialData, onNavigate, savedId,
  pelangganOptions = [], salesOptions = [],
}: SalesOrderModalProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<SalesOrderFormData>(() =>
    initialData ?? { ...EMPTY_FORM, nomor: generateNomor() }
  );

  useEffect(() => {
    if (open) {
      const base = initialData ?? { ...EMPTY_FORM };
      setForm({ ...base, nomor: base.nomor || generateNomor() });
    }
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const patchForm = (patch: Partial<SalesOrderFormData>) =>
    setForm((p) => ({ ...p, ...patch }));

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh]
                        flex flex-col border border-slate-200 overflow-hidden">

          {/* ── Header ─────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4
                          bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Sales Order" : "Tambah Sales Order"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit ? "Perbarui data pesanan" : "Buat pesanan penjualan baru"}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* ── Body ───────────────────────────────── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Informasi Dasar */}
            <SalesOrderHeaderForm
              form={form}
              onChange={patchForm}
              pelangganOptions={pelangganOptions}
              salesOptions={salesOptions}
            />

            {/* Detail Produk */}
            <SalesOrderDetailForm
              items={form.items}
              onChange={(items) => patchForm({ items })}
            />

            {/* ── Proses ke ──────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Proses ke</h3>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                {savedId
                  ? "Lanjutkan proses dari Sales Order ini ke dokumen berikut."
                  : "Simpan Sales Order terlebih dahulu untuk mengaktifkan proses lanjutan."}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PROSES_LINKS.map(({ key, label, desc, icon: Icon, color, bg }) => {
                  const isActive = !!savedId;
                  return (
                    <button key={key} disabled={!isActive}
                      onClick={() => onNavigate?.(key, form)}
                      className={cn(
                        "flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all",
                        isActive ? cn(bg, "cursor-pointer") : "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                      )}>
                      <div className="flex items-center justify-between w-full">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                          isActive ? "bg-white/70" : "bg-slate-100")}>
                          <Icon size={15} className={isActive ? color : "text-slate-400"} />
                        </div>
                        {isActive && <ArrowRight size={13} className={color} />}
                      </div>
                      <div>
                        <p className={cn("text-xs font-bold", isActive ? "text-slate-800" : "text-slate-500")}>{label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!savedId && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
                  <Check size={10} className="text-slate-300" />
                  Tombol akan aktif setelah SO berhasil disimpan
                </p>
              )}
            </div>

          </div>

          {/* ── Footer ─────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4
                          border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white
                         border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              Batal
            </button>
            <button onClick={() => onSubmit(form)} disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900
                         hover:bg-navy-700 rounded-lg transition-colors shadow-sm
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Buat Sales Order"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}