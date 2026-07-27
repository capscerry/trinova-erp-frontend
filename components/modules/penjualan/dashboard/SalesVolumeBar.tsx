"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";
import type { MonthPoint } from "@/lib/services/sales-kpi.service";

interface Props {
  data: MonthPoint[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-indigo-600 font-bold">{payload[0].value} SO</p>
    </div>
  );
};

export function SalesVolumeBar({ data, loading }: Props) {
  if (loading) return <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="value" name="SO" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.value === maxVal ? "#6366f1" : "#c7d2fe"} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => (v > 0 ? v : "")}
              style={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
