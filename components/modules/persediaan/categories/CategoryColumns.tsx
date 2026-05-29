"use client";

import { Column } from "@/components/ui/DataTable";
import { Category } from "@/lib/services/category.service";

type CategoryColumnProps = {
  onEdit: (
    row: Category
  ) => void;

  onDelete: (
    row: Category
  ) => void;
};

export const getColumns = ({
  onEdit,
  onDelete,
}: CategoryColumnProps): Column<Category>[] => [
  {
    key: "category_name",
    label: "Category Name",

    render: (val) => (
      <span className="font-medium text-slate-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "category_id",
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