"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeRange, DateFilter } from "@/lib/services/purchasing-kpi.service";

// ─── Time-range presets ────────────────────────────────────────────────────────

interface TimePreset {
  key: TimeRange;
  label: string;
  shortLabel: string;
}

const TIME_PRESETS: TimePreset[] = [
  { key: "today",   label: "Hari Ini",    shortLabel: "Hari Ini" },
  { key: "last7",   label: "7 Hari",      shortLabel: "7 Hari" },
  { key: "last30",  label: "30 Hari",     shortLabel: "30 Hari" },
  { key: "last3m",  label: "3 Bulan",     shortLabel: "3 Bln" },
  { key: "last6m",  label: "6 Bulan",     shortLabel: "6 Bln" },
  { key: "last1y",  label: "1 Tahun",     shortLabel: "1 Thn" },
  { key: "custom",  label: "Kustom",      shortLabel: "Kustom" },
];

// ─── Additional filter state ──────────────────────────────────────────────────

export interface ActiveFilters {
  supplierId?: number;
  supplierName?: string;
  category?: string;
  status?: string;
}

interface Props {
  // Controlled time filter
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;

  // Controlled additional filters
  activeFilters: ActiveFilters;
  onActiveFiltersChange: (f: ActiveFilters) => void;

  // Options for dropdowns
  suppliers?: Array<{ id: number; name: string }>;
  categories?: string[];
  statuses?: string[];

  loading?: boolean;
}

// ─── Helper: format date to yyyy-mm-dd ───────────────────────────────────────

function toInputValue(d?: Date): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardFilters({
  dateFilter,
  onDateFilterChange,
  activeFilters,
  onActiveFiltersChange,
  suppliers = [],
  categories = [],
  statuses = [],
  loading = false,
}: Props) {
  const [showCustom, setShowCustom]       = useState(false);
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const customRef = useRef<HTMLDivElement>(null);

  // Close custom date panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasActiveFilters = !!(
    activeFilters.supplierId ||
    activeFilters.category ||
    activeFilters.status
  );

  const activeFilterCount = [
    activeFilters.supplierId,
    activeFilters.category,
    activeFilters.status,
  ].filter(Boolean).length;

  function clearAllFilters() {
    onActiveFiltersChange({});
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ── Time range pills ─────────────────────────────── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset.key}
            disabled={loading}
            onClick={() => {
              if (preset.key === "custom") {
                setShowCustom((v) => !v);
              } else {
                setShowCustom(false);
                onDateFilterChange({ range: preset.key });
              }
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap",
              dateFilter.range === preset.key
                ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            )}
          >
            {preset.shortLabel}
          </button>
        ))}
      </div>

      {/* ── Custom date picker dropdown ───────────────────── */}
      {dateFilter.range === "custom" && (
        <div className="relative" ref={customRef}>
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-blue-200 text-blue-700 shadow-sm hover:bg-blue-50 transition-colors"
          >
            <Calendar size={13} />
            {dateFilter.from && dateFilter.to
              ? `${dateFilter.from.toLocaleDateString("id-ID")} – ${dateFilter.to.toLocaleDateString("id-ID")}`
              : "Pilih rentang"}
            <ChevronDown size={12} className={cn("transition-transform", showCustom && "rotate-180")} />
          </button>
          {showCustom && (
            <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex gap-4 items-end min-w-[280px]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dari</label>
                <input
                  type="date"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={toInputValue(dateFilter.from)}
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined;
                    onDateFilterChange({ ...dateFilter, from: d });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sampai</label>
                <input
                  type="date"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={toInputValue(dateFilter.to)}
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value + "T23:59:59") : undefined;
                    onDateFilterChange({ ...dateFilter, to: d });
                  }}
                />
              </div>
              <button
                onClick={() => setShowCustom(false)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Advanced filters toggle ───────────────────────── */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all",
          hasActiveFilters
            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
            : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-700"
        )}
      >
        <Filter size={12} />
        Filter
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/30 text-[10px] font-bold">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown size={12} className={cn("transition-transform", showAdvanced && "rotate-180")} />
      </button>

      {/* ── Clear filters ─────────────────────────────────── */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200"
        >
          <X size={11} />
          Hapus Filter
        </button>
      )}

      {/* ── Advanced filter panel ────────────────────────────────── */}
      {showAdvanced && (
        <div className="w-full mt-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-wrap gap-4">

            {/* Supplier */}
            {suppliers.length > 0 && (
              <div className="flex flex-col gap-1 min-w-[180px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier</label>
                <select
                  className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  value={activeFilters.supplierId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = suppliers.find((s) => String(s.id) === val);
                    onActiveFiltersChange({
                      ...activeFilters,
                      supplierId: val ? Number(val) : undefined,
                      supplierName: found?.name,
                    });
                  }}
                >
                  <option value="">Semua Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category */}
            {categories.length > 0 && (
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kategori</label>
                <select
                  className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  value={activeFilters.category ?? ""}
                  onChange={(e) =>
                    onActiveFiltersChange({ ...activeFilters, category: e.target.value || undefined })
                  }
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status */}
            {statuses.length > 0 && (
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status PO</label>
                <select
                  className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  value={activeFilters.status ?? ""}
                  onChange={(e) =>
                    onActiveFiltersChange({ ...activeFilters, status: e.target.value || undefined })
                  }
                >
                  <option value="">Semua Status</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
