"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
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
      <p className="text-purple-600 font-bold">{payload[0].value.toFixed(1)} hari</p>
    </div>
  );
};

export function LeadTimeTrendChart({ data, loading }: Props) {
  if (loading) return <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />;

  // average for reference line
  const withVal = data.filter((d) => d.value > 0);
  const avg = withVal.length > 0
    ? withVal.reduce((s, d) => s + d.value, 0) / withVal.length
    : 0;

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(0)}h`}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          {avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke="#a78bfa"
              strokeDasharray="5 3"
              label={{ value: `Avg: ${avg.toFixed(1)}h`, position: "insideTopRight", fontSize: 10, fill: "#7c3aed" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            name="Lead Time"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            dot={{ fill: "#8b5cf6", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#7c3aed" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
