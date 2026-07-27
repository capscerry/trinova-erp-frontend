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
import type { SupplierSpend } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: SupplierSpend[];
  loading?: boolean;
  onBarClick?: (supplierId: number) => void;
}

function formatRupiah(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}Rb`;
  return `Rp ${v}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm max-w-[220px]">
      <p className="font-semibold text-slate-700 truncate mb-1">{payload[0]?.payload?.supplier_name}</p>
      <p className="text-blue-600 font-bold">{formatRupiah(payload[0].value)}</p>
    </div>
  );
};

const COLORS = ["#1d4ed8","#2563eb","#3b82f6","#60a5fa","#93c5fd","#bfdbfe","#dbeafe","#eff6ff","#f0f9ff","#f8fafc"];

export function TopSuppliersBar({ data, loading, onBarClick }: Props) {
  if (loading) return <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />;
  if (!data.length) return (
    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Belum ada data</div>
  );

  const chartData = data.map((d) => ({
    ...d,
    name: d.supplier_name.length > 16 ? d.supplier_name.slice(0, 14) + "…" : d.supplier_name,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatRupiah}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
            width={96}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            onClick={(entry: any) => onBarClick?.(entry.supplier_id)}
            style={{ cursor: onBarClick ? "pointer" : "default" }}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
