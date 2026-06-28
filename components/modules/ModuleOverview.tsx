import Link from "next/link";
import { StatCard } from "@/components/ui";
import type { StatCardData, NavModule } from "@/types";

interface ModuleOverviewProps {
  module: NavModule;
  stats: StatCardData[];
}

export function ModuleOverview({ module, stats }: ModuleOverviewProps) {
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {module.children?.map((group) => (
        <div key={group.group}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {group.group}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {group.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gold-500 hover:shadow-md"
              >
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gold-500">
                  {group.group}
                </p>
                <p className="text-[14px] font-bold text-navy-900 transition-colors group-hover:text-navy-600">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">Kelola data</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
