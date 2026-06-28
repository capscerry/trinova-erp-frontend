"use client";

import { Bell, LogOut, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">
      <div>
        <h1 className="text-lg font-bold leading-tight text-navy-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <Search size={14} className="text-slate-400" />
          <span className="text-sm text-slate-400">Cari transaksi...</span>
        </div>
        <div className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100">
          <Bell size={16} className="text-slate-500" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </div>
        {user && (
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Keluar"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
