"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { NotifType, NotificationItem } from "./notification-types";
import { _registerNotificationHandler } from "./notify";

export type { NotifType, NotificationItem };

// ─── Context value ────────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (type: NotifType, title: string, message?: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "trinova_notifications";

// Baca dari localStorage — dipanggil HANYA di client (dalam useEffect),
// supaya tidak mismatch dengan render server-side Next.js.
function loadStoredNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (Omit<NotificationItem, "timestamp"> & { timestamp: string })[];
    return parsed.map((n) => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch {
    return [];
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const counterRef = useRef(0);

  // Hydrate dari localStorage setelah mount (client-only, aman dari
  // mismatch hydration SSR).
  useEffect(() => {
    setNotifications(loadStoredNotifications());
  }, []);

  // Simpan ke localStorage setiap kali daftar notifikasi berubah.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // localStorage penuh/diblokir — abaikan, notifikasi tetap jalan di memori
    }
  }, [notifications]);

  const addNotification = useCallback((type: NotifType, title: string, message?: string) => {
    counterRef.current += 1;
    const item: NotificationItem = {
      id: `notif-${Date.now()}-${counterRef.current}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 50));
  }, []);

  // Register this instance's addNotification into notify.ts's module-level slot
  // so that notify.success / .error / etc. feed into this context.
  useEffect(() => {
    _registerNotificationHandler(addNotification);
    return () => {
      _registerNotificationHandler(() => {});
    };
  }, [addNotification]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return ctx;
}
