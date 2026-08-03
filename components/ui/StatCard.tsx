import { cn } from "@/lib/utils";
import type { StatCardData } from "@/types";

interface StatCardProps extends StatCardData {
  className?: string;
}

export function StatCard({ label, value, sub, className }: StatCardProps) {

  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-bold leading-tight text-navy-900">{value}</p>
      <div className="flex items-center">
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
    </div>
  );
}
