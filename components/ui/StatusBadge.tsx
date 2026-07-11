import { cn, getStatusVariant } from "@/lib/utils";
import type { StatusVariant } from "@/types";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const dotStyles : Record<StatusVariant,string> = {
  success : "bg-green-500",
  warning : "bg-yellow-500",
  danger : "bg-red-500",
  info : "bg-blue-500",
  default : "bg-gray-500",
}


export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? getStatusVariant(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-slate-700 font-sans",
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotStyles[resolvedVariant])} />
      {status}
    </span>
  );
}
