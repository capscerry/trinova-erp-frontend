"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownFieldProps {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}

export function DropdownField({ value, placeholder, options, onChange }: DropdownFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((p) => !p); setSearch(""); }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded-lg",
          "border border-slate-200 bg-white text-left transition-all",
          "focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500",
          value ? "text-slate-700" : "text-slate-400"
        )}>
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={13} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200
                          rounded-xl shadow-lg overflow-hidden min-w-full">
            <div className="px-3 py-2 border-b border-slate-100">
              <input autoFocus type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200
                           focus:outline-none focus:ring-1 focus:ring-navy-500 text-slate-700 placeholder-slate-400" />
            </div>
            <div className="max-h-44 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400 text-center">Tidak ada data</p>
              ) : filtered.map((opt) => (
                <button key={opt} type="button"
                  onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs transition-colors",
                    opt === value ? "bg-navy-900 text-gold-400 font-semibold" : "text-slate-600 hover:bg-slate-50"
                  )}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}