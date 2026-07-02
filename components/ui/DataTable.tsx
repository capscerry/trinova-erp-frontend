"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export interface Column<T> {
  key: keyof T;
  label: string;
  width?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableFilters<T> {
  dateKey?: keyof T;
  statusKey?: keyof T;
  statusOptions?: string[];
}

type SortOrder = "newest" | "oldest" | "az" | "za" | "";

interface DataTableProps<T> {
  title: string;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  renderActions?: (row: T) => React.ReactNode;
  keyField?: keyof T;
  className?: string;
  filters?: DataTableFilters<T>;
  dateField?: keyof T;
  createdAtField?: keyof T;
  nameField?: keyof T;
  statusOptions?: string[];
  statusField?: keyof T;
  isLoading?: boolean;
}

function extractValues(obj: unknown): string[] {
  if (!obj || typeof obj !== "object") return [String(obj ?? "")];

  return Object.values(obj).flatMap((value) => {
    if (value === null || value === undefined) return [];
    if (typeof value === "object") return extractValues(value);
    return [String(value)];
  });
}

function toDateOnly(value: unknown) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function DataTable<T extends object>({
  title,
  columns,
  data,
  loading = false,
  addLabel = "Tambah",
  onAdd,
  renderActions,
  keyField = "id" as keyof T,
  className,
  filters,
  dateField,
  createdAtField,
  nameField,
  statusOptions: propStatusOptions,
  statusField = "status" as keyof T,
  isLoading = false,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(
    dateField || createdAtField || filters?.dateKey ? "newest" : ""
  );
  const [statusFilter, setStatusFilter] = React.useState("");
  const panelRef = React.useRef<HTMLDivElement>(null);

  const dateKey = filters?.dateKey ?? dateField;
  const statusKey = filters?.statusKey ?? statusField;
  const mergedStatusOptions = filters?.statusOptions ?? propStatusOptions ?? [];
  const showDateFilters = Boolean(dateKey);
  const showStatusFilters = mergedStatusOptions.length > 0;
  const activeFilterCount =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (sortOrder && sortOrder !== "newest" ? 1 : 0);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }

    if (filterOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  React.useEffect(() => {
    setPage(1);
  }, [data, search, dateFrom, dateTo, statusFilter, sortOrder]);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSortOrder(dateField || createdAtField || filters?.dateKey ? "newest" : "");
    setStatusFilter("");
    setPage(1);
  }

  type Indexed = T & { __idx: number };

  let processed: Indexed[] = data.map((row, index) => ({
    ...row,
    __idx: index,
  }));

  processed = processed.filter((row) => {
    const keyword = search.trim().toLowerCase();
    const matchSearch =
      !keyword ||
      extractValues(row).some((value) => value.toLowerCase().includes(keyword));

    const rawStatus = statusKey ? String(row[statusKey] ?? "") : "";
    const matchStatus =
      !statusFilter || rawStatus.toLowerCase() === statusFilter.toLowerCase();

    const rawDate = dateKey ? row[dateKey] : undefined;
    const rowDate = toDateOnly(rawDate);
    const matchDateFrom = !dateFrom || (rowDate !== "" && rowDate >= dateFrom);
    const matchDateTo = !dateTo || (rowDate !== "" && rowDate <= dateTo);

    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  if (sortOrder === "newest" || sortOrder === "oldest") {
    const sortKey = createdAtField ?? dateKey;
    processed = [...processed].sort((a, b) => {
      let diff = 0;

      if (sortKey) {
        const dateA = new Date(String(a[sortKey as keyof Indexed] ?? "")).getTime();
        const dateB = new Date(String(b[sortKey as keyof Indexed] ?? "")).getTime();
        const validA = !Number.isNaN(dateA);
        const validB = !Number.isNaN(dateB);

        if (validA && validB) diff = dateB - dateA;
        else if (validA) diff = -1;
        else if (validB) diff = 1;
      }

      if (diff === 0) diff = b.__idx - a.__idx;
      return sortOrder === "newest" ? diff : -diff;
    });
  } else if ((sortOrder === "az" || sortOrder === "za") && nameField) {
    processed = [...processed].sort((a, b) => {
      const nameA = String(a[nameField] ?? "").toLowerCase();
      const nameB = String(b[nameField] ?? "").toLowerCase();
      return sortOrder === "az"
        ? nameA.localeCompare(nameB, "id")
        : nameB.localeCompare(nameA, "id");
    });
  }

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paged = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const busy = loading || isLoading;

  const sortOptions: { value: SortOrder; label: string; available: boolean }[] = [
    { value: "newest", label: "Newest", available: Boolean(dateField || createdAtField || dateKey) },
    { value: "oldest", label: "Oldest", available: Boolean(dateField || createdAtField || dateKey) },
    { value: "az", label: "A to Z", available: Boolean(nameField) },
    { value: "za", label: "Z to A", available: Boolean(nameField) },
  ].filter((option) => option.available);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors focus-within:border-navy-500 focus-within:bg-white sm:w-64">
              <Search size={14} className="shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            {(showDateFilters || showStatusFilters || sortOptions.length > 0) && (
              <div ref={panelRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((open) => !open)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                    filterOpen || activeFilterCount > 0
                      ? "border-navy-900 bg-navy-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Filter size={13} />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold-400 text-[10px] font-bold text-navy-900">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-50 flex w-72 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Filter & Sort
                      </span>
                      <button
                        type="button"
                        onClick={() => setFilterOpen(false)}
                        className="text-slate-400 transition-colors hover:text-slate-600"
                        aria-label="Close filter"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {showDateFilters && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          From
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium normal-case tracking-normal text-slate-600 outline-none transition-colors focus:border-navy-500"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          To
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(event) => setDateTo(event.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium normal-case tracking-normal text-slate-600 outline-none transition-colors focus:border-navy-500"
                          />
                        </label>
                      </div>
                    )}

                    {sortOptions.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Sort
                        </span>
                        <div className="flex flex-col gap-1">
                          {sortOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setSortOrder(option.value)}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                sortOrder === option.value
                                  ? "bg-navy-900 text-white"
                                  : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {option.label}
                              {sortOrder === option.value && <Check size={13} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {showStatusFilters && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Status
                        </span>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setStatusFilter("")}
                            className={cn(
                              "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              statusFilter === ""
                                ? "bg-navy-900 text-white"
                                : "text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            All Status
                            {statusFilter === "" && <Check size={13} />}
                          </button>
                          {mergedStatusOptions.map((statusOption) => (
                            <button
                              key={statusOption}
                              type="button"
                              onClick={() => setStatusFilter(statusOption)}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                statusFilter === statusOption
                                  ? "bg-navy-900 text-white"
                                  : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {statusOption}
                              {statusFilter === statusOption && <Check size={13} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-left text-xs font-semibold text-rose-500 transition-colors hover:text-rose-700"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {onAdd && (
              <button
                type="button"
                onClick={onAdd}
                className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
              >
                {addLabel}
              </button>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {dateFrom && (
              <FilterChip label={`From ${dateFrom}`} onClear={() => setDateFrom("")} />
            )}
            {dateTo && (
              <FilterChip label={`To ${dateTo}`} onClear={() => setDateTo("")} />
            )}
            {sortOrder && sortOrder !== "newest" && (
              <FilterChip
                label={sortOrder === "oldest" ? "Oldest" : sortOrder === "az" ? "A to Z" : "Z to A"}
                onClear={() => setSortOrder(dateField || createdAtField || dateKey ? "newest" : "")}
              />
            )}
            {statusFilter && (
              <FilterChip label={statusFilter} onClear={() => setStatusFilter("")} />
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}
              {renderActions && (
                <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {busy ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-slate-50">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-4 py-3">
                      <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
                    </td>
                  )}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No data available
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={String(row[keyField] ?? row.__idx)} className="transition-colors hover:bg-slate-50">
                  {columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td
                        key={String(column.key)}
                        className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700"
                      >
                        {column.render ? column.render(value, row) : String(value ?? "")}
                      </td>
                    );
                  })}
                  {renderActions && (
                    <td className="border-b border-slate-100 px-4 py-3 text-right">
                      {renderActions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <span className="text-xs text-slate-400">
          Showing {processed.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, processed.length)}-
          {Math.min(page * PAGE_SIZE, processed.length)} of {processed.length} data
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={cn(
                "h-8 w-8 rounded-md text-xs font-semibold transition-colors",
                page === pageNumber
                  ? "bg-navy-900 text-gold-400"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 transition-colors hover:text-rose-500"
        aria-label={`Clear ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}
