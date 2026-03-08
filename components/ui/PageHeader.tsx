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
    <div className={cn("flex items-start justify-between mb-6", className)}>
      <div>
        <h1 className="text-xl font-bold font-serif text-navy-900 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-0.5 font-serif">{subtitle}</p>
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
