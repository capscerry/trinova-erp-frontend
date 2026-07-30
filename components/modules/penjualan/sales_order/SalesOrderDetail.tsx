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
import { productDropdownService, type Product } from "@/lib/services/penjualan.service";
import { getWarehouses, type Warehouse } from "@/lib/services/warehouse.service";
import { ProductStockInfo } from "../ProductStockInfo";
import { CurrencyInput } from "../CurrencyInput";

const SATUAN_OPTIONS_FALLBACK = [
  "Unit", "Pcs", "Box", "Rim", "Botol", "Pack", "Lusin", "Kg", "Liter", "Meter",
];

interface SalesOrderDetailFormProps {
  items: SalesOrderItem[];
  kenaPajak?: boolean;
  onChange: (items: SalesOrderItem[]) => void;
}

export function SalesOrderDetailForm({
  items,
  kenaPajak = false,
  onChange,
}: SalesOrderDetailFormProps) {
  const [produkOptions, setProdukOptions] = useState<Product[]>([]);
  const [loadingProduk, setLoadingProduk] = useState(false);

  // ── Gudang (stok tersedia ditampilkan per gudang yang dipilih) ────
  const [warehouseOptions, setWarehouseOptions] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProduk(true);
        const data = await productDropdownService.getAll();
        setProdukOptions(data);
      } catch (err) {
        console.error("Gagal memuat data produk:", err);
      } finally {
        setLoadingProduk(false);
      }
    };
    load();

    const loadWarehouses = async () => {
      try {
        setLoadingWarehouses(true);
        const data = await getWarehouses();
        setWarehouseOptions(data ?? []);
      } catch (err) {
        console.error("Gagal memuat data gudang:", err);
        setWarehouseOptions([]);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    loadWarehouses();
  }, []);

  // Derive satuan unik dari produkOptions (data API) — sama pola dengan
  // SalesQuotationModal. Pakai daftar fallback statis hanya kalau API
  // belum selesai loading / kosong, supaya dropdown tidak benar-benar
  // kosong tanpa pilihan apapun.
  const satuanOptions = produkOptions.length > 0
    ? [...new Set(produkOptions.map((p) => p.satuan).filter(Boolean))].sort()
    : SATUAN_OPTIONS_FALLBACK;

  const updateItem = (id: string, patch: Partial<SalesOrderItem>) => {
    onChange(items.map((item) => {
      if (item.id !== id) return item;
      const u = { ...item, ...patch };
      return { ...u, subtotal: u.harga * u.qty * (1 - u.diskon / 100) };
    }));
  };

  // Pilih gudang untuk satu baris produk — murni menyimpan pilihan,
  // tidak ada pengecekan stok.
  const selectWarehouse = (id: string, warehouseId: number, warehouseName: string) => {
    updateItem(id, { warehouseId, warehouseName });
  };

  // ← fix: simpan productId, productCode, productName sekaligus
  const selectProduk = (id: string, produkNama: string) => {
    const found = produkOptions.find((p) => p.nama === produkNama);
    if (found) {
      updateItem(id, {
        productId: found.id,
        productCode: found.kode,
        productName: found.nama,
        satuan: found.satuan,
        uomId: found.uomId,
      });
    } else {
      updateItem(id, { productName: produkNama });
    }
  };

  const addItem    = () => onChange([...items, newItem()]);
  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  // Definisi konsisten dengan SQ:
  //   subtotal      = Σ (harga × qty)            — SEBELUM diskon & pajak
  //   discountTotal = Σ (harga × qty × diskon%)   — total potongan diskon
  //   taxableBase   = subtotal − discountTotal    — dasar pengenaan pajak
  //   taxAmount     = taxableBase × 11%           — hanya jika kenaPajak (header)
  //   grandTotal    = taxableBase + taxAmount     — PPN selalu otomatis masuk ke Total
  const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0);
  const discountTotal = items.reduce(
    (s, i) => s + i.harga * i.qty * (i.diskon / 100),
    0
  );
  const taxableBase = subtotal - discountTotal;
  const taxAmount = kenaPajak ? taxableBase * 0.11 : 0;
  const grandTotal = taxableBase + taxAmount;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Detail Produk</h3>
        <button onClick={addItem}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs
                     font-semibold bg-navy-900 text-gold-400 hover:bg-navy-700 transition-colors">
          <Plus size={12} /> Tambah Baris
        </button>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs table-fixed min-w-[1180px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[15%]">Produk</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[8%]">Deskripsi</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[6%]">Qty</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[8%]">Satuan</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[12%]">Gudang</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[12%]">Stok di Gudang</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[13%]">Harga Satuan</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[7%]">Diskon %</th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[15%]">Subtotal</th>
                <th className="px-3 py-2.5 w-[4%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50">

                  {/* Produk */}
                  <td className="px-3 py-2">
                    <ProductSearchField
                      value={item.productName ?? ""}  // ← fix: pakai productName
                      placeholder={loadingProduk ? "Memuat..." : "Cari produk..."}
                      options={produkOptions}
                      disabled={loadingProduk}
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

                  {/* Satuan */}
                  <td className="px-3 py-2">
                    <SelectField
                      value={item.satuan}
                      placeholder="Pilih..."
                      options={satuanOptions}
                      onChange={(v) => updateItem(item.id, { satuan: v })}
                      compact
                    />
                  </td>

                  {/* Gudang */}
                  <td className="px-3 py-2">
                    <SelectField
                      value={item.warehouseName ?? ""}
                      placeholder={loadingWarehouses ? "Memuat..." : "Pilih gudang..."}
                      options={warehouseOptions.map((w) => w.warehouse_name)}
                      onChange={(v) => {
                        const found = warehouseOptions.find((w) => w.warehouse_name === v);
                        if (found) selectWarehouse(item.id, found.warehouse_id, found.warehouse_name);
                      }}
                      compact
                    />
                  </td>

                  {/* Stok di gudang terpilih (fallback: total semua gudang sebelum gudang dipilih) */}
                  <td className="px-3 py-2">
                    <ProductStockInfo
                      productId={item.productId}
                      warehouseId={item.warehouseId}
                      warehouseName={item.warehouseName}
                      requestedQty={item.qty}
                      compact
                    />
                  </td>

                  {/* Harga */}
                  <td className="px-3 py-2">
                    <CurrencyInput
                      value={item.harga}
                      onChange={(v) => updateItem(item.id, { harga: v })}
                      compact
                    />
                  </td>

                  {/* Diskon */}
                  <td className="px-3 py-2">
                    <input type="number" min={0} max={100} value={item.diskon}
                      onChange={(e) => updateItem(item.id, { diskon: Number(e.target.value) })}
                      className={cn(inputCompact, "w-full text-center")} />
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
          {kenaPajak && (
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
    </div>
  );
}

// ─── ProductSearchField ───────────────────────────────────────────────────────
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

  const handleFocus = () => { if (!disabled) { updateDropdownPosition(); setOpen(true); } };
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
