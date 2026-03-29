"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { NAV_CONFIG } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { NavModule } from "@/types";

export function Sidebar() {
  const pathname = usePathname();

  // Determine which module is active from the pathname
  const activeModule = NAV_CONFIG.find(
    (n) => n.id !== "dashboard" && pathname.startsWith("/" + n.id)
  )?.id ?? null;

  const [openModule, setOpenModule] = useState<string | null>(activeModule);

  // Auto-open the module when navigating directly via URL
  // useEffect(() => {
  //   if (activeModule) setOpenModule(activeModule);
  // }, [activeModule]);

  const toggleModule = (id: string) =>
    setOpenModule((prev) => (prev === id ? null : id));

  return (
    <aside className="w-[248px] h-screen bg-navy-900 fixed left-0 top-0 flex flex-col z-50 font-serif">
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="px-5 py-6 border-b border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center text-navy-900 font-extrabold text-lg select-none">
            T
          </div>
          <div>
            <p className="text-gold-400 font-bold tracking-widest text-[15px] uppercase">
              Trinova
            </p>
            <p className="text-slate-600 text-[10px] tracking-[3px] uppercase">
              Business Suite
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_CONFIG.map((module: NavModule) => {
          const isDashboard = module.id === "dashboard";
          const isActive    = isDashboard
            ? pathname === "/dashboard"
            : pathname.startsWith("/" + module.id);
          const isOpen      = openModule === module.id;

          if (isDashboard) {
            return (
              <Link
                key={module.id}
                href={module.href!}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-[11px] text-sm border-l-[3px] transition-all duration-150",
                  isActive
                    ? "border-gold-500 bg-gradient-to-r from-navy-600 to-navy-700 text-gold-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-navy-800"
                )}
              >
                <span className="text-[7px] opacity-60">●</span>
                {module.label}
              </Link>
            );
          }

          return (
            <div key={module.id}>
              {/* Module toggle button */}
              <button
                onClick={() => toggleModule(module.id)}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-[11px] text-sm border-l-[3px] transition-all duration-150",
                  isActive
                    ? "border-gold-500 text-gold-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-navy-800"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-[7px] opacity-60">●</span>
                  {module.label}
                </span>
                <ChevronRight
                  size={13}
                  className={cn(
                    "opacity-50 transition-transform duration-200",
                    isOpen && "rotate-90"
                  )}
                />
              </button>

              {/* Sub-menu */}
              {isOpen && (
                <div className="bg-navy-800/60 pb-1">
                  {module.children?.map((group) => (
                    <div key={group.group}>
                      <p className="px-9 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[2px] text-slate-600">
                        {group.group}
                      </p>
                      {group.items.map((item) => {
                        const itemActive = pathname === item.href;
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                              "block px-9 py-2 text-[13px] border-l-2 transition-all duration-150",
                              itemActive
                                ? "border-gold-500 text-gold-400 bg-navy-700/60"
                                : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-navy-700/40"
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

      {/* ── User ─────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-gold-500 text-xs font-bold select-none">
            AR
          </div>
          <div>
            <p className="text-slate-300 text-[13px]">Ahmad Rizky</p>
            <p className="text-slate-600 text-[11px]">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
