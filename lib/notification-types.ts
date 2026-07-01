export type NotifType = "success" | "error" | "warning" | "info";

export interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
}
