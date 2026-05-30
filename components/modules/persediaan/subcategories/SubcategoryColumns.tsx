"use client";

import { Column } from "@/components/ui/DataTable";

import { ProductSubcategory } from "@/lib/services/subcategory.service";

type SubcategoryColumnProps = {
  onEdit: (
    row: ProductSubcategory
  ) => void;

  onDelete: (
    row: ProductSubcategory
  ) => void;
};

export const getColumns = ({
  onEdit,
  onDelete,
}: SubcategoryColumnProps): Column<ProductSubcategory>[] => [
  {
    key: "name",
    label: "Subcategory Name",

    render: (val) => (
      <span className="font-medium text-slate-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "code",
    label: "Code",
    width: "120px",

    render: (val) => (
      <span className="font-mono text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "category_id",
    label: "Category",
    width: "220px",

    render: (_, row) => (
      <span className="text-slate-700">
        {
          row.category
            ?.category_name
        }
      </span>
    ),
  },

  {
    key: "subcategory_id",
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
