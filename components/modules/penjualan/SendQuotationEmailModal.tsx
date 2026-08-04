"use client";

import { useState } from "react";
import { Mail, X, Send, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
  quotationNumber: string;
  customerName: string;
  customerEmail?: string;
}

export function SendQuotationEmailModal({
  open,
  onClose,
  onSend,
  quotationNumber,
  customerName,
  customerEmail,
}: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const hasEmail = !!customerEmail;

  const handleSend = async () => {
    if (!hasEmail || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(message.trim());
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim email");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    setMessage("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-gold-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-900">Kirim Penawaran via Email</h3>
              <p className="text-[11px] text-slate-400">#{quotationNumber}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={sending}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Akan dikirim ke
            </p>
            {hasEmail ? (
              <>
                <p className="text-sm font-semibold text-slate-700">{customerName}</p>
                <p className="text-xs text-navy-700 font-mono mt-0.5">{customerEmail}</p>
              </>
            ) : (
              <div className="flex items-start gap-2 text-amber-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p className="text-xs">
                  Pelanggan <b>{customerName}</b> belum memiliki alamat email terdaftar. Lengkapi
                  data email pelanggan terlebih dahulu di menu <b>Customer</b> sebelum mengirim.
                </p>
              </div>
            )}
          </div>

          {/* {hasEmail && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Pesan tambahan <span className="normal-case font-normal text-slate-300">(opsional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                rows={3}
                placeholder="Contoh: Mohon dikonfirmasi selambat-lambatnya akhir minggu ini, ya."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400
                           outline-none transition-colors focus:border-navy-500 focus:ring-2 focus:ring-navy-600/10
                           disabled:opacity-50 resize-none"
              />
            </div>
          )} */}

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/40">
          <button
            onClick={handleClose}
            disabled={sending}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            Batal
          </button>
          <button
            onClick={handleSend}
            disabled={!hasEmail || sending}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm",
              !hasEmail || sending
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-navy-900 hover:bg-navy-700 text-gold-400"
            )}
          >
            {sending ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Mengirim...
              </>
            ) : (
              <>
                <Send size={13} /> Kirim Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
