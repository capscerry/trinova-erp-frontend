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
import type { MonthPoint } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: MonthPoint[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-rose-600 font-bold">{payload[0].value} Retur</p>
    </div>
  );
};

export function ReturnTrendBar({ data, loading }: Props) {
  if (loading) return <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />;

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fff1f2" }} />
          <Bar dataKey="value" name="Retur" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.value === maxVal && maxVal > 0 ? "#ef4444" : "#fca5a5"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
