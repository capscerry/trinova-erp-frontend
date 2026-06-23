"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  /** The technical term shown inline */
  term: string;
  /** The plain-language explanation shown in the popover */
  label: string;
  /** Optional extra class for the trigger span */
  className?: string;
}

/**
 * Inline tooltip: renders `term` as a dotted-underline span.
 * On hover a styled popover appears with the friendly `label`.
 *
 * Usage:
 *   <Tooltip term="HHI" label="Indeks Diversifikasi — mengukur seberapa tersebar pembelian antar supplier" />
 */
export function Tooltip({ term, label, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"top" | "bottom">("top");
  const ref = useRef<HTMLSpanElement>(null);

  // Decide whether to pop above or below depending on available space
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setSide(rect.top > 80 ? "top" : "bottom");
  }, [open]);

  return (
    <span
      ref={ref}
      className={cn("relative inline-flex items-center gap-0.5 group cursor-help", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {/* The visible term — dotted underline signals it's interactive */}
      <span className="border-b border-dotted border-slate-400 text-inherit leading-none">
        {term}
      </span>

      {/* Popover */}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 left-1/2 -translate-x-1/2 w-max max-w-[220px]",
            "bg-navy-900 text-white text-[11px] font-serif font-normal leading-relaxed",
            "px-3 py-2 rounded-xl shadow-xl border border-navy-700 pointer-events-none",
            "animate-in fade-in-0 zoom-in-95 duration-100",
            side === "top"    && "bottom-[calc(100%+6px)]",
            side === "bottom" && "top-[calc(100%+6px)]",
          )}
        >
          {/* Arrow */}
          <span
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-0 h-0",
              "border-x-4 border-x-transparent",
              side === "top"    && "top-full border-t-4 border-t-navy-900",
              side === "bottom" && "bottom-full border-b-4 border-b-navy-900",
            )}
          />
          <span className="text-gold-400 font-bold block mb-0.5">{term}</span>
          {label}
        </span>
      )}
    </span>
  );
}
