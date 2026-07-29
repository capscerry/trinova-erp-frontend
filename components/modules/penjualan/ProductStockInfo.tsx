"use client";

import { useEffect, useState } from "react";
import { Loader2, PackageX } from "lucide-react";
import {
  salesStockService,
  type ProductStockSummary,
} from "@/lib/services/sales-stock.service";
import { cn } from "@/lib/utils";

interface ProductStockInfoProps {
  productId?: number | null;
  warehouseId?: number | null;
  warehouseName?: string | null;
  compact?: boolean;
  requireWarehouse?: boolean;
  /** Qty yang diminta di baris ini — kalau melebihi stok tersedia, badge otomatis merah "Kurang N" (preview validasi Confirm). */
  requestedQty?: number;
}

// Simple heuristic since there's no per-product reorder point yet —
// tune this if the business defines a real low-stock threshold later.
const LOW_STOCK_THRESHOLD = 10;

type StockLevel = "out" | "low" | "ok";

const LEVEL_STYLE: Record<StockLevel, { dot: string; text: string; label: string }> = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Tersedia" },
  low: { dot: "bg-amber-500", text: "text-amber-700", label: "Terbatas" },
  out: { dot: "bg-red-500", text: "text-red-700", label: "Habis" },
};

function getLevel(qtyAvailable: number, requestedQty?: number): StockLevel {
  if (requestedQty && requestedQty > 0 && qtyAvailable < requestedQty) return "out";
  if (qtyAvailable <= 0) return "out";
  if (qtyAvailable < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

function formatQty(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value || 0);
}

function Placeholder({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[26px] items-center gap-1.5 text-[11px] leading-tight",
        muted ? "text-slate-400" : "text-slate-500"
      )}
    >
      {children}
    </span>
  );
}

export function ProductStockInfo({
  productId,
  warehouseId,
  warehouseName,
  compact,
  requireWarehouse,
  requestedQty,
}: ProductStockInfoProps) {
  const [data, setData] = useState<ProductStockSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!productId) {
      setData(null);
      return;
    }

    setLoading(true);
    salesStockService
      .getByProduct(productId)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) {
          setData({
            productId,
            totalOnHand: 0,
            totalReserved: 0,
            totalAvailable: 0,
            warehouses: [],
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  if (!productId) {
    return <Placeholder muted>Pilih produk untuk melihat stok</Placeholder>;
  }

  if (requireWarehouse && !warehouseId) {
    return null;
  }

  const visibleData = data?.productId === productId ? data : null;

  if (loading || !visibleData) {
    return (
      <Placeholder>
        <Loader2 size={12} className="animate-spin shrink-0" />
        Memuat stok...
      </Placeholder>
    );
  }

  const hasSpecificWarehouse = Boolean(warehouseId);

  const selectedWarehouse = hasSpecificWarehouse
    ? visibleData.warehouses.find((item) => Number(item.warehouseId) === Number(warehouseId))
    : null;

  // Kalau gudang spesifik sudah dipilih tapi produk ini tidak punya baris
  // inventory_stock di gudang itu, `selectedWarehouse` akan undefined —
  // itu artinya stoknya memang 0 DI GUDANG TERSEBUT, bukan "belum ada
  // data" dan BUKAN alasan untuk jatuh balik ke total semua gudang.
  const visibleWarehouses = hasSpecificWarehouse
    ? (selectedWarehouse ? [selectedWarehouse] : [])
    : visibleData.warehouses;

  if (!hasSpecificWarehouse && visibleWarehouses.length === 0) {
    return (
      <Placeholder>
        <PackageX size={12} className="shrink-0 text-slate-400" />
        Belum ada data stok
      </Placeholder>
    );
  }

  const totalAvailable = visibleWarehouses.reduce((sum, item) => sum + item.qtyAvailable, 0);
  const totalOnHand = visibleWarehouses.reduce((sum, item) => sum + item.qtyOnHand, 0);
  const totalReserved = visibleWarehouses.reduce((sum, item) => sum + item.qtyReserved, 0);
  const level = LEVEL_STYLE[getLevel(totalAvailable, requestedQty)];
  const shortfall = requestedQty && requestedQty > totalAvailable ? requestedQty - totalAvailable : 0;
  const levelLabel = shortfall > 0 ? `Kurang ${formatQty(shortfall)}` : level.label;

  const warehouseSummary = hasSpecificWarehouse && !selectedWarehouse
    ? `${warehouseName ?? "Gudang ini"}: tidak ada stok produk ini`
    : visibleWarehouses
        .map((item) => `${item.warehouseName}: ${formatQty(item.qtyAvailable)} tersedia / ${formatQty(item.qtyOnHand)} on hand`)
        .join("\n");

  if (compact) {
    return (
      <div title={warehouseSummary} className="flex flex-col gap-0.5 py-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", level.dot)} aria-hidden />
          <span className={cn("font-mono text-sm font-bold tabular-nums leading-none", level.text)}>
            {formatQty(totalAvailable)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {levelLabel}
          </span>
        </div>
        {(totalReserved > 0 || visibleWarehouses.length > 1) && (
          <span className="pl-3 text-[10px] leading-tight text-slate-400">
            {formatQty(totalOnHand)} on hand
            {totalReserved > 0 && ` · ${formatQty(totalReserved)} reserved`}
          </span>
        )}
      </div>
    );
  }

  const displayWarehouseName = selectedWarehouse?.warehouseName ?? warehouseName ?? "Semua gudang";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
          <span className={cn("h-1.5 w-1.5 rounded-full", level.dot)} aria-hidden />
          {displayWarehouseName}
        </span>
        <span className={cn("font-mono text-sm font-bold tabular-nums", level.text)}>
          {formatQty(totalAvailable)}
          <span className="ml-1 text-[10px] font-medium text-slate-400">
            {shortfall > 0 ? `· ${levelLabel}` : "tersedia"}
          </span>
        </span>
      </div>

      {!selectedWarehouse && visibleWarehouses.length > 1 && (
        <div className="mt-1.5 space-y-1 border-t border-slate-200/70 pt-1.5">
          {visibleWarehouses.map((item) => (
            <div key={item.stockId} className="flex items-center justify-between gap-2 text-slate-500">
              <span className="truncate">{item.warehouseName}</span>
              <span className="shrink-0 font-mono tabular-nums text-slate-600">
                {formatQty(item.qtyAvailable)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center gap-1.5 text-slate-400">
        <span>On hand {formatQty(totalOnHand)}</span>
        <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
        <span>Reserved {formatQty(totalReserved)}</span>
      </div>
    </div>
  );
}
