"use client";

import { Column } from "@/components/ui/DataTable";
import { Product } from "./types";

type ProductColumnProps = {
  onEdit: (row: Product) => void;
  onDelete: (row: Product) => void;
};

export const getColumns = ({
  onEdit,
  onDelete,
}: ProductColumnProps): Column<Product>[] => [
  {
    key: "product_code",
    label: "Product Code",
    width: "180px",
    render: (val) => (
      <span className="font-mono text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "product_name",
    label: "Product Name",
    render: (val) => (
      <span className="font-medium text-slate-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "category_id",
    label: "Category",
    width: "180px",
    render: (_, row) => (
      <span className="text-slate-700">
        {
          row.masterProductCategory
            ?.category_name
        }
      </span>
    ),
  },

  {
    key: "subcategory_id",
    label: "Subcategory",
    width: "180px",
    render: (_, row) => (
      <span className="text-slate-700">
        {row.productSubcategory
          ?.subcategory_name ??
          row.productSubcategory
            ?.name}
      </span>
    ),
  },

  {
    key: "uom_id",
    label: "UOM",
    width: "140px",
    render: (_, row) => (
      <span className="text-slate-700">
        {row.masterUom?.uom_name}
      </span>
    ),
  },

  {
    key: "product_id",
    label: "Action",
    width: "220px",
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            onEdit(row)
          }
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Edit
        </button>

        <button
          onClick={() =>
            onDelete(row)
          }
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    ),
  },
];