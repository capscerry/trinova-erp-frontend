"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Hash, Calendar, Users, FileText,
  Plus, Trash2, ChevronDown, Search, MapPin, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface QuotationItem {
  id: string;
  produk: string;
  deskripsi: string;
  qty: number;
  satuan: string;
  harga: number;
  diskon: number;
  subtotal: number;
}

export interface SalesQuotationFormData {
  nomor: string;
  tanggal: string;
  customerId: number | null;       // ID dari API, untuk dikirim ke backend
  dipesanOleh: string;             // nama customer (untuk display)
  address: string;
  keterangan: string;
  kenaPajak: boolean;
  totalTermasukPajak: boolean;
  items: QuotationItem[];
}

interface SalesQuotationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SalesQuotationFormData) => void | Promise<void>;
  initialData?: SalesQuotationFormData;
  submitting?: boolean;
}

// ─── Dummy Options ────────────────────────────────────────────────────────────
// NOTE: Nanti data ini akan di-fetch dari API
const PRODUK_OPTIONS = [
  { nama: "Laptop Asus X415",         satuan: "Unit",  harga: 6500000 },
  { nama: "Printer Canon G2020",      satuan: "Unit",  harga: 1200000 },
  { nama: "Mouse Wireless Logitech",  satuan: "Unit",  harga: 285000  },
  { nama: "Kertas HVS A4 80gr",       satuan: "Rim",   harga: 45000   },
  { nama: "Tinta Printer Hitam",      satuan: "Botol", harga: 85000   },
  { nama: "Keyboard Mechanical",      satuan: "Unit",  harga: 750000  },
  { nama: "Monitor LG 24\"",          satuan: "Unit",  harga: 2800000 },
];

