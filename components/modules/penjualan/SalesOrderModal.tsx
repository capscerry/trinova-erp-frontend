"use client";

import { useState, useEffect } from "react";
import {
  X, Hash, Calendar, User, Users, FileText,
  ToggleLeft, Plus, Trash2, MapPin, ChevronDown, Link,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SalesOrderItem {
  id: string;
  produk: string;
  deskripsi: string;
  qty: number;
  qtyTerkirim: number;
  satuan: string;
  harga: number;
  diskon: number;
  subtotal: number;
}

export interface SalesOrderFormData {
  nomor: string;
  tanggal: string;
  tanggalKirim: string;
  pelanggan: string;
  salesQuotation: string;
  dipesanOleh: string;
  alamatPengiriman: string;
  keterangan: string;
  status: "Draft" | "Dikonfirmasi" | "Dalam Proses" | "Selesai" | "Dibatalkan";
  items: SalesOrderItem[];
}

interface SalesOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SalesOrderFormData) => void;
  initialData?: SalesOrderFormData;
}

// ─── Options ──────────────────────────────────────────────────────────────────
const PELANGGAN_OPTIONS = [
  "PT Maju Bersama", "CV Sinar Terang", "Toko Berkah Jaya",
  "PT Karya Mandiri", "UD Sejahtera", "CV Mitra Usaha", "PT Global Niaga",
];

const QUOTATION_OPTIONS = [
  "SQ-2026-001", "SQ-2026-002", "SQ-2026-003",
  "SQ-2026-004", "SQ-2026-005", "SQ-2026-006",
];

const DIPESAN_OPTIONS = ["Ahmad Rizky", "Budi Santoso", "Citra Dewi"];

const PRODUK_OPTIONS = [
  { nama: "Laptop Asus X415",        satuan: "Unit",  harga: 6500000 },
  { nama: "Printer Canon G2020",     satuan: "Unit",  harga: 1200000 },
  { nama: "Mouse Wireless Logitech", satuan: "Unit",  harga: 285000  },
  { nama: "Kertas HVS A4 80gr",      satuan: "Rim",   harga: 45000   },
  { nama: "Tinta Printer Hitam",     satuan: "Botol", harga: 85000   },
  { nama: "Keyboard Mechanical",     satuan: "Unit",  harga: 750000  },
  { nama: "Monitor LG 24\"",         satuan: "Unit",  harga: 2800000 },
];

const STATUS_OPTIONS = ["Draft", "Dikonfirmasi", "Dalam Proses", "Selesai", "Dibatalkan"] as const;

