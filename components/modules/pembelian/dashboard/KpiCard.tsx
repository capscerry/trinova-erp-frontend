"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  change?: number;        // percentage change vs previous period
  changeSuffix?: string;  // e.g. "vs last month"
  icon: LucideIcon;
  iconBg?: string;        // tailwind bg class
  iconColor?: string;     // tailwind text class
  loading?: boolean;
  onClick?: () => void;
  accentColor?: "blue" | "emerald" | "amber" | "rose" | "indigo" | "purple";
}

const ACCENT: Record<string, { border: string; iconBg: string; iconColor: string; changeUp: string; changeDown: string }> = {
  blue:    { border: "border-blue-100",   iconBg: "bg-blue-50",   iconColor: "text-blue-600",   changeUp: "text-emerald-600", changeDown: "text-rose-500" },
  emerald: { border: "border-emerald-100",iconBg: "bg-emerald-50",iconColor: "text-emerald-600",changeUp: "text-emerald-600", changeDown: "text-rose-500" },
  amber:   { border: "border-amber-100",  iconBg: "bg-amber-50",  iconColor: "text-amber-600",  changeUp: "text-emerald-600", changeDown: "text-rose-500" },
  rose:    { border: "border-rose-100",   iconBg: "bg-rose-50",   iconColor: "text-rose-600",   changeUp: "text-rose-500",    changeDown: "text-emerald-600" },
  indigo:  { border: "border-indigo-100", iconBg: "bg-indigo-50", iconColor: "text-indigo-600", changeUp: "text-emerald-600", changeDown: "text-rose-500" },
  purple:  { border: "border-purple-100", iconBg: "bg-purple-50", iconColor: "text-purple-600", changeUp: "text-emerald-600", changeDown: "text-rose-500" },
};

export function KpiCard({
  title,
  value,
  subValue,
  change,
  changeSuffix = "vs period sebelumnya",
  icon: Icon,
  loading = false,
  onClick,
  accentColor = "blue",
}: KpiCardProps) {
  const accent = ACCENT[accentColor];
  const isUp   = (change ?? 0) >= 0;
  const isFlat = change === undefined || change === null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all duration-200",
        accent.border,
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", accent.iconBg)}>
          <Icon size={17} className={accent.iconColor} />
        </div>
      </div>

      {/* Main value */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div>
            <p className="text-[28px] font-bold text-slate-800 leading-tight tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>
            )}
          </div>

          {/* Change indicator */}
          {!isFlat && (
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                isUp
                  ? "bg-emerald-50 " + accent.changeUp
                  : "bg-rose-50 text-rose-500"
              )}>
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {isUp ? "+" : ""}{change!.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400">{changeSuffix}</span>
            </div>
          )}

          {/* When change is undefined we render nothing - no N/A badge */}
        </>
      )}
    </div>
  );
}
