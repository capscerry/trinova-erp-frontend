import { cn } from "@/lib/utils";
import type { StatCardData } from "@/types";

interface StatCardProps extends StatCardData {
  className?: string;
}

export function StatCard({ label, value, change, trend, sub, className }: StatCardProps) {
  const isUp = trend === "up";
  return (
    <div
      className={cn(
        "bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-1.5",
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-serif">{label}</p>
      <p className="text-2xl font-bold text-navy-900 font-serif leading-tight">{value}</p>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs font-bold font-sans",
            isUp ? "text-green-700" : "text-red-700"
          )}
        >
          {isUp ? "▲" : "▼"} {change}
        </span>
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
    </div>
  );
}
