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
  },

  {
    key: "product_id",
    label: "Product",
  },

  {
    key: "source_warehouse_id",
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