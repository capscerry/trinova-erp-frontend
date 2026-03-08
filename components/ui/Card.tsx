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
        "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          {title && (
            <h2 className="font-serif font-bold text-navy-900 text-[15px]">{title}</h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}
