"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { POStatusCount } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: POStatusCount[];
  loading?: boolean;
  onSliceClick?: (status: string) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700">{d.name}</p>
      <p className="text-slate-600">{d.value} PO</p>
      <p className="text-slate-400 text-xs">{d.payload.percent ? `${(d.payload.percent * 100).toFixed(1)}%` : ""}</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function POStatusDonut({ data, loading, onSliceClick }: Props) {
  if (loading) return <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />;
  if (!data.length) return (
    <div className="h-56 flex items-center justify-center text-slate-400 text-sm">Tidak ada data</div>
  );

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="h-56 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            dataKey="count"
            nameKey="status"
            labelLine={false}
            label={renderCustomLabel}
            onClick={(entry: any) => onSliceClick?.(entry.status)}
            style={{ cursor: onSliceClick ? "pointer" : "default" }}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => <span className="text-xs text-slate-600">{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: "-12px" }}>
        <span className="text-2xl font-bold text-slate-700">{total}</span>
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Total PO</span>
      </div>
    </div>
  );
}
