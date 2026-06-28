"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getNavForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Bell, LogOut, Search } from "lucide-react";

interface ModuleLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ModuleLayout({ title, subtitle, children }: ModuleLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navForRole = getNavForRole(user.role);
  const moduleNav = navForRole.find(
    (m) => m.id !== "dashboard" && m.children && pathname.startsWith(`/${m.id}`)
  ) ?? navForRole.find((m) => m.id !== "dashboard" && m.children);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-base font-extrabold text-gold-400">
              T
            </div>
            <div>
              <p className="text-[13px] font-extrabold uppercase tracking-widest text-navy-900">Trinova</p>
              <p className="text-[10px] font-semibold uppercase tracking-[2px] text-slate-400">
                {moduleNav?.label ?? user.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search size={13} className="text-slate-400" />
              <span className="text-sm text-slate-400">Cari...</span>
            </div>
            <div className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100">
              <Bell size={15} className="text-slate-500" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-600 text-xs font-bold text-gold-400">
                {user.initials}
              </div>
              <div>
                <p className="text-[13px] font-bold leading-none text-slate-700">{user.name}</p>
                <p className="text-[11px] capitalize text-slate-400">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Keluar"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {moduleNav?.children && (
          <div className="border-t border-slate-100 px-6 md:px-8">
            <div className="flex gap-1 overflow-x-auto">
              <Link
                href={`/${moduleNav.id}`}
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 py-3 text-[13px] font-semibold transition-colors",
                  pathname === `/${moduleNav.id}`
                    ? "border-gold-500 text-navy-900"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800"
                )}
              >
                Dashboard
              </Link>
              {moduleNav.children.map((group) =>
                group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "whitespace-nowrap border-b-2 px-4 py-3 text-[13px] font-semibold transition-colors",
                        isActive
                          ? "border-gold-500 text-navy-900"
                          : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </header>

      <div className="px-6 pt-6 md:px-8">
        <h1 className="text-xl font-bold leading-tight text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>

      <main className="px-6 py-5 md:px-8">{children}</main>
    </div>
  );
}
