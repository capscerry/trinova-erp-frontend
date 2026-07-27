"use client";

import { cn } from "@/lib/utils";

interface ProductStockBadgeProps {
  /** Total qty_available (semua gudang), langsung dari /api/product-data — tidak fetch API lain. */
  stock?: number;
  hasProduct: boolean;
}

// Sama dengan threshold di ProductStockInfo — kalau nanti ada reorder point
// per produk, ganti heuristik ini.
const LOW_STOCK_THRESHOLD = 10;

type StockLevel = "out" | "low" | "ok";

const LEVEL_STYLE: Record<StockLevel, { dot: string; text: string; label: string }> = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Tersedia" },
  low: { dot: "bg-amber-500", text: "text-amber-700", label: "Terbatas" },
  out: { dot: "bg-red-500", text: "text-red-700", label: "Habis" },
};

function getLevel(qty: number): StockLevel {
  if (qty <= 0) return "out";
  if (qty < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

function formatQty(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value || 0);
}

/**
 * Badge stok ringkas — presentational only, tidak fetch API sendiri.
 * Nilainya diambil dari field `stock` produk (sudah dibawa bareng saat
 * /api/product-data dimuat), jadi tidak ada request tambahan per baris.
 */
export function ProductStockBadge({ stock, hasProduct }: ProductStockBadgeProps) {
  if (!hasProduct) {
    return (
      <span className="inline-flex min-h-[26px] items-center text-[11px] leading-tight text-slate-400">
        Pilih produk untuk melihat stok
      </span>
    );
  }

  const qty = stock ?? 0;
  const level = LEVEL_STYLE[getLevel(qty)];

  return (
    <div className="flex items-baseline gap-1.5 py-0.5">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", level.dot)} aria-hidden />
      <span className={cn("font-mono text-sm font-bold tabular-nums leading-none", level.text)}>
        {formatQty(qty)}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {level.label}
      </span>
    </div>
  );
}
