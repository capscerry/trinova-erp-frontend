"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SalesOrderItem,
  formatRupiah,
  newItem,
  inputCompact,
} from "./SalesOrderType";

// ─── Options ──────────────────────────────────────────────────────────────────
// NOTE: Nanti fetch dari API
const PRODUK_OPTIONS = [
  { nama: "Laptop Asus X415",        satuan: "Unit",  harga: 6500000 },
  { nama: "Printer Canon G2020",     satuan: "Unit",  harga: 1200000 },
  { nama: "Mouse Wireless Logitech", satuan: "Unit",  harga: 285000  },
  { nama: "Kertas HVS A4 80gr",      satuan: "Rim",   harga: 45000   },
  { nama: "Tinta Printer Hitam",     satuan: "Botol", harga: 85000   },
  { nama: "Keyboard Mechanical",     satuan: "Unit",  harga: 750000  },
  { nama: "Monitor LG 24\"",         satuan: "Unit",  harga: 2800000 },
];

const SATUAN_OPTIONS = [
  "Unit", "Pcs", "Box", "Rim", "Botol", "Pack", "Lusin", "Kg", "Liter", "Meter",
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface SalesOrderDetailFormProps {
  items: SalesOrderItem[];
  onChange: (items: SalesOrderItem[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SalesOrderDetailForm({ items, onChange }: SalesOrderDetailFormProps) {

  const updateItem = (id: string, patch: Partial<SalesOrderItem>) => {
    onChange(items.map((item) => {
      if (item.id !== id) return item;
      const u = { ...item, ...patch };
      return { ...u, subtotal: u.harga * u.qty * (1 - u.diskon / 100) };
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

  const addItem    = () => onChange([...items, newItem()]);
  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  const grandTotal = items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Detail Produk</h3>
        <button onClick={addItem}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs
                     font-semibold bg-navy-900 text-gold-400 hover:bg-navy-700 transition-colors">
          <Plus size={12} /> Tambah Baris
        </button>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs table-fixed min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[20%]">Produk</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[16%]">Deskripsi</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[8%]">Qty</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[11%]">Satuan</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[13%]">Harga</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[9%]">Diskon %</th>
                <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-[8%]">Taxable (PPN 11%)</th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[13%]">Subtotal</th>
                <th className="px-3 py-2.5 w-[4%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
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
                    <input type="text" value={item.deskripsi}
                      onChange={(e) => updateItem(item.id, { deskripsi: e.target.value })}
                      placeholder="Opsional..."
                      className={cn(inputCompact, "w-full")} />
                  </td>

                  {/* Qty */}
                  <td className="px-3 py-2">
                    <input type="number" min={1} value={item.qty}
                      onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                      className={cn(inputCompact, "w-full text-center")} />
                  </td>


                  {/* Satuan - dropdown */}
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
                    <input type="number" min={0} value={item.harga}
                      onChange={(e) => updateItem(item.id, { harga: Number(e.target.value) })}
                      className={cn(inputCompact, "w-full")} />
                  </td>

                  {/* Diskon */}
                  <td className="px-3 py-2">
                    <input type="number" min={0} max={100} value={item.diskon}
                      onChange={(e) => updateItem(item.id, { diskon: Number(e.target.value) })}
                      className={cn(inputCompact, "w-full text-center")} />
                  </td>

                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.taxable}
                      onChange={(e) =>
                        updateItem(item.id, { taxable: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  

                  {/* Subtotal */}
                  <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap text-right">
                    {formatRupiah(item.subtotal)}
                  </td>

                  {/* Hapus */}
                  <td className="px-2 py-2">
                    <button onClick={() => removeItem(item.id)} disabled={items.length === 1}
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
    </div>
  );
}

// ─── ProductSearchField ───────────────────────────────────────────────────────
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

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
        width: Math.max(rect.width, 240),
        zIndex: 9999,
      });
    }
  };

  const handleFocus = () => { updateDropdownPosition(); setOpen(true); };

  const handleSelect = (nama: string) => {
    onChange(nama);
    setQuery(nama);
    setOpen(false);
  };

  const handleChange = (v: string) => {
    setQuery(v);
    if (!open) { updateDropdownPosition(); setOpen(true); }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text" value={query} placeholder={placeholder}
          onFocus={handleFocus}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white",
            "text-slate-700 placeholder-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all"
          )}
        />
      </div>

      {open && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }}
            onClick={() => { setOpen(false); setQuery(value); }} />
          <div style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">Produk tidak ditemukan</div>
            ) : filtered.map((opt) => (
              <button key={opt.nama} type="button" onClick={() => handleSelect(opt.nama)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-3",
                  opt.nama === value ? "bg-navy-900 text-gold-400 font-semibold" : "text-slate-600 hover:bg-slate-50"
                )}>
                <span className="truncate">{opt.nama}</span>
                <span className={cn("text-[10px] shrink-0 font-mono", opt.nama === value ? "text-gold-400/80" : "text-slate-400")}>
                  {formatRupiah(opt.harga)}
                </span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
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
                )}>
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