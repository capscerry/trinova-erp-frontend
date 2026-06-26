import {
  Package,
  ChartColumn,
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

export default function ForecastSummary({
  totalProducts,
  totalForecast,
  averageForecast,
  forecastMonth,
}: Props) {

  const cards = [
    {
      title: "Total Products",
      value: totalProducts,
      description: "Products Forecasted",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Forecast Qty",
      value: totalForecast.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      description: "Predicted Demand",
      icon: ChartColumn,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Average Forecast",
      value: averageForecast.toFixed(2),
      description: "Per Product",
      icon: BarChart3,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
    {
      title: "Forecast Month",
      value: formatForecastMonth(forecastMonth),
      description: "Prediction Period",
      icon: CalendarDays,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {

        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-6
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-lg
              hover:cursor-default
            "
          >
            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  {card.title}
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
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
                  className={`h-7 w-7 ${card.color}`}
                />
              </div>

            </div>
          </div>
        );

      })}
    </div>
  );
}

