"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
  /** The technical term shown inline */
  term: string;
  /** The plain-language explanation shown in the popover */
  label: string;
  /** Optional extra class for the trigger span */
  className?: string;
}

interface PopoverPos {
  top: number;
  left: number;
  side: "top" | "bottom";
}

/**
 * Inline tooltip: renders `term` as a dotted-underline span.
 * On hover a styled popover appears with the friendly `label`.
 *
 * The popover is rendered via a React portal into document.body so it
 * escapes overflow:hidden / overflow-x:auto containers that would clip it.
 */
export function Tooltip({ term, label, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const computePos = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const side: "top" | "bottom" = rect.top > 100 ? "top" : "bottom";
    setPos({
      top:  side === "top"
              ? rect.top + window.scrollY - 8   // will be pushed up by transform
              : rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX + rect.width / 2,
      side,
    });
  }, []);

  const handleEnter = () => { computePos(); setOpen(true); };
  const handleLeave = () => setOpen(false);

  return (
    <span
      ref={ref}
      className={cn("relative inline-flex items-center gap-0.5 cursor-help", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      tabIndex={0}
    >
      {/* Visible term with dotted underline */}
      <span className="border-b border-dotted border-slate-400 text-inherit leading-none">
        {term}
      </span>

      {/* Portal popover — escapes any overflow-hidden ancestor */}
      {mounted && open && pos && createPortal(
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top:  pos.side === "top"    ? pos.top  : pos.top,
            left: pos.left,
            transform: pos.side === "top"
              ? "translate(-50%, -100%)"
              : "translate(-50%, 0)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
          className={cn(
            "w-max max-w-[240px]",
            "bg-navy-900 text-white text-[11px] font-serif font-normal leading-relaxed",
            "px-3 py-2 rounded-xl shadow-xl border border-navy-700",
          )}
        >
          {/* Arrow */}
          <span
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              ...(pos.side === "top"
                ? { top: "100%", borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #0f172a" }
                : { bottom: "100%", borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "4px solid #0f172a" }
              ),
            }}
          />
          <span className="text-gold-400 font-bold block mb-0.5">{term}</span>
          {label}
        </span>,
        document.body
      )}
    </span>
  );
}
