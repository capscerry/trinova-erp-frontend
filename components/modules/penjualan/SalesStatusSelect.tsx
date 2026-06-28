"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  getStatusTone,
  normalizeSalesStatus,
  SALES_STATUS_OPTIONS,
  type SalesStatusModule,
} from "@/lib/sales-status";
import { salesStatusService } from "@/lib/services/sales-status.service";
import { cn } from "@/lib/utils";

interface SalesStatusSelectProps {
  module: SalesStatusModule;
  id: number | string;
  value?: string | null;
  disabled?: boolean;
  onUpdated?: (status: string) => void;
}

export function SalesStatusSelect({
  module,
  id,
  value,
  disabled,
  onUpdated,
}: SalesStatusSelectProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState(() =>
    normalizeSalesStatus(module, value)
  );
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const options = SALES_STATUS_OPTIONS[module];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setStatus(normalizeSalesStatus(module, value));
  }, [module, value]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(rect.width, 160),
        zIndex: 9999,
      });
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const handleChange = async (nextStatus: string) => {
    if (saving || nextStatus === status) {
      setOpen(false);
      return;
    }

    try {
      setSaving(true);
      await salesStatusService.update(module, id, { status: nextStatus });
      setStatus(nextStatus);
      onUpdated?.(nextStatus);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  const menu =
    open && mounted
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
            />

            <div
              style={menuStyle}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
            >
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleChange(option);
                  }}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50",
                    option === status
                      ? "font-semibold text-navy-900"
                      : "text-slate-600"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || saving}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
          getStatusTone(status),
          (disabled || saving) && "cursor-not-allowed opacity-60"
        )}
        title="Change status"
      >
        {saving ? "Saving..." : status}
        <ChevronDown size={12} />
      </button>

      {menu}
    </>
  );
}