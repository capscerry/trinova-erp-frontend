"use client";

import { Column } from "@/components/ui/DataTable";

import { InventoryStock } from "./types";

export const columns: Column<InventoryStock>[] = [
  {
    key: "product_id",
    label: "Product",
    render: (_, row) => (
      <div>
        <div className="font-medium text-slate-700">
          {row.product?.product_name}
        </div>

        <div className="text-xs text-slate-500">
          {row.product?.product_code}
        </div>
      </div>
    ),
  },

  {
    key: "warehouse_id",
    label: "Warehouse",
    render: (_, row) => (
      <span className="text-slate-700">
        {row.warehouse?.warehouse_name}
      </span>
    ),
  },

  {
    key: "qty_on_hand",
    label: "On Hand",
    width: "120px",
    render: (val) => (
      <span className="font-medium">
        {Number(val)}
      </span>
    ),
  },

  {
    key: "qty_reserved",
    label: "Reserved",
    width: "120px",
    render: (val) => (
      <span>
        {Number(val)}
      </span>
    ),
  },

  {
    key: "qty_available",
    label: "Available",
    width: "120px",
    render: (val) => {
      const qty = Number(val);

      return (
        <span
          className={
            qty <= 20
              ? "font-semibold text-red-600"
              : "font-semibold text-green-600"
          }
        >
          {qty}
        </span>
      );
    },
  },
];