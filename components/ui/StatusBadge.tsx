import { cn, getStatusVariant } from "@/lib/utils";
import type { StatusVariant } from "@/types";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-green-50 text-green-800 border border-green-200",
  warning: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  danger:  "bg-red-50 text-red-800 border border-red-200",
  info:    "bg-blue-50 text-blue-800 border border-blue-200",
  default: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? getStatusVariant(status);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-sans",
        variantStyles[resolvedVariant],
        className
      )}
    >
      {status}
    </span>
  );
}
