import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  addLabel?: string;
  onAdd?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  addLabel,
  onAdd,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex items-start justify-between", className)}>
      <div>
        <h1 className="text-xl font-bold leading-tight text-navy-900">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onAdd && addLabel && (
          <Button variant="primary" size="md" onClick={onAdd}>
            + {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
