"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Hash, Calendar, Users, FileText,
  Plus, Trash2, ChevronDown, Search, MapPin, Check,
  RefreshCw, PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type QuotationItem,
  type SalesQuotationFormData,
  type Product,
  productDropdownService,
} from "@/lib/services/penjualan.service";
import { customerService } from "@/lib/services/customer.service";
import { DropdownField } from "../DropdownField";

// ─── Props (UI-specific, tetap lokal) ─────────────────────────────────────────
interface SalesQuotationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SalesQuotationFormData) => void | Promise<void>;
  initialData?: SalesQuotationFormData;
  submitting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate nomor quotation otomatis.
 * Format: SQ.{Tahun}.{Bulan}.{5 digit sequence}
 */
function generateNomor(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq   = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
  return `SQ.${year}.${month}.${seq}`;
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
    satuan: "", harga: 0, diskon: 0, subtotal: 0,
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
  items: [newItem()],
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function SalesQuotationModal({
  open, onClose, onSubmit, initialData, submitting = false,
}: SalesQuotationModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<SalesQuotationFormData>(() =>
    initialData ?? { ...EMPTY_FORM, nomor: "", tanggal: todayStr(), items: [newItem()] }
  );

  // ── Mode nomor: "auto" (generate) atau "manual" (ketik sendiri) ──
  const [nomorMode, setNomorMode] = useState<"auto" | "manual">("auto");

  // ── Data dari API ───────────────────────────────────
  const [productList, setProductList] = useState<Product[]>([]);
  const [loadingProduk, setLoadingProduk] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<
    { id: number; name: string }[]
  >([]);

  // Fetch produk & customer saat mount
  useEffect(() => {
    setLoadingProduk(true);
    productDropdownService.getAll()
      .then(setProductList)
      .catch((err) => console.error("Gagal memuat produk:", err))
      .finally(() => setLoadingProduk(false));

    customerService.getAllActive()
      .then((data) => {
        setCustomerOptions(
          data.map((c) => ({
            id:   Number(c.id),
            name: c.nama,
          }))
        );
      })
      .catch((err) => console.error("Gagal memuat customer:", err));
  }, []);

  // Derive satuan unik dari productList
  const satuanOptions = [...new Set(productList.map((p) => p.satuan).filter(Boolean))].sort();

  // Generate nomor saat modal pertama kali dibuka (mode auto)
  useEffect(() => {
    if (open && !isEdit && nomorMode === "auto" && form.nomor === "") {
      handleGenerateNomor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleGenerateNomor = () => {
    const nomor = generateNomor();
    setForm((p) => ({ ...p, nomor }));
  };

  const switchNomorMode = (mode: "auto" | "manual") => {
    setNomorMode(mode);
    if (mode === "auto") handleGenerateNomor();
  };

  // ── Escape to close ──────────────────────────────────
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
        const updated  = { ...item, ...patch };
        const subtotal = updated.harga * updated.qty * (1 - updated.diskon / 100);
        return { ...updated, subtotal };
      }),
    }));
  };

  const selectProduk = (id: string, produkNama: string) => {
    const found = productList.find((p) => p.nama === produkNama);
    if (found) {
      updateItem(id, {
        productId: found.id,
        uomId:     found.uomId,
        produk:    found.nama,
        satuan:    found.satuan,
      });
    } else {
      updateItem(id, { produk: produkNama });
    }
  };

  const addItem    = () => setForm((p) => ({ ...p, items: [...p.items, newItem()] }));
  const removeItem = (id: string) =>
    setForm((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  // ── Totals ───────────────────────────────────────────
  // Definisi:
  //   subtotal      = Σ (harga × qty)            — SEBELUM diskon & pajak
  //   discountTotal = Σ (harga × qty × diskon%)   — total potongan diskon
  //   taxableBase   = subtotal − discountTotal    — dasar pengenaan pajak
  //   taxAmount     = taxableBase × 11%           — hanya jika checkbox PPN dicentang
  //   grandTotal    = taxableBase + taxAmount     — PPN selalu otomatis masuk ke Total
  const subtotal = form.items.reduce((sum, i) => sum + i.harga * i.qty, 0);
  const discountTotal = form.items.reduce(
    (sum, i) => sum + i.harga * i.qty * (i.diskon / 100),
    0
  );
  const taxableBase = subtotal - discountTotal;
  const taxAmount = form.kenaPajak ? taxableBase * 0.11 : 0;
  const grandTotal = taxableBase + taxAmount;

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
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* ── Scrollable Body ───────────────────────── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Section: Informasi Dasar */}
            <Section title="Informasi Dasar">

              {/* Row 1: Nomor + Tanggal */}
              <div className="grid grid-cols-1 gap-4">

                {/* Nomor Quotation — toggle auto/manual (disabled saat edit) */}
                <FormField label="Nomor Quotation" icon={<Hash size={13} />} hint={
                  isEdit ? "Tidak dapat diubah" : (nomorMode === "auto" ? "Auto-generate" : "Input manual")
                }>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-slate-200 p-0.5 shrink-0">
                      <button type="button" onClick={() => switchNomorMode("auto")} title="Auto-generate"
                        disabled={isEdit}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                          isEdit && "opacity-40 cursor-not-allowed",
                          nomorMode === "auto"
                            ? "bg-navy-900 text-gold-400 shadow-sm"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}>
                        <RefreshCw size={13} />
                      </button>
                      <button type="button" onClick={() => switchNomorMode("manual")} title="Input manual"
                        disabled={isEdit}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                          isEdit && "opacity-40 cursor-not-allowed",
                          nomorMode === "manual"
                            ? "bg-navy-900 text-gold-400 shadow-sm"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}>
                        <PenLine size={13} />
                      </button>
                    </div>

                    <div className="relative flex-1">
                      <input
                        readOnly={isEdit || nomorMode === "auto"}
                        disabled={isEdit}
                        value={form.nomor}
                        onChange={(e) => { if (!isEdit && nomorMode === "manual") setField("nomor", e.target.value); }}
                        placeholder={!isEdit && nomorMode === "manual" ? "Masukkan nomor quotation..." : ""}
                        className={cn(
                          inputBase, "font-mono",
                          (isEdit || nomorMode === "auto")
                            ? "bg-slate-50 text-slate-500 cursor-not-allowed pr-10"
                            : "bg-white"
                        )}
                      />
                      {!isEdit && nomorMode === "auto" && (
                        <button type="button" onClick={handleGenerateNomor} title="Generate ulang"
                          className="absolute right-2 top-1/2 -translate-y-1/2
                                     w-6 h-6 flex items-center justify-center rounded-md
                                     text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors">
                          <RefreshCw size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </FormField>

                <FormField label="Tanggal" icon={<Calendar size={13} />} required>
                  <input type="date" value={form.tanggal}
                    onChange={(e) => setField("tanggal", e.target.value)}
                    className={inputBase} />
                </FormField>
              </div>

              {/* Row 2: Dipesan Oleh + Address */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Dipesan Oleh" icon={<Users size={13} />} required
                  hint={isEdit ? "Tidak dapat diubah" : undefined}>
                  <DropdownField
                    value={form.dipesanOleh}
                    placeholder="Pilih customer..."
                    options={customerOptions.map((c) => c.name)}
                    disabled={isEdit}
                    onChange={(v) => {
                      const selected = customerOptions.find((c) => c.name === v);
                      setForm((p) => ({
                        ...p,
                        dipesanOleh: v,
                        customerId: selected?.id ?? null,
                      }));
                    }}
                  />
                </FormField>
                <FormField label="Address" icon={<MapPin size={13} />}>
                  <input type="text" value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    placeholder="Alamat customer..."
                    className={inputBase} />
                </FormField>
              </div>

              {/* Row 3: Keterangan */}
              <FormField label="Keterangan" icon={<FileText size={13} />}>
                <textarea value={form.keterangan}
                  onChange={(e) => setField("keterangan", e.target.value)}
                  placeholder="Catatan atau keterangan tambahan..."
                  rows={2} className={cn(inputBase, "resize-none")} />
              </FormField>

              {/* Row 4: Checkbox Pajak — hanya PPN 11%. Kalau dicentang,
                  pajak otomatis dihitung DAN masuk ke Total (selalu
                  inclusive — tidak ada lagi pilihan exclusive/terpisah). */}
              <div className="flex items-center gap-6 pt-1">
                <Checkbox label="PPN 11%"
                  checked={form.kenaPajak}
                  onChange={(v) => setField("kenaPajak", v)} />
              </div>
            </Section>

            {/* Section: Detail Produk */}
            <Section title="Detail Produk"
              action={
                <button onClick={addItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs
                             font-semibold bg-navy-900 text-gold-400 hover:bg-navy-700 transition-colors">
                  <Plus size={12} /> Tambah Baris
                </button>
              }>
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
                        <td className="px-3 py-2">
                          <ProductSearchField
                            value={item.produk}
                            placeholder={loadingProduk ? "Memuat..." : "Cari produk..."}
                            options={productList}
                            disabled={loadingProduk}
                            onChange={(v) => selectProduk(item.id, v)} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={item.deskripsi}
                            onChange={(e) => updateItem(item.id, { deskripsi: e.target.value })}
                            placeholder="Opsional..." className={cn(inputCompact, "w-full")} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={1} value={item.qty}
                            onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                            className={cn(inputCompact, "w-full text-center")} />
                        </td>
                        <td className="px-3 py-2">
                          <SelectField value={item.satuan} placeholder="Pilih..."
                            options={satuanOptions}
                            onChange={(v) => updateItem(item.id, { satuan: v })} compact />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0}
                            value={item.harga || ""}
                            placeholder="0"
                            onChange={(e) => updateItem(item.id, { harga: Number(e.target.value) })}
                            className={cn(inputCompact, "w-full")} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} max={100} value={item.diskon}
                            onChange={(e) => updateItem(item.id, { diskon: Number(e.target.value) })}
                            className={cn(inputCompact, "w-full text-center")} />
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap text-right">
                          {formatRupiah(item.subtotal)}
                        </td>
                        <td className="px-2 py-2">
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

              {/* Ringkasan: Subtotal → Diskon → Pajak → Total */}
              <div className="flex justify-end mt-3">
                <div className="bg-navy-900 text-white rounded-xl px-5 py-3.5 min-w-[260px] space-y-1.5">
                  <div className="flex items-center justify-between gap-8 text-xs">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-semibold text-slate-200">{formatRupiah(subtotal)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex items-center justify-between gap-8 text-xs">
                      <span className="text-slate-400">Diskon</span>
                      <span className="font-semibold text-red-300">-{formatRupiah(discountTotal)}</span>
                    </div>
                  )}
                  {form.kenaPajak && (
                    <div className="flex items-center justify-between gap-8 text-xs">
                      <span className="text-slate-400">PPN 11%</span>
                      <span className="font-semibold text-slate-200">{formatRupiah(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-8 pt-1.5 border-t border-white/10">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Total</span>
                    <span className="text-base font-bold text-gold-400">{formatRupiah(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* ── Footer ────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4
                          border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button onClick={onClose} disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600
                         bg-white border border-slate-200 rounded-lg
                         hover:bg-slate-100 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed">
              Batal
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-gold-400
                         bg-navy-900 hover:bg-navy-700 rounded-lg transition-colors shadow-sm
                         disabled:opacity-70 disabled:cursor-not-allowed
                         inline-flex items-center gap-2">
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-gold-400/30 border-t-gold-400
                                 rounded-full animate-spin" />
              )}
              {submitting ? "Menyimpan..." : (isEdit ? "Simpan Perubahan" : "Buat Quotation")}
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
function ProductSearchField({
  value, placeholder, options, onChange, disabled = false,
}: {
  value: string;
  placeholder: string;
  options: Product[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = options.filter((opt) =>
    opt.nama.toLowerCase().includes(query.toLowerCase()) ||
    opt.kode.toLowerCase().includes(query.toLowerCase())
  );

  const updateDropdownPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 260),
        zIndex: 9999,
      });
    }
  };

  const handleFocus  = () => { if (!disabled) { updateDropdownPosition(); setOpen(true); } };
  const handleSelect = (nama: string) => { onChange(nama); setQuery(nama); setOpen(false); };
  const handleChange = (v: string) => {
    setQuery(v);
    if (!open) { updateDropdownPosition(); setOpen(true); }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={handleFocus}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white",
            "text-slate-700 placeholder-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all",
            disabled && "opacity-50 cursor-not-allowed bg-slate-50"
          )}
        />
      </div>

      {open && !disabled && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }}
            onClick={() => { setOpen(false); setQuery(value); }} />
          <div style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">Produk tidak ditemukan</div>
            ) : filtered.map((opt) => (
              <button key={opt.id} type="button" onClick={() => handleSelect(opt.nama)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs transition-colors",
                  opt.nama === value ? "bg-navy-900 text-gold-400 font-semibold" : "text-slate-600 hover:bg-slate-50"
                )}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{opt.nama}</span>
                  <span className={cn(
                    "text-[10px] shrink-0 font-mono",
                    opt.nama === value ? "text-gold-400/80" : "text-slate-400"
                  )}>
                    {opt.kode}
                  </span>
                </div>
                <div className={cn(
                  "text-[10px] mt-0.5",
                  opt.nama === value ? "text-gold-400/70" : "text-slate-400"
                )}>
                  {opt.satuan} · {opt.kategori}
                </div>
              </button>
            ))}
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
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 group focus:outline-none">
      <span className={cn(
        "w-4 h-4 rounded border flex items-center justify-center transition-all",
        "group-focus-visible:ring-2 group-focus-visible:ring-navy-600/20",
        checked ? "bg-navy-900 border-navy-900" : "bg-white border-slate-300 group-hover:border-navy-500"
      )}>
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
        position: "fixed", top: rect.bottom + 4,
        left: rect.left, width: rect.width, zIndex: 9999,
      });
    }
    setOpen((p) => !p);
  };

  return (
    <div className="relative">
      <button ref={buttonRef} type="button" onClick={handleOpen}
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

      {open && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-xs transition-colors",
                  opt === value ? "bg-navy-900 text-gold-400 font-semibold" : "text-slate-600 hover:bg-slate-50"
                )}>{opt}</button>
            ))}
          </div>
        </>, document.body
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