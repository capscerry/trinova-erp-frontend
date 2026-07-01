/**
 * notify.ts
 *
 * Thin wrapper around sonner's `toast` that simultaneously records every
 * notification into NotificationContext so the bell history panel stays in sync.
 *
 * Usage — replace `import { toast } from "sonner"` with:
 *   import { notify } from "@/lib/notify"
 *
 * Then call:
 *   notify.success("Title", "Optional detail message")
 *   notify.error("Title", "Optional detail message")
 *   notify.warning("Title", "Optional detail message")
 *   notify.info("Title", "Optional detail message")
 *
 * The first argument is always a plain string title (shown in both the toast
 * and the history panel).  The optional second argument is a detail string
 * that appears only in the history panel.
 */

import { toast } from "sonner";
import type { NotifType } from "./notification-types";

// Module-level ref that the NotificationProvider writes to once it mounts.
// This avoids a hard React context dependency from a non-component module.
let _addNotification: ((type: NotifType, title: string, message?: string) => void) | null = null;

/** Called once by NotificationProvider on mount. */
export function _registerNotificationHandler(
  fn: (type: NotifType, title: string, message?: string) => void
) {
  _addNotification = fn;
}

function record(type: NotifType, title: string, message?: string) {
  _addNotification?.(type, title, message);
}

export const notify = {
  success(title: string, message?: string) {
    record("success", title, message);
    toast.success(title, { description: message });
  },
  error(title: string, message?: string) {
    record("error", title, message);
    toast.error(title, { description: message });
  },
  warning(title: string, message?: string) {
    record("warning", title, message);
    toast.warning(title, { description: message });
  },
  info(title: string, message?: string) {
    record("info", title, message);
    toast.info(title, { description: message });
  },
};
