import Link from "next/link";
import { StatCard } from "@/components/ui";
import type { StatCardData, NavModule } from "@/types";

interface ModuleOverviewProps {
  module: NavModule;
  stats: StatCardData[];
}

export function ModuleOverview({ module, stats }: ModuleOverviewProps) {
  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Quick access */}
      {module.children?.map((group) => (
        <div key={group.group} className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 font-serif">
            {group.group}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {group.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group bg-white rounded-xl border border-slate-200 p-5 shadow-sm
                           hover:border-gold-500 hover:shadow-md transition-all duration-200"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500 mb-1.5">
                  {group.group}
                </p>
                <p className="text-[14px] font-bold text-navy-900 font-serif group-hover:text-navy-600 transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-slate-400 mt-1">Kelola data →</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
