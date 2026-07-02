"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationContext";
import { getNavForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NotificationPanel } from "./NotificationPanel";

interface ModuleLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ModuleLayout({ title, subtitle, children }: ModuleLayoutProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();
  const bellWrapperRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [bellOpen, setBellOpen] = React.useState(false);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  }

  if (!user) return null;

  const navForRole = getNavForRole(user.role);
  const moduleNav =
    navForRole.find((module) => module.id !== "dashboard" && module.children && pathname.startsWith(`/${module.id}`)) ??
    navForRole.find((module) => module.id !== "dashboard" && module.children);

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
            <form
              onSubmit={handleSearch}
              className={`hidden w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-all duration-150 md:flex ${
                focused ? "ring-2 ring-gold-400 bg-white" : ""
              }`}
            >
              <button type="submit" aria-label="Search" className="flex items-center">
                <Search size={13} className="shrink-0 text-slate-400" />
              </button>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </form>

            <div className="relative" ref={bellWrapperRef}>
              <button
                type="button"
                onClick={() => setBellOpen((open) => !open)}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100"
              >
                <Bell size={15} className="text-slate-500" />
                <span
                  className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white transition-colors ${
                    unreadCount > 0 ? "bg-red-500" : "bg-slate-300"
                  }`}
                />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              <NotificationPanel
                open={bellOpen}
                onClose={() => setBellOpen(false)}
                anchorRef={bellWrapperRef}
              />
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
              type="button"
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Logout"
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
