import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ title, action, className, children, noPadding }: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          {title && (
            <h2 className="text-[15px] font-bold text-navy-900">{title}</h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}
