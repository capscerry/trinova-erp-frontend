"use client";

import { useWorkflowDraft } from "@/lib/WorkflowDraftContext";
import { Check, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toolbar untuk workflow — tampilkan:
 *  - ringkasan bagian apa saja yang sudah ada di draft
 *  - tombol "Submit Semua" (commit ke DB)
 *  - tombol "Reset Draft" (buang semua)
 *
 * Render ini di halaman yang dibungkus <WorkflowDraftProvider>.
 */
export function WorkflowToolbar() {
  const {
    draft,
    hasDraftPart,
    submitAll,
    submitting,
    submitError,
    clearDraft,
  } = useWorkflowDraft();

  const parts: { key: keyof typeof draft; label: string }[] = [
    { key: "salesOrder", label: "Sales Order" },
    { key: "uangMuka", label: "Uang Muka" },
    { key: "pengiriman", label: "Pengiriman" },
  ];

  const hasAny = parts.some((p) => hasDraftPart(p.key));

  if (!hasAny && !submitError) return null;

  return (
    <div className="mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Draft Transaksi</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Data berikut belum tersimpan ke database. Klik &quot;Submit Semua&quot; untuk menyimpan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearDraft}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                       text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} /> Reset
          </button>

          <button
            onClick={() => submitAll().catch(() => {})}
            disabled={submitting || !hasAny}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                       bg-navy-900 text-gold-400 hover:bg-navy-700 transition-colors shadow-sm
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <RefreshCw size={12} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Check size={12} /> Submit Semua
              </>
            )}
          </button>
        </div>
      </div>

      <div className="px-5 py-3 flex flex-wrap gap-2">
        {parts.map(({ key, label }) => {
          const filled = hasDraftPart(key);
          return (
            <span
              key={key}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                filled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              )}
            >
              {filled && <Check size={10} />}
              {label}
            </span>
          );
        })}
      </div>

      {submitError && (
        <div className="px-5 py-3 border-t border-red-100 bg-red-50 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{submitError}</p>
        </div>
      )}
    </div>
  );
}
