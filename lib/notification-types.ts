export type NotifType = "success" | "error" | "warning" | "info";

// Top-level path segment the notification was triggered from, e.g. "pembelian",
// "penjualan", "persediaan". Undefined = global/generic (shown to everyone).
export type NotifModule = "pembelian" | "penjualan" | "persediaan" | string;

export interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  module?: NotifModule;
}
