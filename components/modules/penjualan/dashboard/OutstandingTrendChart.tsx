"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { MonthPoint } from "@/lib/services/sales-kpi.service";

interface Props {
  data: MonthPoint[];
  loading?: boolean;
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000)     return `Rp ${(value / 1_000_000).toFixed(1)}Jt`;
  if (value >= 1_000)         return `Rp ${(value / 1_000).toFixed(0)}Rb`;
  return `Rp ${value}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-rose-600 font-bold">{formatRupiah(payload[0].value)}</p>
    </div>
  );
};

export function OutstandingTrendChart({ data, loading }: Props) {
  if (loading) return <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />;

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatRupiah} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={64} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            name="Outstanding"
            stroke="#f43f5e"
            strokeWidth={2.5}
            dot={{ fill: "#f43f5e", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#e11d48" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
