"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brain, Building2, ChevronRight, LayoutDashboard, LogOut, Package, Shield, ShoppingCart, type LucideIcon } from "lucide-react";
import { getNavForRole } from "@/lib/nav";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import type { NavModule } from "@/types";

const moduleIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  user: Shield,
  penjualan: ShoppingCart,
  pembelian: ShoppingCart,
  persediaan: Package,
  rekomendasi: Brain,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navConfig = user ? getNavForRole(user.role) : [];
  const activeModule = navConfig.find(
    (n) => n.id !== "dashboard" && pathname.startsWith("/" + n.id)
  )?.id ?? null;
  const [openModule, setOpenModule] = useState<string | null>(activeModule);

  const toggleModule = (id: string) =>
    setOpenModule((prev) => (prev === id ? null : id));

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[264px] flex-col bg-navy-900 text-slate-300 shadow-xl">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-lg font-extrabold text-navy-900 shadow-sm">
            T
          </div>
          <div>
            <p className="text-[15px] font-extrabold uppercase tracking-widest text-white">Trinova</p>
            <p className="text-[10px] font-semibold uppercase tracking-[2px] text-gold-400">Business Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navConfig.map((module: NavModule) => {
          const isDirectLink = !!module.href && !module.children;
          const isActive = isDirectLink
            ? pathname === module.href || pathname.startsWith("/" + module.id)
            : pathname.startsWith("/" + module.id);
          const isOpen = openModule === module.id;
          const ModuleIcon = moduleIcons[module.id] ?? Building2;

          if (isDirectLink) {
            return (
              <Link
                key={module.id}
                href={module.href!}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-white/10 text-gold-400 shadow-sm ring-1 ring-white/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <ModuleIcon size={16} className="shrink-0" />
                {module.label}
              </Link>
            );
          }

          return (
            <div key={module.id} className="mb-1">
              <button
                onClick={() => toggleModule(module.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-white/10 text-gold-400 shadow-sm ring-1 ring-white/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="flex items-center gap-3">
                  <ModuleIcon size={16} className="shrink-0" />
                  {module.label}
                </span>
                <ChevronRight
                  size={14}
                  className={cn("opacity-60 transition-transform", isOpen && "rotate-90")}
                />
              </button>

              {isOpen && (
                <div className="mt-1 rounded-lg bg-black/10 py-2">
                  {module.children?.map((group) => (
                    <div key={group.group} className="py-1">
                      <p className="px-7 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {group.group}
                      </p>
                      {group.items.map((item) => {
                        const itemActive = pathname === item.href;
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                              "mx-2 block rounded-md px-5 py-2 text-[13px] font-medium transition-colors",
                              itemActive
                                ? "bg-gold-400/10 text-gold-400"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-600 text-xs font-bold text-gold-400">
              {user?.initials ?? "??"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">{user?.name}</p>
              <p className="text-[11px] capitalize text-slate-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
            title="Keluar"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}