// NOTE: Nanti data satuan ini juga akan di-fetch dari API
const SATUAN_OPTIONS = [
  "Unit", "Pcs", "Box", "Rim", "Botol", "Pack", "Lusin", "Kg", "Liter", "Meter",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateNomor(): string {
  const year = new Date().getFullYear();
  const seq  = String(Math.floor(Math.random() * 900) + 100);
  return `SQ-${year}-${seq}`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

function newItem(): QuotationItem {
  return {
    id: crypto.randomUUID(),
    produk: "", deskripsi: "", qty: 1,
    satuan: "Unit", harga: 0, diskon: 0, subtotal: 0,
  };
}

const EMPTY_FORM: SalesQuotationFormData = {
  nomor: "",
  tanggal: todayStr(),
  customerId: null,
  dipesanOleh: "",
  address: "",
  keterangan: "",
  kenaPajak: false,
  totalTermasukPajak: false,
  items: [newItem()],
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function SalesQuotationModal({
  open, onClose, onSubmit, initialData, submitting = false,
}: SalesQuotationModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<SalesQuotationFormData>(() =>
    initialData ?? { ...EMPTY_FORM, nomor: generateNomor(), tanggal: todayStr(), items: [newItem()] }
  );

  // ── Customer options dari API ────────────────────────
  // Disimpan sebagai { id, name } supaya saat user pilih nama,
  // kita juga punya id untuk dikirim ke backend (CustomerId).
  const [customerOptions, setCustomerOptions] = useState<
    { id: number; name: string }[]
  >([]);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const res = await fetch("https://localhost:7283/api/customer");
        const json = await res.json();
        // Sesuaikan field id-nya kalau response API beda — saat ini coba
        // beberapa kemungkinan: customerId / id / Id
        setCustomerOptions(
          (json.data ?? []).map((c: any) => ({
            id: c.customerId ?? c.id ?? c.Id,
            name: c.customerName,
          }))
        );
      } catch (err) {
        console.log(err);
      }
    };
    fetchCustomerData();
  }, []);

  // Saat user pilih customer dari dropdown, simpan name + id
  const selectCustomer = (name: string) => {
    const found = customerOptions.find((c) => c.name === name);
    setForm((p) => ({
      ...p,
      dipesanOleh: name,
      customerId: found?.id ?? null,
    }));
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Header field setter ──────────────────────────────
  const setField = <K extends keyof SalesQuotationFormData>(
    key: K, val: SalesQuotationFormData[K]
  ) => setForm((p) => ({ ...p, [key]: val }));

  // ── Item helpers ─────────────────────────────────────
  const updateItem = (id: string, patch: Partial<QuotationItem>) => {
    setForm((p) => ({
      ...p,
      items: p.items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        const subtotal = updated.harga * updated.qty * (1 - updated.diskon / 100);
        return { ...updated, subtotal };
      }),
    }));
  };

  const selectProduk = (id: string, produkNama: string) => {
    const found = PRODUK_OPTIONS.find((p) => p.nama === produkNama);
    if (found) {
      updateItem(id, { produk: found.nama, satuan: found.satuan, harga: found.harga });
    } else {
      updateItem(id, { produk: produkNama });
    }
  };

  const addItem    = () => setForm((p) => ({ ...p, items: [...p.items, newItem()] }));
  const removeItem = (id: string) =>
    setForm((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  // ── Totals ───────────────────────────────────────────
  const grandTotal = form.items.reduce((sum, i) => sum + i.subtotal, 0);

  const handleSubmit = () => { onSubmit(form); };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh]
                        flex flex-col border border-slate-200 overflow-hidden">

          {/* ── Modal Header ──────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4
                          bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Sales Quotation" : "Tambah Sales Quotation"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit ? "Perbarui data penawaran" : "Buat penawaran penjualan baru"}
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

          {/* ── Scrollable Body ───────────────────────── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Section: Informasi Dasar */}
            <Section title="Informasi Dasar">

              {/* Row 1: Nomor + Tanggal */}
              <div className="grid grid-cols-1 gap-4">
                <FormField label="Nomor Quotation" icon={<Hash size={13} />} hint="Auto-generate">
                  <input
                    readOnly value={form.nomor}
                    className={cn(inputBase, "bg-slate-50 text-slate-500 font-mono cursor-not-allowed")}
                  />
                </FormField>
                <FormField label="Tanggal" icon={<Calendar size={13} />} required>
                  <input
                    type="date" value={form.tanggal}
                    onChange={(e) => setField("tanggal", e.target.value)}
                    className={inputBase}
                  />
                </FormField>
              </div>

              {/* Row 2: Dipesan Oleh + Address */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Dipesan Oleh" icon={<Users size={13} />} required>
                  <SearchField
                    value={form.dipesanOleh}
                    placeholder="Cari sales..."
                    options={customerOptions.map((c) => c.name)}
                    onChange={selectCustomer}
                  />
                </FormField>
                <FormField label="Address" icon={<MapPin size={13} />}>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    placeholder="Alamat customer..."
                    className={inputBase}
                  />
                </FormField>
              </div>

              {/* Row 3: Keterangan */}
              <FormField label="Keterangan" icon={<FileText size={13} />}>
                <textarea
                  value={form.keterangan}
                  onChange={(e) => setField("keterangan", e.target.value)}
                  placeholder="Catatan atau keterangan tambahan..."
                  rows={2}
                  className={cn(inputBase, "resize-none")}
                />
              </FormField>

              {/* Row 4: Checkbox Pajak */}
              <div className="flex items-center gap-6 pt-1">
                <Checkbox
                  label="Kena Pajak"
                  checked={form.kenaPajak}
                  onChange={(v) => setField("kenaPajak", v)}
                />
                <Checkbox
                  label="Total termasuk Pajak"
                  checked={form.totalTermasukPajak}
                  onChange={(v) => setField("totalTermasukPajak", v)}
                />
              </div>
            </Section>

            {/* Section: Detail Produk */}
            <Section
              title="Detail Produk"
              action={
                <button
                  onClick={addItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs
                             font-semibold bg-navy-900 text-gold-400 hover:bg-navy-700
                             transition-colors"
                >
                  <Plus size={12} /> Tambah Baris
                </button>
              }
            >
              {/* Item table */}
              <div className="border border-slate-200 rounded-xl overflow-visible">
                <table className="w-full border-collapse text-xs table-fixed min-w-[860px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[20%]">Produk</th>
                      <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[18%]">Deskripsi</th>
                      <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[8%]">Qty</th>
                      <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[11%]">Satuan</th>
                      <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[14%]">Harga</th>
                      <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[10%]">Diskon %</th>
                      <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[14%]">Subtotal</th>
                      <th className="px-3 py-2.5 w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.items.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50/50">

                        {/* Produk - Search Field */}
                        <td className="px-3 py-2">
                          <ProductSearchField
                            value={item.produk}
                            placeholder="Cari produk..."
                            options={PRODUK_OPTIONS}
                            onChange={(v) => selectProduk(item.id, v)}
                          />
                        </td>

                        {/* Deskripsi */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.deskripsi}
                            onChange={(e) => updateItem(item.id, { deskripsi: e.target.value })}
                            placeholder="Opsional..."
                            className={cn(inputCompact, "w-full")}
                          />
                        </td>

                        {/* Qty - lebar diperbaiki */}
                        <td className="px-3 py-2">
                          <input
                            type="number" min={1}
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                            className={cn(inputCompact, "w-full text-center")}
                          />
                        </td>

                        {/* Satuan - sekarang dropdown */}
                        <td className="px-3 py-2">
                          <SelectField
                            value={item.satuan}
                            placeholder="Pilih..."
                            options={SATUAN_OPTIONS}
                            onChange={(v) => updateItem(item.id, { satuan: v })}
                            compact
                          />
                        </td>

                        {/* Harga */}
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0}
                            value={item.harga}
                            onChange={(e) => updateItem(item.id, { harga: Number(e.target.value) })}
                            className={cn(inputCompact, "w-full")}
                          />
                        </td>

                        {/* Diskon */}
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} max={100}
                            value={item.diskon}
                            onChange={(e) => updateItem(item.id, { diskon: Number(e.target.value) })}
                            className={cn(inputCompact, "w-full text-center")}
                          />
                        </td>

                        {/* Subtotal */}
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap text-right">
                          {formatRupiah(item.subtotal)}
                        </td>

                        {/* Hapus baris */}
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={form.items.length === 1}
                            className="w-6 h-6 flex items-center justify-center rounded-md
                                       text-slate-300 hover:text-red-500 hover:bg-red-50
                                       disabled:opacity-20 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total */}
              <div className="flex justify-end mt-3">
                <div className="bg-navy-900 text-white rounded-xl px-5 py-3 min-w-[220px]">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                      Total
                    </span>
                    <span className="text-base font-bold text-gold-400">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </Section>

          </div>

          {/* ── Footer ────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4
                          border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600
                         bg-white border border-slate-200 rounded-lg
                         hover:bg-slate-100 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-gold-400
                         bg-navy-900 hover:bg-navy-700 rounded-lg transition-colors shadow-sm
                         disabled:opacity-70 disabled:cursor-not-allowed
                         inline-flex items-center gap-2"
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-gold-400/30 border-t-gold-400
                                 rounded-full animate-spin" />
              )}
              {submitting
                ? "Menyimpan..."
                : (isEdit ? "Simpan Perubahan" : "Buat Quotation")}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
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

// ─── FormField wrapper ────────────────────────────────────────────────────────
function FormField({
  label, icon, hint, required, children,
}: {
  label: string; icon?: React.ReactNode;
  hint?: string; required?: boolean;
  children: React.ReactNode;
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

// ─── ProductSearchField ──────────────────────────────────────────────────────
// Field khusus produk: user bisa mengetik untuk mencari produk,
// hasil pencarian muncul sebagai dropdown yang bisa dipilih.
function ProductSearchField({
  value, placeholder, options, onChange,
}: {
  value: string;
  placeholder: string;
  options: { nama: string; satuan: string; harga: number }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sinkronkan query saat value berubah dari luar
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Filter berdasarkan input user
  const filtered = options.filter((opt) =>
    opt.nama.toLowerCase().includes(query.toLowerCase())
  );

  const updateDropdownPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 240), // minimal lebar agar info produk terbaca
        zIndex: 9999,
      });
    }
  };

  const handleFocus = () => {
    updateDropdownPosition();
    setOpen(true);
  };

  const handleSelect = (nama: string) => {
    onChange(nama);
    setQuery(nama);
    setOpen(false);
  };

  const handleChange = (v: string) => {
    setQuery(v);
    if (!open) {
      updateDropdownPosition();
      setOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white",
            "text-slate-700 placeholder-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500",
            "transition-all"
          )}
        />
      </div>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => {
              setOpen(false);
              // Jika user batal pilih, kembalikan ke value yg tersimpan
              setQuery(value);
            }}
          />
          <div
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                Produk tidak ditemukan
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.nama}
                  type="button"
                  onClick={() => handleSelect(opt.nama)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors",
                    "flex items-center justify-between gap-3",
                    opt.nama === value
                      ? "bg-navy-900 text-gold-400 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="truncate">{opt.nama}</span>
                  <span
                    className={cn(
                      "text-[10px] shrink-0 font-mono",
                      opt.nama === value ? "text-gold-400/80" : "text-slate-400"
                    )}
                  >
                    {formatRupiah(opt.harga)}
                  </span>
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── SearchField (generic text search) ───────────────────────────────────────
// Field pencarian teks biasa: user mengetik untuk filter list, hasilnya muncul
// sebagai dropdown. Dipakai untuk field seperti "Dipesan Oleh" yang datanya
// hanya string list (tanpa info tambahan seperti harga).
function SearchField({
  value, placeholder, options, onChange,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  const updateDropdownPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  };

  const handleFocus = () => {
    updateDropdownPosition();
    setOpen(true);
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  };

  const handleChange = (v: string) => {
    setQuery(v);
    if (!open) {
      updateDropdownPosition();
      setOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white",
            "text-slate-700 placeholder-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500",
            "transition-all"
          )}
        />
      </div>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => {
              setOpen(false);
              setQuery(value);
            }}
          />
          <div
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                Tidak ditemukan
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors",
                    opt === value
                      ? "bg-navy-900 text-gold-400 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 group focus:outline-none"
    >
      <span
        className={cn(
          "w-4 h-4 rounded border flex items-center justify-center transition-all",
          "group-focus-visible:ring-2 group-focus-visible:ring-navy-600/20",
          checked
            ? "bg-navy-900 border-navy-900"
            : "bg-white border-slate-300 group-hover:border-navy-500"
        )}
      >
        {checked && <Check size={11} className="text-gold-400" strokeWidth={3} />}
      </span>
      <span className="text-sm text-slate-700 select-none">{label}</span>
    </button>
  );
}

// ─── SelectField ──────────────────────────────────────────────────────────────
function SelectField({
  value, placeholder, options, onChange, compact = false,
}: {
  value: string; placeholder: string;
  options: string[]; onChange: (v: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen((p) => !p);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full flex items-center justify-between gap-2 border border-slate-200 bg-white",
          "text-left transition-all focus:outline-none",
          "focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500",
          compact
            ? "px-2.5 py-1.5 rounded-lg text-xs"
            : "px-3 py-2.5 rounded-lg text-sm",
          value ? "text-slate-700" : "text-slate-400"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={12} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto"
          >
            {options.map((opt) => (
              <button
                key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-xs transition-colors",
                  opt === value
                    ? "bg-navy-900 text-gold-400 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputBase = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all
`;

const inputCompact = `
  px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all
`;