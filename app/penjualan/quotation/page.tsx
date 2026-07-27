"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Printer,
  ChevronDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SalesQuotation,
  type SalesQuotationFormData,
  type QuotationStatus,
  salesQuotationService,
} from "@/lib/services/penjualan.service";
import { SalesQuotationModal } from "@/components/modules/penjualan/SalesQuotationModal";
import { SalesStatusSelect } from "@/components/modules/penjualan/SalesStatusSelect";
import { SALES_STATUS_OPTIONS } from "@/lib/sales-status";

const PAGE_SIZE = 10;

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = value === "All" ? label : `${label}: ${value}`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
          value !== "All"
            ? "bg-navy-900 text-gold-400 border-navy-700"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        )}
      >
        {display}
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-slate-200
                       rounded-xl shadow-lg py-1 min-w-[140px] overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
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

export default function SalesQuotationPage() {
  const router = useRouter();
  const [data, setData] = useState<SalesQuotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const rows = await salesQuotationService.getAll();
      setData(rows);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const keyword = search.toLowerCase();
      const rowDate = toDateOnly(row.tanggal);

      const matchSearch =
        search === "" ||
        [row.nomor, row.pelanggan, row.keterangan].some((v) =>
          (v ?? "").toLowerCase().includes(keyword)
        );

      const matchDateFrom = !dateFrom || (rowDate !== "" && rowDate >= dateFrom);
      const matchDateTo = !dateTo || (rowDate !== "" && rowDate <= dateTo);
      const matchStatus =
        statusFilter === "All" ||
        (row.status ?? "").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchDateFrom && matchDateTo && matchStatus;
    });
  }, [data, dateFrom, dateTo, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("All");
    setSearch("");
    setPage(1);
  };

  const hasActiveFilter = dateFrom !== "" || dateTo !== "" || statusFilter !== "All" || search !== "";

  const pageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 3) return [1, 2, 3, 4, 5];

    if (page >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  const handleSubmitQuotation = async (formData: SalesQuotationFormData) => {
    if (submitting) return;

    setSubmitting(true);

    try {
      // grossAmount = Σ (harga × qty) — SEBELUM diskon, hanya dipakai
      // internal untuk menghitung discountTotal, TIDAK dikirim ke backend.
      const grossAmount = formData.items.reduce(
        (s, i) => s + i.harga * i.qty,
        0
      );

      const discountTotal = formData.items.reduce(
        (s, i) => s + i.harga * i.qty * (i.diskon / 100),
        0
      );

      // taxableBase = setelah diskon, sebelum pajak
      const taxableBase = grossAmount - discountTotal;
      const taxTotal = formData.kenaPajak ? taxableBase * 0.11 : 0;

      // Sesuai keputusan: field `Subtotal` di backend berfungsi sebagai
      // GRAND TOTAL (harga bersih final) — bukan subtotal sebelum diskon.
      // subtotal = taxableBase + taxTotal (selalu, tidak bergantung pada
      // totalTermasukPajak — itu hanya flag info untuk laporan/cetak).
      const subtotal = taxableBase + taxTotal;

      const payload = {
        customerId: formData.customerId ?? 0,
        quotationNumber: formData.nomor,
        quotationDate: formData.tanggal,
        address: formData.address || "",
        notes: formData.keterangan || "",
        isTaxAble: formData.kenaPajak,
        isTaxIncluded: formData.kenaPajak,
        subtotal,
        discountTotal,
        taxTotal,
        details: formData.items.map((item) => {
          const lineGross = item.harga * item.qty;
          const discountAmount = lineGross * (item.diskon / 100);

          // CATATAN: Backend punya field TaxPercent/TaxAmount per baris
          // (SalesQuotationDetail), tapi SENGAJA tidak diisi di sini.
          // Pajak saat ini dihitung & disimpan di level header saja
          // (lihat taxTotal di atas). Jangan tambahkan taxPercent/taxAmount
          // ke object di bawah sampai ada keputusan untuk pajak per-item.
          return {
            productId: item.productId ?? 0,
            quantity: item.qty,
            uomId: item.uomId ?? 0,
            price: item.harga,
            discountPercent: item.diskon,
            discountAmount,
          };
        }),
      };

      await salesQuotationService.create(payload);
      setModalOpen(false);
      loadData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to save data"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const TABLE_COLS = [
    { label: "Number #", w: "150px" },
    { label: "Date", w: "120px" },
    { label: "Customer", w: "" },
    { label: "Notes", w: "" },
    { label: "Total", w: "150px" },
    { label: "Status", w: "150px" },
    { label: "Actions", w: "90px" },
  ];

  const handleDetail = (row: SalesQuotation) => {
    router.push(`/penjualan/quotation/${row.id}`);
  };

  return (
    <AppShell title="Sales Quotation" subtitle="Manage customer sales quotations">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex-wrap">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-navy-500"
            aria-label="Date from"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-navy-500"
            aria-label="Date to"
          />

          <FilterDropdown
            label="Status"
            value={statusFilter}
            options={["All", ...SALES_STATUS_OPTIONS.quotation]}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          />

          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs
                         font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <SlidersHorizontal size={12} /> Reset
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700
                         text-gold-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={13} strokeWidth={2.5} /> Add
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border
                         border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={cn(loading && "animate-spin")}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* <button
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold
                         text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download size={13} /> Export <ChevronDown size={11} />
            </button>

            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg border
                         border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Printer size={13} />
            </button> */}

            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg
                           text-slate-700 placeholder-slate-400 w-48
                           focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all"
              />
            </div>

            <div
              className="min-w-[36px] h-8 px-2 flex items-center justify-center rounded-lg
                         border border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50"
            >
              {filtered.length}
            </div>
          </div>
        </div>

        {fetchError && (
          <div
            className="mx-5 mt-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200
                       text-xs text-red-600 font-medium flex items-center justify-between"
          >
            <span>⚠️ {fetchError}</span>
            <button onClick={loadData} className="underline hover:no-underline">
              Try again
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {TABLE_COLS.map(({ label, w }) => (
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
              {loading && data.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {TABLE_COLS.map((c) => (
                      <td key={c.label} className="px-5 py-3">
                        <div
                          className="h-4 rounded bg-slate-100 animate-pulse"
                          style={{ width: c.w || "100%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COLS.length}
                    className="py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={28} className="text-slate-300" />
                      <span className="text-sm">No data yet</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
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

                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-700 whitespace-nowrap">
                      {formatRupiah(row.total)}
                    </td>

                    <td className="px-5 py-3">
                      <SalesStatusSelect<QuotationStatus>
                        module="quotation"
                        id={row.id}
                        value={row.status}
                        onUpdated={(status) =>
                          setData((current) =>
                            current.map((item) =>
                              item.id === row.id ? { ...item, status } : item
                            )
                          )
                        }
                      />
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleDetail(row)}
                          title="View detail"
                          className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100
                                     transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
          <span className="text-xs text-slate-400">
            {filtered.length === 0
              ? "Tidak ada data"
              : `${from}–${to} dari ${filtered.length} data`}
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
                  page === p
                    ? "bg-navy-900 text-gold-400 shadow-sm"
                    : "text-slate-500 hover:bg-slate-200"
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
          onSubmit={handleSubmitQuotation}
          submitting={submitting}
        />
      </div>
    </AppShell>
  );
}

function toDateOnly(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}
