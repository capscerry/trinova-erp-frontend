import { Column } from "@/components/ui/DataTable";

import { OrderFulfillment } from "./types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

type OFStatus =
  | "CREATED"
  | "PROCESSED"
  | "COMPLETED"
  | "CANCELED";

const STATUS_STYLE: Record<OFStatus, string> = {
  CREATED:
    "bg-amber-50 text-amber-700 border border-amber-200",

  PROCESSED:
    "bg-blue-50 text-blue-700 border border-blue-200",

  COMPLETED:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  CANCELED:
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function OrderFulfillmentStatusBadge({
  status,
}: {
  status: OFStatus;
}) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

export const columns:
  Column<OrderFulfillment>[] = [
  {
    key: "reference_number",
    label: "Reference No",
  },

  {
    key: "movement_date",
    label: "Date",
    render: (value) => {
      if (!value) return "-";

      return new Date(String(value)).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },

  {
    key: "product_name",
    label: "Product",
  },

  {
    key: "source_warehouse_name",
    label: "Warehouse",
  },

  {
    key: "quantity",
    label: "Quantity",
  },

  {
    key: "notes",
    label: "Notes",
  },

  {
    key: "status",
    label: "Status",
    width: "180px",
    render: (val) => (
      <OrderFulfillmentStatusBadge
        status={val as OFStatus}
      />
    ),
  },
];