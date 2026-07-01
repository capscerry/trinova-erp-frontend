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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const counterRef = useRef(0);

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
