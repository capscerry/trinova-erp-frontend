"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Column Type ───────────────────────────────────────────────────────────────
export interface Column<T> {
  key: keyof T;
  label: string;
  width?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

// ─── Props ─────────────────────────────────────────────────────────────────────
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
}

// ─── Component ─────────────────────────────────────────────────────────────────
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
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");

  // ─── Recursive Search Helper ────────────────────────────────────────────────
  function flattenValues(obj: any): string[] {
    const values: string[] = [];

    Object.values(obj).forEach((value) => {
      if (
        value !== null &&
        typeof value === "object"
      ) {
        values.push(
          ...flattenValues(value)
        );
      } else {
        values.push(String(value));
      }
    });

    return values;
  }

  // ─── Filter ────────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    if (!search) return data;

    const keyword =
      search.toLowerCase();

    function extractValues(
      obj: any
    ): string[] {
      const values: string[] = [];

      Object.values(obj).forEach(
        (value) => {
          if (
            value === null ||
            value === undefined
          )
            return;

          if (
            typeof value === "object"
          ) {
            values.push(
              ...extractValues(value)
            );
          } else {
            values.push(
              String(value)
            );
          }
        }
      );

      return values;
    }

    return data.filter((row) =>
      extractValues(row).some(
        (value) =>
          value
            .toLowerCase()
            .includes(keyword)
      )
    );
  }, [data, search]);

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
        Loading data...
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
          />

          {/* Add Button */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}

              {renderActions && (
                <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length + (renderActions ? 1 : 0)
                  }
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No data available
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={String(row[keyField])}
                  className="hover:bg-slate-50"
                >
                  {columns.map((column) => {
                    const value = row[column.key];

                    return (
                      <td
                        key={String(column.key)}
                        className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700"
                      >
                        {column.render
                          ? column.render(value, row)
                          : String(value)}
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