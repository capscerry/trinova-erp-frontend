"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
}

function extractValues(obj: unknown): string[] {
  if (!obj || typeof obj !== "object") return [String(obj ?? "")];

  return Object.values(obj).flatMap((value) => {
    if (value === null || value === undefined) return [];
    if (typeof value === "object") return extractValues(value);
    return [String(value)];
  });
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
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [status, setStatus] = React.useState("All");
  const dateKey = filters?.dateKey;
  const statusKey = filters?.statusKey;
  const statusOptions = filters?.statusOptions ?? [];

  const filtered = React.useMemo(() => {
    const keyword = search.toLowerCase();
    return data.filter((row) => {
      const matchSearch =
        !search ||
        extractValues(row).some((value) => value.toLowerCase().includes(keyword));

      const rawStatus = statusKey ? String(row[statusKey] ?? "") : "";
      const matchStatus =
        !statusKey ||
        status === "All" ||
        rawStatus.toLowerCase() === status.toLowerCase();

      const rawDate = dateKey ? row[dateKey] : undefined;
      const rowDate = toDateOnly(rawDate);
      const matchDateFrom = !dateKey || !dateFrom || (rowDate !== "" && rowDate >= dateFrom);
      const matchDateTo = !dateKey || !dateTo || (rowDate !== "" && rowDate <= dateTo);

      return matchSearch && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [data, dateFrom, dateTo, dateKey, search, status, statusKey]);

  const hasAdvancedFilter = Boolean(dateKey || statusKey);
  const hasActiveAdvancedFilter = Boolean(dateFrom || dateTo || status !== "All");

  const resetAdvancedFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStatus("All");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500 shadow-sm">
        Loading data...
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-navy-500 focus:bg-white sm:w-64"
          />
          {onAdd && (
            <button
              onClick={onAdd}
              className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              {addLabel}
            </button>
          )}
        </div>
        </div>

        {hasAdvancedFilter && (
          <div className="flex flex-wrap items-center gap-2">
            {dateKey && (
              <>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-navy-500"
                  aria-label="Date from"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-navy-500"
                  aria-label="Date to"
                />
              </>
            )}

            {statusKey && (
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-navy-500"
                aria-label="Status"
              >
                <option value="All">All Status</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {hasActiveAdvancedFilter && (
              <button
                type="button"
                onClick={resetAdvancedFilters}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
              >
                Reset Filters
              </button>
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
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No data available
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={String(row[keyField])} className="transition-colors hover:bg-slate-50">
                  {columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td key={String(column.key)} className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {column.render ? column.render(value, row) : String(value)}
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
    </div>
  );
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
