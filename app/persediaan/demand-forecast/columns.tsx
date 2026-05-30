"use client";

import { Column } from "@/components/ui/DataTable";
import { DemandForecast } from "./types";

export const columns: Column<DemandForecast>[] = [
  {
    key: "product_name",
    label: "Product",
  },

  {
    key: "total_usage",
    label: "Total Usage",
    width: "140px",
  },

  {
    key: "forecast_next_month",
    label: "Forecast",
    width: "140px",
  },

  {
    key: "current_stock",
    label: "Current Stock",
    width: "140px",
  },

  {
    key: "recommendation",
    label: "Recommendation",
    width: "180px",

    render: (value) => {
      const recommendation =
        String(value);

      let className =
        "rounded-full px-3 py-1 text-xs font-medium";

      switch (recommendation) {
        case "Stock Aman":
          className +=
            " bg-green-100 text-green-700";
          break;

        case "Perlu Reorder":
          className +=
            " bg-yellow-100 text-yellow-700";
          break;

        case "Segera Restock":
          className +=
            " bg-red-100 text-red-700";
          break;
      }

      return (
        <span className={className}>
          {recommendation}
        </span>
      );
    },
  },
];