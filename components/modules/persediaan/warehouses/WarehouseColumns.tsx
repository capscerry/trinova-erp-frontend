"use client";

import { Column } from "@/components/ui/DataTable";
import { Warehouse } from "@/lib/services/warehouse.service";

type WarehouseColumnProps = {
  onEdit: (
    row: Warehouse
  ) => void;

  onDelete: (
    row: Warehouse
  ) => void;
};

export const getColumns = ({
  onEdit,
  onDelete,
}: WarehouseColumnProps): Column<Warehouse>[] => [
  {
    key: "warehouse_name",
    label: "Warehouse Name",

    render: (val) => (
      <span className="font-medium text-slate-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "warehouse_type",
    label: "Type",
    width: "180px",
  },

  {
    key: "warehouse_address",
    label: "Address",
  },

  {
    key: "warehouse_id",
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