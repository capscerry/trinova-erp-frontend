"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

interface Props {
  data: Array<{ supplier: string; score: number }>;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const score = payload[0].value as number;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm max-w-[220px]">
      <p className="font-semibold text-slate-700 truncate mb-1">{payload[0]?.payload?.supplier}</p>
      <p className="font-bold" style={{ color }}>Skor AI: {score}%</p>
    </div>
  );
};

function getBarColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

export function SupplierPerformanceBar({ data, loading }: Props) {
  if (loading) return <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />;
  if (!data.length) return (
    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
      Belum ada data AI score — jalankan rekomendasi supplier terlebih dahulu
    </div>
  );

  const chartData = data.map((d) => ({
    ...d,
    name: d.supplier.length > 16 ? d.supplier.slice(0, 14) + "…" : d.supplier,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 32, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
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
          <ReferenceLine x={80} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5} />
          <ReferenceLine x={60} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
