"use client";

import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

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
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Client-side search across all string values
  const filtered = data.filter((row) =>
    columns.some((col) => {
      const val = row[col.key as keyof T];
      return typeof val === "string" && val.toLowerCase().includes(search.toLowerCase());
    })
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full font-serif"
          />
        </div>
        <Button variant="secondary" size="sm">
          <Filter size={13} /> Filter
        </Button>
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
            {paged.length === 0 ? (
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
          Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
          {Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
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
