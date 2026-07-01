"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-bold font-serif text-navy-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 font-serif">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* ── Search ─────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className={`flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-56 transition-all duration-150 ${
            focused ? "ring-2 ring-gold-400 bg-white" : ""
          }`}
        >
          <button type="submit" aria-label="Cari" className="flex items-center">
            <Search size={14} className="text-slate-400 shrink-0" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Cari transaksi..."
            className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none w-full font-serif"
          />
        </form>

        <div className="relative w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
          <Bell size={16} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </div>
        {user && (
          <button
            onClick={logout}
            className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
            title="Keluar"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
