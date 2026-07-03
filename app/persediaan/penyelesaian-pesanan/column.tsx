import { Column } from "@/components/ui/DataTable";

import { OrderFulfillment } from "./types";

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
    key: "warehouse_name",
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
];