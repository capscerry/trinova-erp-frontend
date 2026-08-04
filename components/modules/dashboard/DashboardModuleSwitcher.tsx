"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardModule = "purchasing" | "sales" | "inventory";

const MODULES: { key: DashboardModule; label: string; href: string }[] = [
  { key: "purchasing", label: "Purchasing", href: "/pembelian" },
  { key: "sales", label: "Sales", href: "/penjualan" },
  { key: "inventory", label: "Inventory", href: "/persediaan" },
];

/**
 * Admin-only navigation strip shown on every module dashboard (Purchasing,
 * Sales, Inventory) so Admin can hop between them without digging through
 * the sidebar. Must be rendered on all three -- rendering it on only one
 * page means the switcher itself disappears once Admin navigates away.
 */
export function DashboardModuleSwitcher({ active }: { active: DashboardModule }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
      {MODULES.map((m) =>
        m.key === active ? (
          <span
            key={m.key}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-navy-900 bg-gold-100"
          >
            {m.label}
          </span>
        ) : (
          <Link
            key={m.key}
            href={m.href}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500",
              "hover:bg-slate-100 hover:text-slate-700 transition-colors"
            )}
          >
            {m.label}
          </Link>
        )
      )}
    </div>
  );
}

export default DashboardModuleSwitcher;
