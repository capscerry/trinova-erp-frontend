"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  Search, Plus, RefreshCw, Download, Printer,
  ChevronDown, SlidersHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SalesQuotationModal,
  type SalesQuotationFormData,
} from "@/components/modules/penjualan/SalesQuotationModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SalesQuotation {
  id: string;
  nomor: string;
  tanggal: string;
  pelanggan: string;
  dipesanOleh: string;
  keterangan: string;
  status: "Draft" | "Dikirim" | "Disetujui" | "Ditolak" | "Kadaluarsa";
  sudahDicetak: boolean;
  total: number;
}

// ─── API Config ───────────────────────────────────────────────────────────────
const API_BASE      = "https://localhost:7283/api";
const API_QUOTATION = `${API_BASE}/SalesQuotation`;

// ─── Dummy ID Mapping ─────────────────────────────────────────────────────────
const PRODUCT_ID_MAP: Record<string, number> = {
  "Laptop Asus X415": 1, "Printer Canon G2020": 2, "Mouse Wireless Logitech": 3,
  "Kertas HVS A4 80gr": 4, "Tinta Printer Hitam": 5, "Keyboard Mechanical": 6,
  'Monitor LG 24"': 7,
};
const UOM_ID_MAP: Record<string, number> = {
  "Unit": 1, "Pcs": 2, "Box": 3, "Rim": 4, "Botol": 5,
  "Pack": 6, "Lusin": 7, "Kg": 8, "Liter": 9, "Meter": 10,
};

const STATUS_OPTIONS  = ["Semua", "Draft", "Dikirim", "Disetujui", "Ditolak", "Kadaluarsa"];
const DIPESAN_OPTIONS = ["Semua", "Ahmad Rizky", "Budi Santoso", "Citra Dewi"];
const CETAK_OPTIONS   = ["Semua", "Sudah", "Belum"];
const PAGE_SIZE       = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(d));
}

// ─── API: Fetch List ──────────────────────────────────────────────────────────
async function fetchQuotationList(): Promise<SalesQuotation[]> {
  const res = await fetch(API_QUOTATION);
  if (!res.ok) throw new Error(`Gagal mengambil data (${res.status})`);

  const json = await res.json();

  // Sesuaikan field-name dengan response backend kamu
  return (json.data ?? json ?? []).map((item: any): SalesQuotation => ({
    id:          String(item.quotationId   ?? item.id ?? ""),
    nomor:       item.quotationNumber      ?? item.nomor        ?? "-",
    tanggal:     item.quotationDate        ?? item.tanggal      ?? "",
    pelanggan:   item.customerName         ?? item.pelanggan    ?? "-",
    dipesanOleh: item.requestedBy          ?? item.dipesanOleh  ?? "-",
    keterangan:  item.notes                ?? item.keterangan   ?? "",
    status:      item.status               ?? "Draft",
    sudahDicetak: item.isPrinted           ?? item.sudahDicetak ?? false,
    total:       item.subTotal             ?? item.total        ?? 0,
  }));
}

