"use client";

import { Column } from "@/components/ui/DataTable";
import { Forecast } from "@/types/forecast.type";

function formatForecastMonth(period: string) {
  if (!period) return "-";

  const [year, month] = period.split("-");

  return new Date(
    Number(year),
    Number(month) - 1
  ).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function getCurrentTrainingPeriod() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function getCurrentForecastMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export const columns: Column<Forecast>[] = [
  {
    key: "product_name",
    label: "Product",
  },

  {
    key: "forecast_next_month",
    label: "Forecast Qty",
    width: "140px",

    render: (value) =>
      Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
  },

  {
    key: "forecast_month",
    label: "Forecast Month",
    width: "160px",

    render: () => getCurrentForecastMonth(),
  },

  {
    key: "historical_records",
    label: "Historical Records",
    width: "170px",
    
    render: (value) => `${value} Months`,
  },

  {
    key: "last_training_period",
    label: "Training Period",
    width: "180px",

    render: () => getCurrentTrainingPeriod(),
  },
];