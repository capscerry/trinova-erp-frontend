"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

import { Forecast } from "@/types/forecast.type";

interface Props {
  data: Forecast[];
  generatedAt?: string;
}

export default function TopForecastProductsChart({
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
      .map(item => ({
        name:
          item.product_name.length > 18
            ? item.product_name.substring(0, 18) + "..."
            : item.product_name,

        fullName: item.product_name,

        forecast: Number(
          item.forecast_next_month.toFixed(2)
        ),
      }));

  const colors = [
    "#2563EB",
    "#3B82F6",
    "#60A5FA",
    "#93C5FD",
    "#BFDBFE",
    "#DBEAFE",
    "#93C5FD",
    "#60A5FA",
    "#3B82F6",
    "#2563EB",
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-5 flex items-center justify-between">

        <div>

          <h3 className="text-lg font-semibold text-slate-800">
            Top 10 Forecast Products
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Highest predicted demand for next month
          </p>

          <span className="text-xs text-slate-400">
                Updated {generatedAt}
            </span>

        </div>

      </div>

      <div className="h-85">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 0,
              right: 20,
              left: 20,
              bottom: 0,
            }}
          >

            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="#E2E8F0"
            />

            <XAxis
              type="number"
              tick={{
                fill: "#64748B",
                fontSize: 12,
              }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              dataKey="name"
              type="category"
              width={160}
              tick={{
                fill: "#475569",
                fontSize: 12,
              }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              formatter={(value) => [
                Number(value).toFixed(2),
                "Forecast Qty",
              ]}
              labelFormatter={(_, payload: any) =>
                payload?.[0]?.payload?.fullName ?? ""
              }
              cursor={{
                fill: "#F8FAFC",
              }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                boxShadow:
                  "0 10px 15px -3px rgb(0 0 0 / 0.08)",
              }}
            />

            <Bar
              dataKey="forecast"
              radius={[0, 8, 8, 0]}
            >
              {
                chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={colors[index]}
                  />
                ))
              }
            </Bar>

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}