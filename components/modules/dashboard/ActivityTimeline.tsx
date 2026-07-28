"use client";

/**
 * ActivityTimeline
 *
 * Enterprise-style vertical activity timeline for ERP dashboards.
 * Displays the latest 20 transactions from all modules (Purchasing,
 * Inventory, Sales, Auth, Master Data) in chronological newest-first order.
 *
 * Each entry shows:
 *  - Time of day (local timezone)
 *  - Module badge
 *  - Activity title
 *  - Description / document number
 *  - Status-coloured dot
 *  - User name (when available)
 *
 * Data source: activity-log.service.ts → tries /activity-log first, then
 * falls back to polling individual transaction endpoints.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ShoppingCart,
  Package,
  FileText,
  CreditCard,
  RotateCcw,
  LogIn,
  LogOut,
  User,
  Box,
  TrendingUp,
  ClipboardList,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRecentActivities,
  type ActivityLogEntry,
  type ActivityStatus,
} from "@/lib/services/activity-log.service";

// ─── Visual helpers ───────────────────────────────────────────────────────────

const STATUS_DOT: Record<ActivityStatus, string> = {
  success: "bg-emerald-500 border-emerald-300",
  warning: "bg-amber-400  border-amber-200",
  error:   "bg-red-500    border-red-300",
  info:    "bg-blue-500   border-blue-300",
};

const STATUS_BADGE: Record<ActivityStatus, string> = {
  success: "bg-emerald-50  text-emerald-700 border-emerald-200",
  warning: "bg-amber-50    text-amber-700   border-amber-200",
  error:   "bg-red-50      text-red-700     border-red-200",
  info:    "bg-blue-50     text-blue-700    border-blue-200",
};

const MODULE_ICON: Record<string, React.ElementType> = {
  purchasing:  ShoppingCart,
  inventory:   Box,
  sales:       TrendingUp,
  masterdata:  ClipboardList,
  auth:        LogIn,
};

function getModuleIcon(module: string): React.ElementType {
  return MODULE_ICON[module.toLowerCase().replace(/\s/g, "")] ?? Activity;
}

const DOC_TYPE_ICON: Record<string, React.ElementType> = {
  "purchase order":    ShoppingCart,
  "goods receipt":     Package,
  "purchase invoice":  FileText,
  "purchase payment":  CreditCard,
  "down payment":      CreditCard,
  "purchase return":   RotateCcw,
  "sales order":       TrendingUp,
  "delivery order":    Package,
  "invoice":           FileText,
  "payment":           CreditCard,
  "sales return":      RotateCcw,
  "login":             LogIn,
  "logout":            LogOut,
  "product created":   Box,
  "supplier updated":  User,
  "customer added":    User,
};

function getDocIcon(docType: string): React.ElementType {
  return DOC_TYPE_ICON[docType.toLowerCase()] ?? Activity;
}

// ─── Time formatters (local timezone) ─────────────────────────────────────────

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      weekday: "long",
      day:     "numeric",
      month:   "long",
    });
  } catch {
    return "–";
  }
}

function fmtDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day:   "2-digit",
      month: "short",
      year:  "numeric",
    });
  } catch {
    return "–";
  }
}

function getDateKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
          <div className="flex flex-col items-center gap-1 w-12 shrink-0 pt-0.5">
            <div className="h-3 w-10 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="w-px bg-slate-100 self-stretch mx-1" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function TimelineEmpty({ error }: { error?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
      <Activity size={28} className="opacity-30" />
      <p className="text-sm font-medium">
        {error ? "Gagal memuat aktivitas" : "Belum ada aktivitas"}
      </p>
      {error && (
        <p className="text-xs text-slate-400 text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}

// ─── Single timeline entry ────────────────────────────────────────────────────

interface EntryProps {
  entry: ActivityLogEntry;
  isLast: boolean;
}

function TimelineEntry({ entry, isLast }: EntryProps) {
  const DocIcon = getDocIcon(entry.documentType);
  const dotCls  = STATUS_DOT[entry.status];
  const badgeCls = STATUS_BADGE[entry.status];

  const inner = (
    <div
      className={cn(
        "group relative flex gap-3 py-3 pl-0 pr-2",
        !isLast && "border-b border-slate-50",
        entry.href && "cursor-pointer hover:bg-slate-50/70 rounded-xl -mx-1 px-1 transition-colors"
      )}
    >
      {/* Left: time column */}
      <div className="w-11 shrink-0 flex flex-col items-end gap-0.5 pt-0.5">
        <span className="text-[11px] font-bold tabular-nums text-slate-500 leading-none">
          {fmtTime(entry.createdAt)}
        </span>
      </div>

      {/* Centre: dot + vertical line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            "w-3 h-3 rounded-full border-2 mt-0.5 shrink-0 ring-2 ring-white",
            dotCls
          )}
        />
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200 mt-1" />
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div
              className={cn(
                "shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5",
                entry.status === "success" ? "bg-emerald-50"
                  : entry.status === "error"   ? "bg-red-50"
                  : entry.status === "warning"  ? "bg-amber-50"
                  : "bg-blue-50"
              )}
            >
              <DocIcon
                size={12}
                className={cn(
                  entry.status === "success" ? "text-emerald-600"
                    : entry.status === "error"   ? "text-red-500"
                    : entry.status === "warning"  ? "text-amber-500"
                    : "text-blue-600"
                )}
              />
            </div>
            <p className="text-[13px] font-semibold text-slate-800 leading-snug group-hover:text-navy-800 truncate">
              {entry.title}
            </p>
          </div>
          {/* Module badge */}
          <span
            className={cn(
              "shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
              badgeCls
            )}
          >
            {entry.module}
          </span>
        </div>

        {/* Description */}
        {entry.description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2 ml-8">
            {entry.description}
          </p>
        )}

        {/* Doc number + user */}
        <div className="flex items-center gap-2 mt-1 ml-8">
          {entry.documentNumber && (
            <span className="font-mono text-[10px] text-navy-600 bg-navy-50 border border-navy-100 px-1.5 py-0.5 rounded">
              {entry.documentNumber}
            </span>
          )}
          {entry.userName && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <User size={9} />
              {entry.userName}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (entry.href) {
    return (
      <Link href={entry.href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-2 py-2 sticky top-0 bg-white z-10">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
        {fmtDate(iso)}
      </span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ActivityTimelineProps {
  /** Height of the scrollable container. Defaults to 400px */
  maxHeight?: number;
  /** Max number of entries to display. Defaults to 20 */
  limit?: number;
  /** Show the card wrapper (title + refresh button). Defaults to true */
  showCard?: boolean;
  className?: string;
}

export function ActivityTimeline({
  maxHeight = 400,
  limit = 20,
  showCard = true,
  className,
}: ActivityTimelineProps) {
  const [entries, setEntries]   = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecentActivities(limit);
      setEntries(data);
    } catch (err: any) {
      setError(err?.message ?? "Terjadi kesalahan");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const body = (
    <>
      {loading ? (
        <TimelineSkeleton />
      ) : entries.length === 0 ? (
        <TimelineEmpty error={error ?? undefined} />
      ) : (
        <div>
          {entries.map((entry, index) => {
            const dateKey     = getDateKey(entry.createdAt);
            const prevDateKey = index > 0 ? getDateKey(entries[index - 1].createdAt) : "";
            const showDate    = index === 0 || dateKey !== prevDateKey;

            return (
              <div key={entry.id}>
                {showDate && <DateSeparator iso={entry.createdAt} />}
                <TimelineEntry entry={entry} isLast={index === entries.length - 1} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (!showCard) {
    return (
      <div
        className={cn("overflow-y-auto", className)}
        style={{ maxHeight }}
      >
        {body}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-11 items-center justify-between border-b border-slate-100 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-blue-600" />
          <p className="text-sm font-bold text-slate-800">Aktivitas Terkini</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          title="Refresh aktivitas"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Scrollable list */}
      <div
        className="overflow-y-auto px-3 py-1"
        style={{ maxHeight }}
      >
        {body}
      </div>

      {/* Footer: entry count */}
      {!loading && entries.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/60">
          <p className="text-[10px] text-slate-400 text-right">
            Menampilkan {entries.length} aktivitas terbaru
          </p>
        </div>
      )}
    </section>
  );
}

export default ActivityTimeline;
