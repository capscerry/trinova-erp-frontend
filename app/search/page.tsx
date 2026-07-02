"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { useAuth } from "@/lib/AuthContext";
import { getNavForRole } from "@/lib/nav";
import { Search, ArrowRight, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Flatten all nav items into a searchable list ─────────────────────────────

interface NavItem {
  id: string;
  label: string;
  href: string;
  group: string;
  module: string;
}

function getAllNavItems(role: string): NavItem[] {
  const nav = getNavForRole(role as any);
  const items: NavItem[] = [];

  for (const module of nav) {
    if (module.href) {
      // top-level single page (e.g. Dashboard, Rekomendasi AI)
      items.push({
        id:     module.id,
        label:  module.label,
        href:   module.href,
        group:  "",
        module: module.label,
      });
    }
    if (module.children) {
      for (const group of module.children) {
        for (const item of group.items) {
          items.push({
            id:     item.id,
            label:  item.label,
            href:   item.href,
            group:  group.group,
            module: module.label,
          });
        }
      }
    }
  }
  return items;
}

// ── Module accent colours ─────────────────────────────────────────────────────

const MODULE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  Penjualan:       { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"   },
  Pembelian:       { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200"  },
  Persediaan:      { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200"   },
  "Rekomendasi AI":{ bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Dashboard:       { bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200"  },
};

function moduleBadge(module: string) {
  const c = MODULE_COLOR[module] ?? { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", c.bg, c.text, c.border)}>
      {module}
    </span>
  );
}

// ── Highlight matched portion of text ────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-gold-100 text-gold-700 rounded px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Search results core ───────────────────────────────────────────────────────

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const query = searchParams.get("q")?.trim() ?? "";

  if (!user) return null;

  const allItems = getAllNavItems(user.role);

  const results = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.module.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Group results by module for cleaner display
  const grouped = results.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.module;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-2">
      {/* ── Search bar (re-search from this page) ────────────────────────── */}
      <SearchBar initialQuery={query} />

      {/* ── Result summary ───────────────────────────────────────────────── */}
      {query && (
        <p className="text-sm text-slate-400">
          {results.length === 0
            ? `Tidak ada halaman yang cocok dengan "${query}"`
            : `${results.length} halaman ditemukan untuk "${query}"`}
        </p>
      )}

      {/* ── No query state ───────────────────────────────────────────────── */}
      {!query && (
        <div className="bg-white rounded-2xl border border-slate-100 px-8 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Search size={20} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold text-sm">Cari halaman atau fitur</p>
          <p className="text-slate-400 text-xs max-w-xs">
            Ketik kata kunci di kolom pencarian untuk menemukan modul, transaksi, atau pengaturan.
          </p>
        </div>
      )}

      {/* ── No results state ─────────────────────────────────────────────── */}
      {query && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 px-8 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <FolderOpen size={20} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold text-sm">Halaman tidak ditemukan</p>
          <p className="text-slate-400 text-xs max-w-xs">
            Coba kata kunci lain, atau periksa ejaan Anda.
          </p>
        </div>
      )}

      {/* ── Results grouped by module ─────────────────────────────────────── */}
      {Object.entries(grouped).map(([moduleName, items]) => (
        <div key={moduleName}>
          <div className="flex items-center gap-2 mb-2 px-1">
            {moduleBadge(moduleName)}
            <span className="text-[11px] text-slate-400 font-medium">{items.length} halaman</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-navy-800 leading-none">
                    <Highlight text={item.label} query={query} />
                  </p>
                  {item.group && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      <Highlight text={item.group} query={query} />
                    </p>
                  )}
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-gold-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Inline search bar (re-search without leaving the page) ───────────────────

function SearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-gold-400 focus-within:border-gold-400 transition-all">
      <Search size={15} className="text-slate-400 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cari halaman atau fitur..."
        className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(""); inputRef.current?.focus(); }}
          className="text-slate-300 hover:text-slate-500 transition-colors text-xs font-bold"
          aria-label="Clear"
        >
          ✕
        </button>
      )}
      <button
        type="submit"
        className="text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors pl-2 border-l border-slate-200"
      >
        Cari
      </button>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <AppShell title="Pencarian" subtitle="Temukan halaman atau fitur">
      <Suspense
        fallback={
          <div className="max-w-2xl mx-auto mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse h-14 bg-white rounded-2xl border border-slate-100" />
            ))}
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </AppShell>
  );
}
