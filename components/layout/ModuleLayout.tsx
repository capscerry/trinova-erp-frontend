"use client";
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  if (!user) return null;

  // Ambil modul berdasarkan path yang sedang aktif
  const navForRole = getNavForRole(user.role);
  const moduleNav  = navForRole.find(
    (m) => m.id !== "dashboard" && m.children && pathname.startsWith(`/${m.id}`)
  ) ?? navForRole.find((m) => m.id !== "dashboard" && m.children);

  return (
    <div className="min-h-screen bg-slate-100 font-serif">
      {/* ── Topbar ───────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center text-navy-900 font-extrabold text-base select-none">
            T
          </div>
          <div>
            <p className="text-navy-900 font-bold tracking-widest text-[13px] uppercase leading-none">Trinova</p>
            <p className="text-slate-400 text-[9px] tracking-[2px] uppercase">{moduleNav?.label ?? user.role}</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <form
            onSubmit={handleSearch}
            className={`flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-48 transition-all duration-150 ${
              focused ? "ring-2 ring-gold-400 bg-white" : ""
            }`}
          >
            <button type="submit" aria-label="Cari" className="flex items-center">
              <Search size={13} className="text-slate-400 shrink-0" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Cari..."
              className="bg-transparent text-sm text-slate-400 placeholder:text-slate-400 outline-none w-full"
            />
          </form>
          <div className="relative w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
            <Bell size={15} className="text-slate-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </div>
          {/* User */}
          <div className="flex items-center gap-2 ml-1">
            <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-gold-500 text-xs font-bold select-none">
              {user.initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-slate-700 text-[13px] font-bold leading-none">{user.name}</p>
              <p className="text-slate-400 text-[11px] capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
            title="Keluar"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Sub-menu tabs (group) ─────────────────────────── */}
      {moduleNav?.children && (
        <div className="bg-white border-b border-slate-200 px-8">
          <div className="flex gap-1 overflow-x-auto">
            {moduleNav.children.map((group) =>
              group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "px-4 py-3 text-[13px] whitespace-nowrap border-b-2 transition-all duration-150",
                      isActive
                        ? "border-gold-500 text-gold-600 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
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

      {/* ── Page header ──────────────────────────────────── */}
      <div className="px-8 pt-6 pb-0">
        <h1 className="text-lg font-bold text-navy-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <main className="p-8 pt-5">{children}</main>
    </div>
  );
}