// ─── API: Submit ──────────────────────────────────────────────────────────────
async function submitSalesQuotation(data: SalesQuotationFormData) {
  const subtotal      = data.items.reduce((s, i) => s + i.harga * i.qty, 0);
  const discountTotal = data.items.reduce((s, i) => s + i.harga * i.qty * (i.diskon / 100), 0);

  const payload = {
    CustomerId:        data.customerId ?? 0,
    QuotationNumber:   data.nomor,
    QuotationDate:     data.tanggal,
    Address:           data.address    || null,
    Notes:             data.keterangan || null,
    IsTaxable:         data.kenaPajak,
    IsTaxIncluded:     data.totalTermasukPajak,
    Subtotal:          subtotal,
    DiscountTotal:     discountTotal,
    Details: data.items.map((item) => {
      const lineGross      = item.harga * item.qty;
      const discountAmount = lineGross * (item.diskon / 100);
      return {
        ProductId:       PRODUCT_ID_MAP[item.produk] ?? 0,
        Quantity:        item.qty,
        UomId:           UOM_ID_MAP[item.satuan]  ?? 0,
        Price:           item.harga,
        DiscountPercent: item.diskon,
        DiscountAmount:  discountAmount,
      };
    }),
  };

  const res  = await fetch(API_QUOTATION, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false)
    throw new Error(json.message ?? `Gagal menyimpan quotation (${res.status})`);

  return json;
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────
function FilterDropdown({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const display = value === "Semua" ? label : `${label}: ${value}`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
          value !== "Semua"
            ? "bg-navy-900 text-gold-400 border-navy-700"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        )}
      >
        {display}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-slate-200
                          rounded-xl shadow-lg py-1 min-w-[140px] overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt}
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
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SalesQuotationPage() {
  const [data, setData]               = useState<SalesQuotation[]>([]);
  const [loading, setLoading]         = useState(false);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  const [search, setSearch]                   = useState("");
  const [page, setPage]                       = useState(1);
  const [filterStatus, setFilterStatus]       = useState("Semua");
  const [filterDipesan, setFilterDipesan]     = useState("Semua");
  const [filterCetak, setFilterCetak]         = useState("Semua");
  const [filterTanggal, setFilterTanggal]     = useState("Semua");
  const [modalOpen, setModalOpen]             = useState(false);
  const [submitting, setSubmitting]           = useState(false);

  // ── Fetch on mount ──────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const rows = await fetchQuotationList();
      setData(rows);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Filtering ────────────────────────────────────────
  const filtered = useMemo(() => {
    return data.filter((row) => {
      const matchSearch  = search === "" || [row.nomor, row.pelanggan, row.keterangan]
        .some((v) => v.toLowerCase().includes(search.toLowerCase()));
      const matchStatus  = filterStatus  === "Semua" || row.status === filterStatus;
      const matchDipesan = filterDipesan === "Semua" || row.dipesanOleh === filterDipesan;
      const matchCetak   = filterCetak   === "Semua"
        || (filterCetak === "Sudah" && row.sudahDicetak)
        || (filterCetak === "Belum" && !row.sudahDicetak);
      return matchSearch && matchStatus && matchDipesan && matchCetak;
    });
  }, [data, search, filterStatus, filterDipesan, filterCetak]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from       = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to         = Math.min(page * PAGE_SIZE, filtered.length);

  const resetFilters = () => {
    setFilterStatus("Semua"); setFilterDipesan("Semua");
    setFilterCetak("Semua");  setFilterTanggal("Semua");
    setSearch(""); setPage(1);
  };

  const hasActiveFilter =
    [filterStatus, filterDipesan, filterCetak, filterTanggal].some(f => f !== "Semua") || search !== "";

  const pageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3)               return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2)  return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  // ── Submit handler ────────────────────────────────────
  const handleSubmitQuotation = async (formData: SalesQuotationFormData) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitSalesQuotation(formData);
      setModalOpen(false);
      loadData(); // refresh list setelah tambah
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Table columns (Status disembunyikan) ──────────────
  const TABLE_COLS = [
    { label: "Nomor #",    w: "150px" },
    { label: "Tanggal",    w: "120px" },
    { label: "Pelanggan",  w: ""      },
    { label: "Keterangan", w: ""      },
    // { label: "Status",  w: "120px" },   // ← hidden for now
    { label: "Total",      w: "150px" },
    { label: "Aksi",       w: "140px" },
  ];

  return (
    <AppShell title="Sales Quotation" subtitle="Kelola penawaran penjualan">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* ── Filter Bar ──────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex-wrap">
          <FilterDropdown label="Tanggal"      value={filterTanggal} options={["Semua","Hari ini","Minggu ini","Bulan ini"]} onChange={(v)=>{ setFilterTanggal(v); setPage(1); }} />
          <FilterDropdown label="Dipesan oleh" value={filterDipesan} options={DIPESAN_OPTIONS} onChange={(v)=>{ setFilterDipesan(v); setPage(1); }} />
          <FilterDropdown label="Status"       value={filterStatus}  options={STATUS_OPTIONS}  onChange={(v)=>{ setFilterStatus(v);  setPage(1); }} />
          <FilterDropdown label="Sudah dicetak" value={filterCetak}  options={CETAK_OPTIONS}   onChange={(v)=>{ setFilterCetak(v);   setPage(1); }} />

          {hasActiveFilter && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs
                         font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
              <SlidersHorizontal size={12} /> Reset
            </button>
          )}
        </div>

        {/* ── Toolbar ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700
                         text-gold-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
              <Plus size={13} strokeWidth={2.5} /> Tambah
            </button>
            <button onClick={loadData} disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border
                         border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={cn(loading && "animate-spin")} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold
                               text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Download size={13} /> Export <ChevronDown size={11} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border
                               border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
              <Printer size={13} />
            </button>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg
                           text-slate-700 placeholder-slate-400 w-48
                           focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all" />
            </div>
            <div className="min-w-[36px] h-8 px-2 flex items-center justify-center rounded-lg
                            border border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
              {filtered.length}
            </div>
          </div>
        </div>

        {/* ── Error Banner ─────────────────────────────── */}
        {fetchError && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200
                          text-xs text-red-600 font-medium flex items-center justify-between">
            <span>⚠️ {fetchError}</span>
            <button onClick={loadData} className="underline hover:no-underline">Coba lagi</button>
          </div>
        )}

        {/* ── Table ───────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {TABLE_COLS.map(({ label, w }) => (
                  <th key={label} style={w ? { width: w } : undefined}
                    className="px-5 py-2.5 text-left text-[11px] font-bold uppercase
                               tracking-wider text-slate-500 whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Loading skeleton */}
              {loading && data.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {TABLE_COLS.map((c) => (
                      <td key={c.label} className="px-5 py-3">
                        <div className="h-4 rounded bg-slate-100 animate-pulse" style={{ width: c.w || "100%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLS.length} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={28} className="text-slate-300" />
                      <span className="text-sm">Belum ada data</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3 font-mono font-semibold text-[12px] text-navy-700">
                      {row.nomor}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-600 whitespace-nowrap">
                      {row.tanggal ? formatDate(row.tanggal) : "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-700 font-medium">
                      {row.pelanggan}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                      {row.keterangan || <span className="italic">—</span>}
                    </td>
                    {/* Status column hidden */}
                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-700 whitespace-nowrap">
                      {formatRupiah(row.total)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button className="px-2.5 py-1.5 rounded-md text-xs font-semibold
                                           bg-slate-100 text-navy-700 hover:bg-slate-200 transition-colors">
                          Detail
                        </button>
                        <button className="px-2.5 py-1.5 rounded-md text-xs font-semibold
                                           bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                          Edit
                        </button>
                        <button className="px-2.5 py-1.5 rounded-md text-xs font-semibold
                                           bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
          <span className="text-xs text-slate-400">
            {filtered.length === 0 ? "Tidak ada data" : `${from}–${to} dari ${filtered.length} data`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md
                         text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ChevronLeft size={13} />
            </button>
            {pageNumbers().map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn(
                  "w-7 h-7 rounded-md text-xs font-semibold transition-all",
                  page === p ? "bg-navy-900 text-gold-400 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                )}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-md
                         text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <SalesQuotationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmitQuotation}
          submitting={submitting}
        />
      </div>
    </AppShell>
  );
}