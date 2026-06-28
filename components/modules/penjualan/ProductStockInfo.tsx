"use client";

import { useEffect, useState } from "react";
import { Boxes, Loader2, Warehouse } from "lucide-react";
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
}

export function ProductStockInfo({
  productId,
  warehouseId,
  warehouseName,
  compact,
  requireWarehouse,
}: ProductStockInfoProps) {
  const [data, setData] = useState<ProductStockSummary | null>(null);

  useEffect(() => {
    let active = true;

    if (!productId) {
      return;
    }

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
      });

    return () => {
      active = false;
    };
  }, [productId]);

  if (!productId) {
    return (
      <span className="inline-flex min-h-7 items-center rounded-md border border-dashed border-slate-200 px-2 text-[10px] text-slate-400">
        Select a product to view stock
      </span>
    );
  }

  if (requireWarehouse && !warehouseId) {
    return null;
  }

  const visibleData = productId && data?.productId === productId ? data : null;

  if (!visibleData) {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        Loading stock...
      </span>
    );
  }

  const selectedWarehouse = warehouseId
    ? visibleData.warehouses.find((item) => Number(item.warehouseId) === Number(warehouseId))
    : null;

  const visibleWarehouses = selectedWarehouse
    ? [selectedWarehouse]
    : visibleData.warehouses;

  if (!visibleData || visibleWarehouses.length === 0) {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-[10px] text-amber-700">
        <Boxes size={12} />
        No stock in selected warehouse
      </span>
    );
  }

  const totalAvailable = visibleWarehouses.reduce((sum, item) => sum + item.qtyAvailable, 0);
  const totalOnHand = visibleWarehouses.reduce((sum, item) => sum + item.qtyOnHand, 0);
  const totalReserved = visibleWarehouses.reduce((sum, item) => sum + item.qtyReserved, 0);
  const displayWarehouseName = selectedWarehouse?.warehouseName ?? warehouseName ?? "All warehouses";

  const warehouseSummary = visibleWarehouses
    .map((item) => `${item.warehouseName}: ${formatQty(item.qtyAvailable)} available / ${formatQty(item.qtyOnHand)} on hand`)
    .join(" | ");

  if (compact) {
    return (
      <div
        title={warehouseSummary}
        className="rounded-lg border border-emerald-200/70 bg-white px-2.5 py-1.5 text-[10px] leading-tight shadow-sm shadow-emerald-900/5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-slate-600">
            <Warehouse size={11} className="shrink-0 text-emerald-600" />
            <span className="truncate">{displayWarehouseName}</span>
          </span>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
            {formatQty(totalAvailable)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9.5px] text-slate-500">
          <span>On hand {formatQty(totalOnHand)}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>Reserved {formatQty(totalReserved)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px]")}>
      <div className="flex items-center justify-between gap-2 font-semibold text-slate-700">
        <span className="inline-flex items-center gap-1">
          <Boxes size={12} />
          Sellable Stock
        </span>
        <span className="text-emerald-700">{formatQty(totalAvailable)}</span>
      </div>
      <div className="mt-1 space-y-1">
        {visibleWarehouses.map((item) => (
          <div key={item.stockId} className="flex items-center justify-between gap-2 text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-1">
              <Warehouse size={11} className="shrink-0" />
              <span className="truncate">{item.warehouseName}</span>
            </span>
            <span className="shrink-0 font-medium text-slate-700">
              {formatQty(item.qtyAvailable)} available / {formatQty(item.qtyOnHand)} on hand
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatQty(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}
