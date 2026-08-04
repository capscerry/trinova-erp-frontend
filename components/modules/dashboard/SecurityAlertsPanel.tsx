"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert, KeyRound, Ban, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  securityActivityService,
  type SecurityActivityItem,
} from "@/lib/services/security-activity.service";

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  login_failed: KeyRound,
  unauthorized_access: Ban,
  authentication_required: ShieldAlert,
  file_upload_rejected: FileWarning,
};

function getIcon(activityType: string): React.ElementType {
  return ACTIVITY_ICON[activityType] ?? ShieldAlert;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

interface SecurityAlertsPanelProps {
  maxHeight?: number;
  take?: number;
  className?: string;
}

/**
 * Admin-only "Security Alert" feed -- separate from the business Aktivitas
 * Terkini timeline. Shows failed logins, unauthorized access attempts, and
 * rejected file uploads (e.g. malformed supplier catalog Excel).
 */
export function SecurityAlertsPanel({
  maxHeight = 400,
  take = 12,
  className,
}: SecurityAlertsPanelProps) {
  const [items, setItems] = useState<SecurityActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityActivityService.getAlerts(take);
      setItems(data);
    } catch (err: any) {
      setError(err?.message ?? "Terjadi kesalahan");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [take]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex h-11 items-center justify-between border-b border-slate-100 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-red-600" />
          <p className="text-sm font-bold text-slate-800">Security Alert</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          title="Refresh security alert"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="overflow-y-auto px-3 py-1" style={{ maxHeight }}>
        {loading ? (
          <div className="space-y-3 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
            <ShieldAlert size={28} className="opacity-30" />
            <p className="text-sm font-medium">
              {error ? "Gagal memuat security alert" : "Tidak ada security alert"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((item) => {
              const Icon = getIcon(item.activityType);
              return (
                <div key={item.id} className="flex gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={13} className="text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 leading-snug truncate">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{fmtTime(item.createdAt)}</span>
                      {item.userName && item.userName !== "SYSTEM" && (
                        <span className="text-[10px] text-slate-400">{item.userName}</span>
                      )}
                      {item.ipAddress && (
                        <span className="text-[10px] font-mono text-slate-400">{item.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default SecurityAlertsPanel;