const STATUS_COLORS: Record<string, string> = {
  Draft:          "bg-slate-100  text-slate-600  border-slate-300",
  Dikonfirmasi:   "bg-blue-50    text-blue-700   border-blue-300",
  "Dalam Proses": "bg-amber-50   text-amber-700  border-amber-300",
  Selesai:        "bg-green-50   text-green-700  border-green-300",
  Dibatalkan:     "bg-red-50     text-red-700    border-red-300",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateNomor = () => `SO-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
const todayStr      = () => new Date().toISOString().split("T")[0];
const formatRupiah  = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const newItem = (): SalesOrderItem => ({
  id: crypto.randomUUID(),
  produk: "", deskripsi: "", qty: 1, qtyTerkirim: 0,
  satuan: "Unit", harga: 0, diskon: 0, subtotal: 0,
});

const EMPTY_FORM: SalesOrderFormData = {
  nomor: "", tanggal: todayStr(), tanggalKirim: "",
  pelanggan: "", salesQuotation: "", dipesanOleh: "",
  alamatPengiriman: "", keterangan: "", status: "Draft",
  items: [newItem()],
};

// ─── Component ────────────────────────────────────────────────────────────────
export function SalesOrderModal({ open, onClose, onSubmit, initialData }: SalesOrderModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<SalesOrderFormData>(()=>
    initialData ?? { ...EMPTY_FORM, nomor: generateNomor() }
);

//   useEffect(() => {
//     if (open) setForm(initialData ?? { ...EMPTY_FORM, nomor: generateNomor(), items: [newItem()] });
//   }, [open, initialData]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const setField = <K extends keyof SalesOrderFormData>(k: K, v: SalesOrderFormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // ── Item helpers ─────────────────────────────────────
  const updateItem = (id: string, patch: Partial<SalesOrderItem>) =>
    setForm((p) => ({
      ...p,
      items: p.items.map((item) => {
        if (item.id !== id) return item;
        const u = { ...item, ...patch };
        return { ...u, subtotal: u.harga * u.qty * (1 - u.diskon / 100) };
      }),
    }));

  const selectProduk = (id: string, nama: string) => {
    const found = PRODUK_OPTIONS.find((p) => p.nama === nama);
    if (found) updateItem(id, { produk: found.nama, satuan: found.satuan, harga: found.harga });
    else updateItem(id, { produk: nama });
  };

  const addItem    = () => setForm((p) => ({ ...p, items: [...p.items, newItem()] }));
  const removeItem = (id: string) => setForm((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  const grandTotal = form.items.reduce((s, i) => s + i.subtotal, 0);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh]
                        flex flex-col border border-slate-200 overflow-hidden">

          {/* Header */}
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

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* ── Section 1: Informasi Dasar ─────────── */}
            <Section title="Informasi Dasar">

              {/* Nomor + Tanggal */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nomor SO" icon={<Hash size={13} />} hint="Auto-generate">
                  <input readOnly value={form.nomor}
                    className={cn(inputBase, "bg-slate-50 text-slate-500 font-mono cursor-not-allowed")} />
                </FormField>
                <FormField label="Tanggal" icon={<Calendar size={13} />} required>
                  <input type="date" value={form.tanggal}
                    onChange={(e) => setField("tanggal", e.target.value)}
                    className={inputBase} />
                </FormField>
              </div>

              {/* Tanggal Kirim + Sales Quotation */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tanggal Kirim" icon={<Calendar size={13} />}>
                  <input type="date" value={form.tanggalKirim}
                    onChange={(e) => setField("tanggalKirim", e.target.value)}
                    className={inputBase} />
                </FormField>
                <FormField label="Referensi Quotation" icon={<Link size={13} />}>
                  <SelectField
                    value={form.salesQuotation}
                    placeholder="Pilih quotation (opsional)..."
                    options={QUOTATION_OPTIONS}
                    onChange={(v) => setField("salesQuotation", v)}
                  />
                </FormField>
              </div>

              {/* Pelanggan + Dipesan Oleh */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Pelanggan" icon={<User size={13} />} required>
                  <SelectField
                    value={form.pelanggan}
                    placeholder="Pilih pelanggan..."
                    options={PELANGGAN_OPTIONS}
                    onChange={(v) => setField("pelanggan", v)}
                  />
                </FormField>
                <FormField label="Dipesan Oleh" icon={<Users size={13} />} required>
                  <SelectField
                    value={form.dipesanOleh}
                    placeholder="Pilih sales..."
                    options={DIPESAN_OPTIONS}
                    onChange={(v) => setField("dipesanOleh", v)}
                  />
                </FormField>
              </div>

              {/* Alamat Pengiriman */}
              <FormField label="Alamat Pengiriman" icon={<MapPin size={13} />}>
                <textarea value={form.alamatPengiriman}
                  onChange={(e) => setField("alamatPengiriman", e.target.value)}
                  placeholder="Alamat tujuan pengiriman..."
                  rows={2} className={cn(inputBase, "resize-none")} />
              </FormField>

              {/* Status */}
              <FormField label="Status" icon={<ToggleLeft size={13} />}>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setField("status", s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        form.status === s
                          ? STATUS_COLORS[s]
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Keterangan */}
              <FormField label="Keterangan" icon={<FileText size={13} />}>
                <textarea value={form.keterangan}
                  onChange={(e) => setField("keterangan", e.target.value)}
                  placeholder="Catatan atau keterangan tambahan..."
                  rows={2} className={cn(inputBase, "resize-none")} />
              </FormField>
            </Section>

            {/* ── Section 2: Detail Produk ───────────── */}
            <Section
              title="Detail Produk"
              action={
                <button onClick={addItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs
                             font-semibold bg-navy-900 text-gold-400 hover:bg-navy-700 transition-colors">
                  <Plus size={12} /> Tambah Baris
                </button>
              }
            >
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["Produk", "Deskripsi", "Qty", "Terkirim", "Satuan", "Harga", "Diskon %", "Subtotal", ""].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold uppercase
                                                  tracking-wider text-slate-400 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          {/* Produk */}
                          <td className="px-3 py-2">
                            <SelectField
                              value={item.produk} compact
                              placeholder="Pilih produk..."
                              options={PRODUK_OPTIONS.map((p) => p.nama)}
                              onChange={(v) => selectProduk(item.id, v)}
                            />
                          </td>
                          {/* Deskripsi */}
                          <td className="px-3 py-2">
                            <input type="text" value={item.deskripsi}
                              onChange={(e) => updateItem(item.id, { deskripsi: e.target.value })}
                              placeholder="Opsional..." className={cn(inputCompact, "w-24")} />
                          </td>
                          {/* Qty */}
                          <td className="px-3 py-2">
                            <input type="number" min={1} value={item.qty}
                              onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                              className={cn(inputCompact, "w-14 text-center")} />
                          </td>
                          {/* Qty Terkirim - readonly */}
                          <td className="px-3 py-2">
                            <input readOnly value={item.qtyTerkirim}
                              className={cn(inputCompact, "w-14 text-center bg-slate-50 text-slate-400 cursor-not-allowed")} />
                          </td>
                          {/* Satuan */}
                          <td className="px-3 py-2">
                            <input type="text" value={item.satuan}
                              onChange={(e) => updateItem(item.id, { satuan: e.target.value })}
                              className={cn(inputCompact, "w-16")} />
                          </td>
                          {/* Harga */}
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={item.harga}
                              onChange={(e) => updateItem(item.id, { harga: Number(e.target.value) })}
                              className={cn(inputCompact, "w-28")} />
                          </td>
                          {/* Diskon */}
                          <td className="px-3 py-2">
                            <input type="number" min={0} max={100} value={item.diskon}
                              onChange={(e) => updateItem(item.id, { diskon: Number(e.target.value) })}
                              className={cn(inputCompact, "w-14 text-center")} />
                          </td>
                          {/* Subtotal */}
                          <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">
                            {formatRupiah(item.subtotal)}
                          </td>
                          {/* Hapus */}
                          <td className="px-3 py-2">
                            <button onClick={() => removeItem(item.id)}
                              disabled={form.items.length === 1}
                              className="w-6 h-6 flex items-center justify-center rounded-md
                                         text-slate-300 hover:text-red-500 hover:bg-red-50
                                         disabled:opacity-20 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-end mt-3">
                <div className="bg-navy-900 text-white rounded-xl px-5 py-3 min-w-[220px]">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Total</span>
                    <span className="text-base font-bold text-gold-400">{formatRupiah(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </Section>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4
                          border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white
                         border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              Batal
            </button>
            <button onClick={() => { onSubmit(form); onClose(); }}
              className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900
                         hover:bg-navy-700 rounded-lg transition-colors shadow-sm">
              {isEdit ? "Simpan Perubahan" : "Buat Sales Order"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({ label, icon, hint, required, children }: {
  label: string; icon?: React.ReactNode;
  hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-400 font-bold">*</span>}
        {hint && <span className="ml-auto text-[10px] font-normal text-slate-400 normal-case tracking-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── SelectField ──────────────────────────────────────────────────────────────
function SelectField({ value, placeholder, options, onChange, compact = false }: {
  value: string; placeholder: string; options: string[];
  onChange: (v: string) => void; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className={cn(
          "w-full flex items-center justify-between gap-2 border border-slate-200 bg-white",
          "text-left transition-all focus:outline-none",
          "focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500",
          compact ? "px-2.5 py-1.5 rounded-lg text-xs" : "px-3 py-2.5 rounded-lg text-sm",
          value ? "text-slate-700" : "text-slate-400"
        )}>
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={12} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200
                          rounded-xl shadow-lg py-1 min-w-full max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-xs transition-colors",
                  opt === value ? "bg-navy-900 text-gold-400 font-semibold" : "text-slate-600 hover:bg-slate-50"
                )}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const inputBase = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all
`;

const inputCompact = `
  px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all
`;