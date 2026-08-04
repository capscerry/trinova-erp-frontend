"use client";

import {
  Boxes,
  TrendingUp,
  BarChart3,
  CalendarDays,
} from "lucide-react";

interface Props {
  totalProducts: number;
  totalForecast: number;
  averageForecast: number;
  forecastMonth: string;
}

function formatForecastMonth(period: string) {

  if (!period)
    return "-";

  const [year, month] =
    period.split("-");

  return new Date(
    Number(year),
    Number(month) - 1
  ).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

}

export default function ForecastSummary({

  totalProducts,
  totalForecast,
  averageForecast,
  forecastMonth,

}: Props) {

  const cards = [

    {
      title: "Forecasted Products",
      value: totalProducts.toLocaleString(),
      icon: Boxes,
      color: "text-blue-600",
      bg: "bg-blue-50",
      description:
        "Products analyzed",
    },

    {
      title: "Total Forecast",
      value: totalForecast.toFixed(2),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      description:
        "Predicted demand",
    },

    {
      title: "Average Forecast",
      value: averageForecast.toFixed(2),
      icon: BarChart3,
      color: "text-violet-600",
      bg: "bg-violet-50",
      description:
        "Average per product",
    },

    {
      title: "Forecast Month",
      value: formatForecastMonth(
        forecastMonth
      ),
      icon: CalendarDays,
      color: "text-amber-600",
      bg: "bg-amber-50",
      description:
        "Prediction period",
    },

  ];

  return (

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

      {

        cards.map((card) => {

          const Icon = card.icon;

          return (

            <div
              key={card.title}
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-6
                shadow-sm
              "
            >

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-slate-800">
                    {card.value}
                  </h2>

                  <p className="mt-2 text-xs text-slate-400">
                    {card.description}
                  </p>

                </div>

                <div
                  className={`
                    ${card.bg}
                    rounded-xl
                    p-3
                  `}
                >
                  <Icon
                    className={`h-6 w-6 ${card.color}`}
                  />
                </div>

              </div>

            </div>

          );

        })

      }

    </div>

  );

}