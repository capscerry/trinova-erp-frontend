"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
// import { ActionBtn } from "@/components/ui/DataTable";
import {
  Search, Plus, RefreshCw, Download, Printer,
  ChevronDown, SlidersHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SalesQuotationModal } from "@/components/modules/penjualan/SalesQuotationModal";

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

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const INITIAL_DATA: SalesQuotation[] = [
  { id: "1", nomor: "SQ-2026-001", tanggal: "2026-03-01", pelanggan: "PT Maju Bersama",  dipesanOleh: "Ahmad Rizky",  keterangan: "Penawaran produk elektronik Q1", status: "Disetujui",  sudahDicetak: true,  total: 15000000 },
  { id: "2", nomor: "SQ-2026-002", tanggal: "2026-03-05", pelanggan: "CV Sinar Terang",  dipesanOleh: "Budi Santoso", keterangan: "Penawaran ATK bulanan",           status: "Dikirim",    sudahDicetak: true,  total: 3200000  },
  { id: "3", nomor: "SQ-2026-003", tanggal: "2026-03-08", pelanggan: "Toko Berkah Jaya", dipesanOleh: "Ahmad Rizky",  keterangan: "",                                status: "Draft",      sudahDicetak: false, total: 7500000  },
  { id: "4", nomor: "SQ-2026-004", tanggal: "2026-03-10", pelanggan: "PT Karya Mandiri", dipesanOleh: "Citra Dewi",   keterangan: "Penawaran laptop dan aksesoris",   status: "Ditolak",    sudahDicetak: false, total: 42000000 },
  { id: "5", nomor: "SQ-2026-005", tanggal: "2026-03-12", pelanggan: "UD Sejahtera",     dipesanOleh: "Budi Santoso", keterangan: "Penawaran printer dan tinta",      status: "Disetujui",  sudahDicetak: true,  total: 8900000  },
  { id: "6", nomor: "SQ-2026-006", tanggal: "2026-03-15", pelanggan: "CV Mitra Usaha",   dipesanOleh: "Citra Dewi",   keterangan: "",                                status: "Draft",      sudahDicetak: false, total: 5100000  },
  { id: "7", nomor: "SQ-2026-007", tanggal: "2026-02-20", pelanggan: "PT Global Niaga",  dipesanOleh: "Ahmad Rizky",  keterangan: "Penawaran server dan jaringan",    status: "Kadaluarsa", sudahDicetak: true,  total: 98000000 },
];

