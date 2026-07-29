"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Detail line shown below the message in muted text (optional). */
  detail?: string;
  /** Label for the confirm button. Default: "Konfirmasi" */
  confirmLabel?: string;
  /** Label for the cancel button. Default: "Batal" */
  cancelLabel?: string;
  /** Visual intent of the confirm button. Default: "danger" */
  variant?: "danger" | "primary";
  /** Shows a spinner on the confirm button and disables both buttons. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // ESC closes the dialog (without confirming)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loading, onCancel]);

  // Focus the cancel button when the dialog opens
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const confirmClasses =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 text-white"
      : "bg-navy-900 hover:bg-navy-700 focus-visible:ring-navy-500 text-gold-400";

  return (
    <>
      {/* Backdrop - clicking outside does NOT confirm */}
      <div
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]"
        onClick={() => { if (!loading) onCancel(); }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3 px-6 pt-6 pb-4">
            <div
              className={`mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${
                variant === "danger" ? "bg-red-50" : "bg-navy-50"
              }`}
            >
              <AlertTriangle
                size={20}
                className={variant === "danger" ? "text-red-500" : "text-navy-700"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="confirm-dialog-title"
                className="text-[15px] font-semibold text-slate-800 leading-snug"
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="mt-1.5 text-sm text-slate-600 leading-relaxed"
              >
                {message}
              </p>
              {detail && (
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{detail}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <button
              ref={cancelRef}
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-70 disabled:cursor-not-allowed ${confirmClasses}`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? `${confirmLabel}...` : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
