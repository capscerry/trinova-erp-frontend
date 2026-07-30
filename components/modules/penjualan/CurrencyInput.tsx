"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

const formatDigits = (n: number) => (n > 0 ? new Intl.NumberFormat("id-ID").format(n) : "");

/**
 * Input harga dengan pemisah ribuan live ("1.500.000") + prefix "Rp" --
 * angka mentah (tanpa separator) tetap yang dikirim lewat onChange. Dipakai
 * di semua form line-item (Sales Order, Faktur Penjualan) supaya nominal
 * besar gampang dibaca & dicek user saat mengetik, bukan cuma deretan digit.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  compact = false,
  disabled = false,
  className,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(formatDigits(value));

  useEffect(() => {
    setDisplay(formatDigits(value));
  }, [value]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    const num = digits ? Number(digits) : 0;
    setDisplay(digits ? new Intl.NumberFormat("id-ID").format(num) : "");
    onChange(num);
  };

  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white text-right font-mono tabular-nums",
          "text-slate-700 placeholder-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all",
          compact ? "py-1.5 pl-7 pr-2.5 text-xs" : "py-2.5 pl-8 pr-3 text-sm",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50",
          className
        )}
      />
    </div>
  );
}