const STATUS_OPTIONS = ["Semua", "Draft", "Dikirim", "Disetujui", "Ditolak", "Kadaluarsa"];
const DIPESAN_OPTIONS = ["Semua", "Ahmad Rizky", "Budi Santoso", "Citra Dewi"];
const CETAK_OPTIONS   = ["Semua", "Sudah", "Belum"];
const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
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
  const [data] = useState<SalesQuotation[]>(INITIAL_DATA);
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [filterStatus, setFilterStatus]     = useState("Semua");
  const [filterDipesan, setFilterDipesan]   = useState("Semua");
  const [filterCetak, setFilterCetak]       = useState("Semua");
  const [filterTanggal, setFilterTanggal]   = useState("Semua");
  const [modalOpen, setModalOpen] = useState(false);

  // ── Filtering ───────────────────────────────────────
  const filtered = useMemo(() => {
    return data.filter((row) => {
      const matchSearch = search === "" || [row.nomor, row.pelanggan, row.keterangan]
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
    setFilterCetak("Semua"); setFilterTanggal("Semua");
    setSearch(""); setPage(1);
  };

  const hasActiveFilter = [filterStatus, filterDipesan, filterCetak, filterTanggal].some(f => f !== "Semua") || search !== "";

  const pageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <AppShell title="Sales Quotation" subtitle="Kelola penawaran penjualan">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* ── Filter Bar ──────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex-wrap">
          <FilterDropdown
            label="Tanggal"
            value={filterTanggal}
            options={["Semua", "Hari ini", "Minggu ini", "Bulan ini"]}
            onChange={(v) => { setFilterTanggal(v); setPage(1); }}
          />
          <FilterDropdown
            label="Dipesan oleh"
            value={filterDipesan}
            options={DIPESAN_OPTIONS}
            onChange={(v) => { setFilterDipesan(v); setPage(1); }}
          />
          <FilterDropdown
            label="Status"
            value={filterStatus}
            options={STATUS_OPTIONS}
            onChange={(v) => { setFilterStatus(v); setPage(1); }}
          />
          <FilterDropdown
            label="Sudah dicetak"
            value={filterCetak}
            options={CETAK_OPTIONS}
            onChange={(v) => { setFilterCetak(v); setPage(1); }}
          />

          {/* Reset filter */}
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs
                         font-semibold text-red-600 bg-red-50 border border-red-200
                         hover:bg-red-100 transition-colors"
            >
              <SlidersHorizontal size={12} /> Reset
            </button>
          )}
        </div>

        {/* ── Toolbar ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          {/* Left: Tambah + Refresh */}
          <div className="flex items-center gap-2">
            <button
                onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700
                         text-gold-400 text-xs font-semibold px-4 py-2 rounded-lg
                         transition-colors shadow-sm"
            >
              <Plus size={13} strokeWidth={2.5}
               /> Tambah
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg border
                         border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Right: Export + Print + Search + Count */}
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold
                               text-slate-600 bg-white border border-slate-200 rounded-lg
                               hover:bg-slate-50 transition-colors">
              <Download size={13} /> Export <ChevronDown size={11} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border
                               border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
              <Printer size={13} />
            </button>

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg
                           text-slate-700 placeholder-slate-400 w-48
                           focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
                           transition-all"
              />
            </div>

            {/* Total count */}
            <div className="min-w-[36px] h-8 px-2 flex items-center justify-center rounded-lg
                            border border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
              {filtered.length}
            </div>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  { label: "Nomor #",     w: "150px" },
                  { label: "Tanggal",     w: "120px" },
                  { label: "Pelanggan",   w: ""      },
                  { label: "Keterangan",  w: ""      },
                  { label: "Status",      w: "120px" },
                  { label: "Total",       w: "150px" },
                  { label: "Aksi",        w: "140px" },
                ].map(({ label, w }) => (
                  <th
                    key={label}
                    style={w ? { width: w } : undefined}
                    className="px-5 py-2.5 text-left text-[11px] font-bold uppercase
                               tracking-wider text-slate-500 whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={28} className="text-slate-300" />
                      <span className="text-sm">Belum ada data</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Nomor */}
                    <td className="px-5 py-3 font-mono font-semibold text-[12px] text-navy-700">
                      {row.nomor}
                    </td>

                    {/* Tanggal */}
                    <td className="px-5 py-3 text-[13px] text-slate-600 whitespace-nowrap">
                      {formatDate(row.tanggal)}
                    </td>

                    {/* Pelanggan */}
                    <td className="px-5 py-3 text-[13px] text-slate-700 font-medium">
                      {row.pelanggan}
                    </td>

                    {/* Keterangan */}
                    <td className="px-5 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                      {row.keterangan || <span className="italic">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Total */}
                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-700 whitespace-nowrap">
                      {formatRupiah(row.total)}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1.5 justify-center">
                        <button
                            // onClick={() => handleDetail(row)}
                            className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                                    bg-slate-100 text-navy-700 hover:bg-slate-200 transition-colors"
                        >
                            Detail
                        </button>

                            {/* Edit */}
                        <button
                            // onClick={() => handleEdit(row)}
                            className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                                    bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                            Edit
                        </button>

                        {/* Hapus */}
                        <button
                            // onClick={() => handleHapus(row)}
                            className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                                    bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                        >
                            Hapus
                        </button>
                        </div>
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md
                         text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            {pageNumbers().map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-7 h-7 rounded-md text-xs font-semibold transition-all",
                  page === p ? "bg-navy-900 text-gold-400 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-md
                         text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
        <SalesQuotationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => {
            // tambah ke list / call API
            console.log(data);
        }}
        />

      </div>
      
    </AppShell>
  );
}