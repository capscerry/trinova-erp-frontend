"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import { type SalesOrderFormData } from "@/components/modules/penjualan/SalesOrderModal";
import {
  WorkflowDraftProvider,
  useWorkflowDraft,
  type WorkflowDraft,
} from "@/lib/WorkflowDraftContext";
import { TransactionOrchestrator } from "@/components/modules/penjualan/workflow/TransactionOrchestrator";
import { WorkflowToolbar } from "@/components/modules/penjualan/workflow/WorkflowToolbar";
import {
  Search, Plus, RefreshCw, Download,
  Printer, ChevronDown, SlidersHorizontal,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Type ─────────────────────────────────────────────────────────────────────
interface SalesOrder {
  id: string;
  nomor: string;
  tanggal: string;
  tanggalKirim: string;
  pelanggan: string;
  salesQuotation: string;
  dipesanOleh: string;
  alamatPengiriman: string;
  keterangan: string;
  status: "Draft" | "Dikonfirmasi" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan";
  total: number;
  items: SalesOrderFormData["items"];
}

// ─── Konstanta ────────────────────────────────────────────────────────────────
const INITIAL_DATA: SalesOrder[] = [];
const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

// ─── FilterDropdown ───────────────────────────────────────────────────────────
function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((p) => !p)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
          value !== "Semua"
            ? "bg-navy-900 text-gold-400 border-navy-700"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        )}>
        {value === "Semua" ? label : `${label}: ${value}`}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-slate-200
                          rounded-xl shadow-lg py-1 min-w-[160px] max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
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

// ─── Page (outer) — pasang Provider di sini ───────────────────────────────────
export default function SalesOrderPage() {
  /**
   * commitToDatabase — implementasi commit semua draft.
   *
   * IDEAL: backend punya 1 endpoint yang nerima semua bagian dan jalankan
   *        transaction (BEGIN ... COMMIT) di server.
   *
   * SEMENTARA (kalau backend belum siap): call bertahap di sini. Pastikan
   * urutannya benar dan link FK antar dokumen-nya disetel.
   */
  const commitToDatabase = async (draft: WorkflowDraft) => {
    // ── OPSI A: 1 endpoint atomic (RECOMMENDED) ─────────────────────────
    // await api.post("/penjualan/workflow/commit", draft);

    // ── OPSI B: sequential calls (sementara) ────────────────────────────
    // let salesOrderId: string | undefined;
    // if (draft.salesOrder) {
    //   const payload = mapSalesOrderToPayload(draft.salesOrder);
    //   await salesOrderService.create(payload);
    //   salesOrderId = String(payload.header.id);
    // }
    // if (draft.uangMuka) {
    //   await uangMukaService.create({ ...draft.uangMuka, salesOrderId });
    // }
    // if (draft.pengiriman) {
    //   await pengirimanService.create({ ...draft.pengiriman, salesOrderId });
    // }

    // Untuk sekarang, log saja agar bisa dites:
    console.log("[commitToDatabase] draft yang akan disimpan:", draft);
    await new Promise((r) => setTimeout(r, 600)); // simulate latency
  };

  return (
    <WorkflowDraftProvider onCommit={commitToDatabase}>
      <SalesOrderPageInner />
      <TransactionOrchestrator />
    </WorkflowDraftProvider>
  );
}

