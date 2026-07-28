"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";
import type { CustomerRevenue } from "@/lib/services/sales-kpi.service";

interface Props {
  data: CustomerRevenue[];
  loading?: boolean;
  onBarClick?: (customerId: number) => void;
}

function formatRupiah(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}Rb`;
  return `Rp ${v}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const rank = payload[0]?.payload?.rank;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm max-w-[240px]">
      <p className="font-semibold text-slate-700 mb-1">
        {rank && <span className="text-emerald-600 mr-1">#{rank}</span>}
        {payload[0]?.payload?.customer_name}
      </p>
      <p className="text-emerald-600 font-bold">{formatRupiah(payload[0].value)}</p>
    </div>
  );
};

// Warna solid dengan kontras konsisten — peringkat 1 disorot lebih gelap,
// sisanya satu tone yang sama supaya tetap terbaca sampai baris ke-10
// (gradasi lama memudar hampir putih di baris bawah).
const BASE_COLOR = "#10b981";
const TOP_COLOR = "#047857";

export function TopCustomersBar({ data, loading, onBarClick }: Props) {
  if (loading) return <div className="h-72 bg-slate-50 rounded-xl animate-pulse" />;
  if (!data.length) return <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Belum ada data</div>;

  const chartData = data.map((d, i) => ({
    ...d,
    rank: i + 1,
    name: d.customer_name.length > 22 ? d.customer_name.slice(0, 20) + "…" : d.customer_name,
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tickFormatter={formatRupiah} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={130} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            onClick={(entry: any) => onBarClick?.(entry.customer_id)}
            style={{ cursor: onBarClick ? "pointer" : "default" }}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={i === 0 ? TOP_COLOR : BASE_COLOR} fillOpacity={i === 0 ? 1 : 0.75} />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              formatter={(v) => formatRupiah(Number(v))}
              style={{ fontSize: 10, fontWeight: 600, fill: "#334155" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
