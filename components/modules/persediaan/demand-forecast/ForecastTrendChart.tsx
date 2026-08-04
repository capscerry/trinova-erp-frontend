"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { Forecast } from "@/types/forecast.type";

interface Props {
  data: Forecast[];
  generatedAt?: string;
}

export default function ForecastTrendChart({
  data,
  generatedAt,
}: Props) {

  const chartData =
    [...data]
      .sort(
        (a, b) =>
          b.forecast_next_month -
          a.forecast_next_month
      )
      .slice(0, 10)
      .reverse()
      .map((item, index) => ({
        name: `P${index + 1}`,
        product: item.product_name,
        forecast: Number(
          item.forecast_next_month.toFixed(2)
        ),
      }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-5">

        <h3 className="text-lg font-semibold text-slate-800">
          Forecast Quantity Trend
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Predicted demand quantity for the highest forecasted
          products.
        </p>

        <span className="text-xs text-slate-400">
            Updated {generatedAt}
        </span>

      </div>

      <div className="h-85">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 0,
            }}
          >

            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#E2E8F0"
            />

            <XAxis
              dataKey="name"
              tick={{
                fill: "#64748B",
                fontSize: 12,
              }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tick={{
                fill: "#64748B",
                fontSize: 12,
              }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
            cursor={{
                stroke: "#CBD5E1",
                strokeWidth: 1,
            }}
            contentStyle={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                boxShadow:
                "0 10px 15px -3px rgb(0 0 0 / 0.08)",
            }}
            formatter={(value) => [
                Number(value).toFixed(2),
                "Forecast Qty",
            ]}
            labelFormatter={(_, payload: any) =>
                payload?.[0]?.payload?.product ?? ""
            }
            />

            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{
                r: 5,
                strokeWidth: 2,
                fill: "#2563EB",
              }}
              activeDot={{
                r: 7,
              }}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}