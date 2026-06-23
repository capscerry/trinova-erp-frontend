"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

type SortOrder = "newest" | "oldest" | "az" | "za" | "";

interface DataTableProps<T> {
  title: string;
  columns: Column<T>[];
  data: T[];
  addLabel?: string;
  onAdd?: () => void;
  /** Override row actions. Defaults to Detail / Edit / Hapus */
  renderActions?: (row: T) => React.ReactNode;
  keyField?: keyof T;
  className?: string;
  /**
   * The field name in the data object that holds a date string (ISO or locale).
   * When provided, "Terbaru" / "Terlama" sort options become active.
   */
  dateField?: keyof T;
  /**
   * The field name used for alphabetical A–Z / Z–A sorting.
   * Typically the supplier name, customer name, or item name field.
   */
  nameField?: keyof T;
  /**
   * List of possible status values to show in the Status filter dropdown.
   * When provided, a "Status" filter chip appears.
   */
  statusOptions?: string[];
  /**
   * The field name that holds the status value (defaults to "status").
   */
  statusField?: keyof T;
  /**
   * When true, shows a loading skeleton instead of the table body.
   */
  isLoading?: boolean;
}

const PAGE_SIZE = 10;

export function DataTable<T extends object>({
  title,
  columns,
  data,
  addLabel = "Tambah",
  onAdd,
  renderActions,
  keyField = "id" as keyof T,
  className,
  dateField,
  nameField,
  statusOptions,
  statusField = "status" as keyof T,
  isLoading = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ── Filter panel state ──────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    dateField ? "newest" : ""
  );
  const [statusFilter, setStatusFilter] = useState<string>(""); // "" = all
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  // Count active filters for badge
  const activeFilterCount =
    (statusFilter ? 1 : 0) +
    (sortOrder && sortOrder !== "newest" ? 1 : 0);

  // ── Clear all filters ────────────────────────────────────────────────────────
  function clearFilters() {
    setSortOrder(dateField ? "newest" : "");
    setStatusFilter("");
    setPage(1);
  }

  // ── Pipeline: search → status filter → sort ─────────────────────────────────
  let processed = data.filter((row) => {
    // text search
    const matchesSearch = columns.some((col) => {
      const val = row[col.key as keyof T];
      return typeof val === "string" && val.toLowerCase().includes(search.toLowerCase());
    });
    return matchesSearch;
  });

  // status filter
  if (statusFilter) {
    processed = processed.filter((row) => {
      const val = row[statusField];
      return String(val ?? "") === statusFilter;
    });
  }

  // sort
  if (sortOrder === "newest" || sortOrder === "oldest") {
    if (dateField) {
      processed = [...processed].sort((a, b) => {
        const da = new Date(String(a[dateField] ?? "")).getTime();
        const db = new Date(String(b[dateField] ?? "")).getTime();
        return sortOrder === "newest" ? db - da : da - db;
      });
    }
  } else if (sortOrder === "az" || sortOrder === "za") {
    if (nameField) {
      processed = [...processed].sort((a, b) => {
        const na = String(a[nameField] ?? "").toLowerCase();
        const nb = String(b[nameField] ?? "").toLowerCase();
        return sortOrder === "az"
          ? na.localeCompare(nb, "id")
          : nb.localeCompare(na, "id");
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paged = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Sort option helpers ──────────────────────────────────────────────────────
  const sortOptions: { value: SortOrder; label: string; available: boolean }[] = [
    { value: "newest", label: "Terbaru (Tgl Dibuat)", available: !!dateField },
    { value: "oldest", label: "Terlama (Tgl Dibuat)", available: !!dateField },
    { value: "az",     label: "A → Z",                available: !!nameField },
    { value: "za",     label: "Z → A",                available: !!nameField },
  ].filter((o) => o.available);

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-serif font-bold text-navy-900 text-[15px]">{title}</h2>
        {onAdd && (
          <Button variant="primary" size="sm" onClick={onAdd}>
            + {addLabel}
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 relative">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full font-serif"
          />
        </div>

        {/* Filter button */}
        <div ref={panelRef} className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold font-serif transition-colors",
              filterOpen || activeFilterCount > 0
                ? "bg-navy-900 text-white border-navy-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Filter size={13} />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-gold-400 text-navy-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {filterOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex flex-col gap-4">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-serif">
                  Filter &amp; Urutan
                </span>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Tutup filter"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Sort section */}
              {sortOptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-serif">
                    Urutkan
                  </span>
                  <div className="flex flex-col gap-1">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortOrder(opt.value); setPage(1); }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-serif text-left transition-colors",
                          sortOrder === opt.value
                            ? "bg-navy-900 text-white"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        {opt.label}
                        {sortOrder === opt.value && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status filter section */}
              {statusOptions && statusOptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-serif">
                    Status
                  </span>
                  <div className="flex flex-col gap-1">
                    {/* "Semua" option */}
                    <button
                      onClick={() => { setStatusFilter(""); setPage(1); }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-serif text-left transition-colors",
                        statusFilter === ""
                          ? "bg-navy-900 text-white"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      Semua Status
                      {statusFilter === "" && <Check size={13} />}
                    </button>
                    {statusOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-serif text-left transition-colors",
                          statusFilter === s
                            ? "bg-navy-900 text-white"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        {s}
                        {statusFilter === s && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear button */}
              {(statusFilter || (sortOrder && sortOrder !== "newest" && dateField) || (sortOrder && !dateField && sortOrder)) && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold font-serif text-left transition-colors"
                >
                  Hapus semua filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {(statusFilter || (sortOrder && sortOrder !== "newest")) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {sortOrder && sortOrder !== "newest" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold font-serif">
                {sortOrder === "oldest" ? "Terlama" : sortOrder === "az" ? "A → Z" : "Z → A"}
                <button
                  onClick={() => { setSortOrder(dateField ? "newest" : ""); setPage(1); }}
                  className="hover:text-rose-500 transition-colors ml-0.5"
                  aria-label="Hapus urutan"
                >
                  <X size={11} />
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold font-serif">
                {statusFilter}
                <button
                  onClick={() => { setStatusFilter(""); setPage(1); }}
                  className="hover:text-rose-500 transition-colors ml-0.5"
                  aria-label="Hapus filter status"
                >
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={col.width ? { width: col.width } : undefined}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 font-serif"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 font-serif">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-100 animate-pulse" />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="h-4 rounded bg-slate-100 animate-pulse w-24 mx-auto" />
                  </td>
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="text-center py-12 text-slate-400 text-sm font-serif"
                >
                  Tidak ada data ditemukan
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr
                  key={String(row[keyField]) ?? ri}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                >
                  {columns.map((col, ci) => {
                    const rawVal = row[col.key as keyof T];
                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          "px-4 py-3 text-sm text-slate-700 font-serif align-middle",
                          ci === 0 && "font-bold text-navy-700 font-mono text-[13px]"
                        )}
                      >
                        {col.render
                          ? col.render(rawVal, row)
                          : String(rawVal ?? "-")}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 align-middle">
                    {renderActions ? (
                      renderActions(row)
                    ) : (
                      <div className="flex gap-1.5 justify-center">
                        <Button variant="secondary" size="sm">Detail</Button>
                        <Button variant="ghost"     size="sm">Edit</Button>
                        <Button variant="danger"    size="sm">Hapus</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
        <span className="text-xs text-slate-400 font-serif">
          Menampilkan {processed.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, processed.length)}–
          {Math.min(page * PAGE_SIZE, processed.length)} dari {processed.length} data
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "w-8 h-8 rounded-md text-xs font-semibold transition-colors font-serif",
                page === p
                  ? "bg-navy-900 text-gold-400"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
