"use client";

import { Bell, Search } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Left: breadcrumb / title */}
      <div>
        <h1 className="text-lg font-bold font-serif text-navy-900 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5 font-serif">{subtitle}</p>
        )}
      </div>

      {/* Right: search + notifications */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-56">
          <Search size={14} className="text-slate-400" />
          <span className="text-sm text-slate-400 font-serif">Cari transaksi...</span>
        </div>
        <div className="relative w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
          <Bell size={16} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </div>
      </div>
    </header>
  );
}
