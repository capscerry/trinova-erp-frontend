"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SupplierCategorySpend } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: SupplierCategorySpend[];
  loading?: boolean;
}

const COLORS = ["#3b82f6","#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#f97316"];

function formatRupiah(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}Rb`;
  return `Rp ${v}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm max-w-[220px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-slate-600 truncate flex-1">{p.dataKey}</span>
          <span className="font-bold text-slate-700">{formatRupiah(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function SpendingByCategory({ data, loading }: Props) {
  if (loading) return <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />;

  // Derive unique category keys from data
  const keys = Array.from(
    new Set(
      data.flatMap((row) => Object.keys(row).filter((k) => k !== "month"))
    )
  );

  if (!keys.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Tidak ada data kategori
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatRupiah}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => <span className="text-xs text-slate-600">{val}</span>}
          />
          {keys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={COLORS[i % COLORS.length]}
              radius={i === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
