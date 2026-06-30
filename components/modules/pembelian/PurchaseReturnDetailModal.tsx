"use client";

import { X, RefreshCcw, Scissors, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
};

function statusStyle(status: string): string {
  if (status === "Closed")               return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Deduction Locked")     return "bg-violet-50 text-violet-700 border-violet-200";
  if (status === "Awaiting Replacement") return "bg-sky-50 text-sky-700 border-sky-200";
  if (status === "Pending Deduction")    return "bg-violet-50 text-violet-600 border-violet-200";
  if (status === "Refund Pending")       return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function settlementIcon(option: string) {
  if (option === "Accept Loss")       return <RefreshCcw size={14} className="text-sky-600" />;
  if (option === "Next PO Deduction") return <Scissors size={14} className="text-violet-600" />;
  if (option === "Cash Refund")       return <Banknote size={14} className="text-amber-600" />;
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-slate-100" />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PurchaseReturnDetailData {
  purchase_return_id: number;
  purchase_return_number: string;
  return_date: string;
  supplier_name: string;
  supplier_id: number;
  goods_receipt_id: number;
  purchase_order_number: string;
  settlement_option: string;
  status: string;
  total_amount: number;
  closing_condition: string;
  notes: string;
  transaction_name: string;
  transaction_detail: string;
}

interface PurchaseReturnDetailModalProps {
  open: boolean;
  onClose: () => void;
  data: PurchaseReturnDetailData | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseReturnDetailModal({
  open,
  onClose,
  data,
}: PurchaseReturnDetailModalProps) {
  if (!open || !data) return null;

  // Parse settlement notes for display
  // Notes may contain "applied to PO ...", "credited against invoice ...", etc.
  const settlementNotes = data.notes
    ? data.notes.split(".").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px]">
                Detail Purchase Return
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {data.purchase_return_number}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex px-3 py-1 rounded-full text-xs font-semibold border",
                  statusStyle(data.status)
                )}
              >
                {data.status}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                {settlementIcon(data.settlement_option)}
                {data.settlement_option}
              </span>
            </div>

            <Divider />

            {/* Core info grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="No. Retur">
                <span className="font-mono font-semibold text-navy-800">
                  {data.purchase_return_number}
                </span>
              </Field>

              <Field label="Tanggal Retur">
                {fmtDate(data.return_date)}
              </Field>

              <Field label="Supplier">
                <span className="font-medium">{data.supplier_name}</span>
              </Field>

              <Field label="No. PO Terkait">
                <span className="font-mono">{data.purchase_order_number || "—"}</span>
              </Field>

              <Field label="GR ID">
                {data.goods_receipt_id > 0 ? String(data.goods_receipt_id) : "—"}
              </Field>

              <Field label="Total Retur">
                <span className="font-semibold text-rose-600">
                  Rp {fmt(data.total_amount)}
                </span>
              </Field>
            </div>

            <Divider />

            {/* Settlement detail */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Penyelesaian
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Kondisi Penyelesaian
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {data.closing_condition || "—"}
                </p>
              </div>

              {settlementNotes.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">Catatan Settlement</p>
                  <ul className="space-y-1">
                    {settlementNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Notes / keterangan */}
            {data.notes && (
              <>
                <Divider />
                <Field label="Keterangan / Catatan">
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {data.notes}
                  </p>
                </Field>
              </>
            )}

            {/* Transaction info */}
            {(data.transaction_name || data.transaction_detail) && (
              <>
                <Divider />
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Informasi Transaksi
                  </p>
                  {data.transaction_name && (
                    <Field label="Transaction Name">
                      <span className="font-medium">{data.transaction_name}</span>
                    </Field>
                  )}
                  {data.transaction_detail && (
                    <Field label="Transaction Detail">
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {data.transaction_detail}
                      </p>
                    </Field>
                  )}
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
