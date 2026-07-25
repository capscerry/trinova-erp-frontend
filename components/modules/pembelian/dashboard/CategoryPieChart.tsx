"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { CategorySpend } from "@/lib/services/purchasing-kpi.service";

interface Props {
  data: CategorySpend[];
  loading?: boolean;
}

const COLORS = ["#3b82f6","#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#f97316","#64748b","#84cc16"];

function formatRupiah(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}Rb`;
  return `Rp ${v}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{payload[0].name}</p>
      <p className="text-blue-600 font-bold">{formatRupiah(payload[0].value)}</p>
      <p className="text-slate-400 text-xs">{payload[0].payload.percent ? `${(payload[0].payload.percent * 100).toFixed(1)}%` : ""}</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function CategoryPieChart({ data, loading }: Props) {
  if (loading) return <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />;
  if (!data.length) return (
    <div className="h-56 flex items-center justify-center text-slate-400 text-sm">Tidak ada data</div>
  );

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={80}
            labelLine={false}
            label={renderCustomLabel}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
    </div>
  );
}
