"use client";

import { useEffect } from "react";
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useNotifications, NotifType } from "@/lib/NotificationContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const TYPE_CONFIG: Record<
  NotifType,
  { icon: React.ElementType; iconClass: string; borderClass: string; bgClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    borderClass: "border-l-emerald-400",
    bgClass: "bg-emerald-400/5",
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-400",
    borderClass: "border-l-red-400",
    bgClass: "bg-red-400/5",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-400",
    borderClass: "border-l-amber-400",
    bgClass: "bg-amber-400/5",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-400",
    borderClass: "border-l-blue-400",
    bgClass: "bg-blue-400/5",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

export function NotificationPanel({ open, onClose, anchorRef }: NotificationPanelProps) {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  // Close when clicking outside the entire bell+panel wrapper
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, anchorRef]);

  // Mark all read when panel opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllRead();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 font-serif">Notifikasi</span>
          {notifications.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-serif">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              title="Tandai semua sudah dibaca"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <CheckCheck size={14} />
            </button>
            <button
              onClick={clearAll}
              title="Hapus semua notifikasi"
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Bell size={28} className="opacity-30" />
            <p className="text-xs font-serif">Belum ada notifikasi</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type];
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                className={`flex gap-3 px-4 py-3 border-l-2 ${cfg.borderClass} ${
                  notif.read ? "bg-white" : cfg.bgClass
                } transition-colors`}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon size={15} className={cfg.iconClass} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-700 font-serif leading-snug truncate">
                    {notif.title}
                  </p>
                  {notif.message && (
                    <p className="text-[12px] text-slate-500 font-serif mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 font-serif mt-1">
                    {formatTime(notif.timestamp)}
                  </p>
                </div>
                {!notif.read && (
                  <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