// ─── Page (inner) — bisa pakai useWorkflowDraft di sini ──────────────────────
function SalesOrderPageInner() {
  const { openModal } = useWorkflowDraft();

  const [data]                     = useState<SalesOrder[]>(INITIAL_DATA);
  const [search, setSearch]        = useState("");
  const [page, setPage]            = useState(1);

  const [fTanggal,   setFTanggal]   = useState("Semua");
  const [fStatus,    setFStatus]    = useState("Semua");
  const [fPelanggan, setFPelanggan] = useState("Semua");
  const [fDipesan,   setFDipesan]   = useState("Semua");

  const pelangganOpts = ["Semua", ...Array.from(new Set(data.map((d) => d.pelanggan)))];
  const dipesanOpts   = ["Semua", ...Array.from(new Set(data.map((d) => d.dipesanOleh)))];
  const statusOpts    = ["Semua", "Draft", "Dikonfirmasi", "Diproses", "Dikirim", "Selesai", "Dibatalkan"];

  const filtered = useMemo(() => data.filter((row) => {
    const matchSearch    = search === "" || [row.nomor, row.pelanggan, row.keterangan].some((v) => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus    = fStatus    === "Semua" || row.status    === fStatus;
    const matchPelanggan = fPelanggan === "Semua" || row.pelanggan === fPelanggan;
    const matchDipesan   = fDipesan   === "Semua" || row.dipesanOleh === fDipesan;
    return matchSearch && matchStatus && matchPelanggan && matchDipesan;
  }), [data, search, fStatus, fPelanggan, fDipesan]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from       = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to         = Math.min(page * PAGE_SIZE, filtered.length);
  const hasFilter  = [fTanggal, fStatus, fPelanggan, fDipesan].some((f) => f !== "Semua") || search !== "";

  const resetFilters = () => {
    setFTanggal("Semua"); setFStatus("Semua");
    setFPelanggan("Semua"); setFDipesan("Semua");
    setSearch(""); setPage(1);
  };

  const pageNums = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  // ► CHANGED: buka modal via orchestrator, BUKAN state lokal lagi
  const handleTambah = () => openModal("salesOrder");

  return (
    <AppShell title="Sales Order" subtitle="Kelola pesanan penjualan">

      {/* ► NEW: toolbar workflow (muncul otomatis kalau ada draft) */}
      <WorkflowToolbar />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex-wrap">
          <FilterDropdown label="Tanggal"      value={fTanggal}   options={["Semua", "Hari ini", "Minggu ini", "Bulan ini"]} onChange={(v) => { setFTanggal(v);   setPage(1); }} />
          <FilterDropdown label="Pelanggan"    value={fPelanggan} options={pelangganOpts} onChange={(v) => { setFPelanggan(v); setPage(1); }} />
          <FilterDropdown label="Status"       value={fStatus}    options={statusOpts}    onChange={(v) => { setFStatus(v);    setPage(1); }} />
          <FilterDropdown label="Dipesan Oleh" value={fDipesan}   options={dipesanOpts}   onChange={(v) => { setFDipesan(v);   setPage(1); }} />
          {hasFilter && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold
                         text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
              <SlidersHorizontal size={12} /> Reset
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={handleTambah}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700
                         text-gold-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
              <Plus size={13} strokeWidth={2.5} /> Tambah
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Download size={13} /> Export <ChevronDown size={11} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
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
            <div className="min-w-[36px] h-8 px-2 flex items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
              {filtered.length}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  { label: "Nomor SO",      w: "150px" },
                  { label: "Tanggal",       w: "120px" },
                  { label: "Pelanggan",     w: ""      },
                  { label: "Tanggal Kirim", w: "130px" },
                  { label: "Status",        w: "130px" },
                  { label: "Total",         w: "150px" },
                  { label: "Aksi",          w: "150px" },
                ].map(({ label, w }) => (
                  <th key={label} style={w ? { width: w } : undefined}
                    className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
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
              ) : paged.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-[12px] text-navy-700">{row.nomor}</td>
                  <td className="px-5 py-3 text-[13px] text-slate-600 whitespace-nowrap">{formatDate(row.tanggal)}</td>
                  <td className="px-5 py-3 text-[13px] text-slate-700 font-medium">{row.pelanggan}</td>
                  <td className="px-5 py-3 text-[13px] text-slate-600 whitespace-nowrap">{formatDate(row.tanggalKirim)}</td>
                  <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-slate-700 whitespace-nowrap">{formatRupiah(row.total)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans bg-slate-100 text-navy-700 hover:bg-slate-200 transition-colors">Detail</button>
                      <button className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">Edit</button>
                      <button className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans bg-red-50 text-red-700 hover:bg-red-100 transition-colors">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
          <span className="text-xs text-slate-400">
            {filtered.length === 0 ? "Tidak ada data" : `${from}–${to} dari ${filtered.length} data`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ChevronLeft size={13} />
            </button>
            {pageNums().map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={cn("w-7 h-7 rounded-md text-xs font-semibold transition-all",
                  page === p ? "bg-navy-900 text-gold-400 shadow-sm" : "text-slate-500 hover:bg-slate-200")}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/*
        Modal sudah di-render oleh <TransactionOrchestrator /> di parent (SalesOrderPage).
        Halaman ini tidak perlu render <SalesOrderModal /> lagi.
      */}
    </AppShell>
  );
}
