"use client";

import { Column } from "@/components/ui/DataTable";

import { StockTransaction } from "./types";

export const columns: Column<StockTransaction>[] = [
  {
    key: "created_at",
    label: "Date",
    width: "180px",
    render: (val) => (
      <span className="text-slate-700">
        {new Date(String(val)).toLocaleString()}
      </span>
    ),
  },

  {
    key: "product_id",
    label: "Product",
    render: (_, row) => (
      <div>
        <div className="font-medium text-slate-700">
          {row.product?.product_name}
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
    key: "transaction_type",
    label: "Type",
    width: "120px",
    render: (val) => {
      const type = String(val);

      return (
        <span
          className={
            type === "IN"
              ? "font-semibold text-green-600"
              : type === "OUT"
              ? "font-semibold text-red-600"
              : "font-semibold text-blue-600"
          }
        >
          {type}
        </span>
      );
    },
  },

  {
    key: "quantity",
    label: "Quantity",
    width: "120px",
    render: (val) => (
      <span className="font-medium">
        {Number(val)}
      </span>
    ),
  },

  {
    key: "reference_no",
    label: "Reference No",
    width: "150px",
    render: (_, row) => (
        <span>
        {row.reference_no ?? "-"}
        </span>
    ),
  },
  
  {
    key: "remarks",
    label: "Remarks",
    render: (_, row) => (
        <span>
        {row.remarks ?? "-"}
        </span>
    ),
  },
];