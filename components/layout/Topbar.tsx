"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationContext";
import { NotificationPanel } from "./NotificationPanel";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
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

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">
      <div>
        <h1 className="text-lg font-bold leading-tight text-navy-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <form
          onSubmit={handleSearch}
          className={`hidden w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-all duration-150 md:flex ${
            focused ? "ring-2 ring-gold-400 bg-white" : ""
          }`}
        >
          <button type="submit" aria-label="Search" className="flex items-center">
            <Search size={14} className="shrink-0 text-slate-400" />
          </button>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search transactions..."
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
            <Bell size={16} className="text-slate-500" />
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

        {user && (
          <>
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 md:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-white">
                {user.initials ?? user.name?.charAt(0) ?? user.username?.charAt(0) ?? "U"}
              </div>
              <div className="leading-tight">
                <p className="max-w-28 truncate text-xs font-semibold text-slate-800">{user.name ?? user.username}</p>
                <p className="text-[11px] capitalize text-slate-500">{user.role}</p>
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
          </>
        )}
      </div>
    </header>
  );
}


