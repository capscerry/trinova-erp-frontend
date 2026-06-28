"use client";

import { useState } from "react";
import {
  X,
  PackageCheck,
  Scissors,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReturnLineItem } from "./PurchaseReturnFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettlementOption =
  | "Replacement"
  | "Next PO Deduction"
  | "Cash Refund";

export interface PurchaseReturnRow {
  purchase_return_id: number;
  purchase_return_number: string;
  supplier_name: string;
  supplier_id: number;
  goods_receipt_id: number;
  purchase_order_number: string;
  total_amount: number;
  settlement_option: SettlementOption | string;
  status: string;
  notes: string;
  /** Serialised return line items — may be empty for legacy records */
  return_items?: ReturnLineItem[];
}

export interface PurchaseOrderOption {
  purchase_order_id: number;
  po_number: string;
  supplier_id?: number;
  supplier_name?: string;
  total_amount: number;
  status: string;
}

export interface GoodsReceiptOption {
  goods_receipt_id: number;
  receipt_number: string;
  supplier_id: number;
  supplier_name: string;
}

export interface PurchaseInvoiceOption {
  invoice_id: number;
  invoice_number: string;
  goods_receipt_id: number;
  invoice_date: string;
  supplier_name: string;
  /** Current invoice total — used to preview the deducted value */
  total_amount?: number;
}

// ─── Panel payloads ───────────────────────────────────────────────────────────

/** Option A — trigger a new GR for the returned items */
export interface ReplacementPayload {
  /** Passed back to the parent so it can open the GR form pre-filled */
  returnItems: ReturnLineItem[];
  returnAmount: number;
}

/** Option B — deduct from the Invoice tied to this return's GR */
export interface NextPODeductionPayload {
  targetInvoiceId: number;
  targetInvoiceNumber: string;
  deductionAmount: number;
}

/** Option C — deduct return amount from the selected invoice */
export interface CashRefundPayload {
  targetInvoiceId: number;
  targetInvoiceNumber: string;
  deductionAmount: number;
}

export type SettlementPayload =
  | { type: "Replacement";       data: ReplacementPayload }
  | { type: "Next PO Deduction"; data: NextPODeductionPayload }
  | { type: "Cash Refund";       data: CashRefundPayload };

interface PurchaseReturnSettlementModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with a typed payload; parent handles the actual API call */
  onSettle: (returnId: number, payload: SettlementPayload) => Promise<void>;
  purchaseReturn: PurchaseReturnRow | null;
  /** All POs — kept for backwards compat; unused now */
  purchaseOrders: PurchaseOrderOption[];
  /** All GRs — unused now (Option A goes to a new GR, not an existing one) */
  goodsReceipts: GoodsReceiptOption[];
  /** All invoices — B and C filter to this return's GR */
  purchaseInvoices: PurchaseInvoiceOption[];
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const CLOSED_STATUSES = new Set(["Closed", "Deduction Locked"]);

function isAlreadySettled(status: string) {
  return CLOSED_STATUSES.has(status);
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 leading-snug">{hint}</p>}
    </div>
  );
}

const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function SettledBadge({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <CheckCircle2 className="text-emerald-500" size={40} />
      <p className="text-sm font-semibold text-slate-700">
        Retur ini sudah diselesaikan
      </p>
      <span className="inline-flex px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
        {status}
      </span>
    </div>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

// ─── Panel A: Replacement — navigate to new GR ────────────────────────────────

function ReplacementPanel({
  pr,
  submitting,
  onConfirm,
}: {
  pr: PurchaseReturnRow;
  submitting: boolean;
  onConfirm: (data: ReplacementPayload) => void;
}) {
  const items: ReturnLineItem[] = pr.return_items ?? [];

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-2 text-sm text-sky-800">
        <div className="flex items-center gap-2 font-semibold">
          <PackageCheck size={16} />
          Opsi A — Tukar Barang (Replacement)
        </div>
        <p className="text-xs leading-relaxed text-sky-700">
          Supplier akan mengirim barang pengganti sesuai jumlah retur. Klik
          tombol di bawah untuk membuka form Goods Receipt baru yang sudah
          terisi dengan produk dari retur ini.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur"  value={pr.purchase_return_number} />
        <InfoRow label="Supplier"   value={pr.supplier_name} />
        <InfoRow label="Total Retur" value={`Rp ${fmt(pr.total_amount)}`} />
        <InfoRow label="PO Terkait" value={pr.purchase_order_number} />
      </div>

      {/* Returned items preview */}
      {items.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Item yang Dikembalikan
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-400">
                    Produk
                  </th>
                  <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-slate-400 w-20">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-slate-400 w-28">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {item.product_name}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {item.qty_return}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      Rp {fmt(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
          <AlertTriangle size={14} />
          Detail item retur tidak tersedia. GR pengganti harus diisi manual.
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() =>
          onConfirm({
            returnItems: items,
            returnAmount: pr.total_amount,
          })
        }
        className="w-full py-2.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        <ExternalLink size={15} />
        {submitting ? "Memproses…" : "Buat Goods Receipt Pengganti"}
      </button>
    </div>
  );
}

// ─── Panel B: Next PO Deduction — deduct from linked Invoice ─────────────────

function NextPODeductionPanel({
  pr,
  purchaseInvoices,
  submitting,
  onConfirm,
}: {
  pr: PurchaseReturnRow;
  purchaseInvoices: PurchaseInvoiceOption[];
  submitting: boolean;
  onConfirm: (data: NextPODeductionPayload) => void;
}) {
  // Filter to invoices tied to this return's GR
  const eligible = purchaseInvoices.filter(
    (inv) => inv.goods_receipt_id === pr.goods_receipt_id
  );

  const [selectedInvId, setSelectedInvId] = useState<number>(
    eligible[0]?.invoice_id ?? 0
  );
  const [deductionAmount, setDeductionAmount] = useState<string>(
    String(pr.total_amount)
  );

  const selectedInv = eligible.find((inv) => inv.invoice_id === selectedInvId);
  const amountNum = Number(deductionAmount) || 0;
  const overLimit = amountNum > pr.total_amount;

  const invoiceTotal = selectedInv?.total_amount ?? 0;
  const newInvoiceTotal = Math.max(0, invoiceTotal - amountNum);

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-xl bg-violet-50 border border-violet-200 p-4 space-y-2 text-sm text-violet-800">
        <div className="flex items-center gap-2 font-semibold">
          <Scissors size={16} />
          Opsi B — Potong Invoice PO (Next PO Deduction)
        </div>
        <p className="text-xs leading-relaxed text-violet-700">
          Nominal retur akan dipotong langsung dari invoice yang terkait
          dengan Goods Receipt retur ini. Total invoice akan berkurang sebesar
          nilai potongan.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur"    value={pr.purchase_return_number} />
        <InfoRow label="Supplier"     value={pr.supplier_name} />
        <InfoRow
          label="Maks. Potongan"
          value={`Rp ${fmt(pr.total_amount)}`}
        />
      </div>

      {/* Invoice picker */}
      <FormField
        label="Invoice Terkait"
        hint={
          eligible.length === 0
            ? "Tidak ada invoice ditemukan untuk GR retur ini."
            : "Invoice yang terhubung ke GR asal retur."
        }
      >
        {eligible.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada invoice ditemukan untuk GR ini.
          </div>
        ) : (
          <select
            title="Pilih Invoice"
            value={selectedInvId}
            onChange={(e) => setSelectedInvId(Number(e.target.value))}
            className={inputBase}
          >
            {eligible.map((inv) => (
              <option key={inv.invoice_id} value={inv.invoice_id}>
                {inv.invoice_number}
                {inv.total_amount != null
                  ? ` — Rp ${fmt(inv.total_amount)}`
                  : ""}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {/* Deduction amount */}
      <FormField
        label="Nominal Potongan (Rp)"
        hint={
          overLimit
            ? `Tidak boleh melebihi total retur (Rp ${fmt(pr.total_amount)})`
            : undefined
        }
      >
        <input
          type="number"
          min={0}
          max={pr.total_amount}
          value={deductionAmount}
          onChange={(e) => setDeductionAmount(e.target.value)}
          className={cn(
            inputBase,
            overLimit && "border-rose-300 focus:ring-rose-200"
          )}
        />
      </FormField>

      {/* Preview */}
      {selectedInv && amountNum > 0 && !overLimit && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-700 space-y-1">
          <p className="font-semibold text-violet-800">Preview potongan</p>
          <p>
            Invoice{" "}
            <span className="font-mono font-semibold">
              {selectedInv.invoice_number}
            </span>{" "}
            akan berkurang dari{" "}
            <span className="font-semibold">Rp {fmt(invoiceTotal)}</span> menjadi{" "}
            <span className="font-semibold text-emerald-700">
              Rp {fmt(newInvoiceTotal)}
            </span>
            .
          </p>
          <p>
            Status retur berubah ke{" "}
            <span className="font-semibold">Deduction Locked</span>.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={
          !selectedInv || amountNum <= 0 || overLimit || submitting ||
          eligible.length === 0
        }
        onClick={() =>
          selectedInv &&
          onConfirm({
            targetInvoiceId: selectedInv.invoice_id,
            targetInvoiceNumber: selectedInv.invoice_number,
            deductionAmount: amountNum,
          })
        }
        className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Menyimpan…" : "Potong Invoice"}
      </button>
    </div>
  );
}

// ─── Panel C: Cash Refund — deduct from linked Invoice ───────────────────────

function CashRefundPanel({
  pr,
  purchaseInvoices,
  submitting,
  onConfirm,
}: {
  pr: PurchaseReturnRow;
  purchaseInvoices: PurchaseInvoiceOption[];
  submitting: boolean;
  onConfirm: (data: CashRefundPayload) => void;
}) {
  // Filter to invoices tied to this return's GR
  const eligible = purchaseInvoices.filter(
    (inv) => inv.goods_receipt_id === pr.goods_receipt_id
  );

  const [selectedInvId, setSelectedInvId] = useState<number>(
    eligible[0]?.invoice_id ?? 0
  );

  const selectedInv = eligible.find((inv) => inv.invoice_id === selectedInvId);
  const invoiceTotal = selectedInv?.total_amount ?? 0;
  const newInvoiceTotal = Math.max(0, invoiceTotal - pr.total_amount);

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-sm text-amber-800">
        <div className="flex items-center gap-2 font-semibold">
          <Banknote size={16} />
          Opsi C — Uang Kembali (Cash Refund)
        </div>
        <p className="text-xs leading-relaxed text-amber-700">
          Nilai retur akan dipotong dari invoice terkait GR ini, dan supplier
          mentransfer selisihnya ke rekening perusahaan. Konfirmasi setelah
          transfer diterima.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur"    value={pr.purchase_return_number} />
        <InfoRow label="Supplier"     value={pr.supplier_name} />
        <InfoRow
          label="Jumlah Refund"
          value={`Rp ${fmt(pr.total_amount)}`}
        />
      </div>

      {/* Invoice picker */}
      <FormField
        label="Invoice Terkait"
        hint={
          eligible.length === 0
            ? "Tidak ada invoice ditemukan untuk GR retur ini."
            : "Invoice yang terhubung ke GR asal retur. Nilai retur akan dipotong dari total invoice."
        }
      >
        {eligible.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada invoice ditemukan untuk GR ini.
          </div>
        ) : (
          <select
            title="Pilih Invoice"
            value={selectedInvId}
            onChange={(e) => setSelectedInvId(Number(e.target.value))}
            className={inputBase}
          >
            {eligible.map((inv) => (
              <option key={inv.invoice_id} value={inv.invoice_id}>
                {inv.invoice_number}
                {inv.total_amount != null
                  ? ` — Rp ${fmt(inv.total_amount)}`
                  : ""}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {/* Amount reminder + preview */}
      {selectedInv && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-2">
          <div>
            <p className="font-semibold text-slate-700 mb-0.5">
              Jumlah yang akan dipotong dari invoice
            </p>
            <p className="font-mono text-base font-bold text-rose-600">
              − Rp {fmt(pr.total_amount)}
            </p>
          </div>
          {invoiceTotal > 0 && (
            <p className="text-slate-500">
              Total invoice:{" "}
              <span className="font-semibold text-slate-700">
                Rp {fmt(invoiceTotal)}
              </span>{" "}
              →{" "}
              <span className="font-semibold text-emerald-700">
                Rp {fmt(newInvoiceTotal)}
              </span>
            </p>
          )}
          <p className="text-slate-400">
            Pastikan transfer dari supplier sesuai sebelum konfirmasi.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!selectedInv || eligible.length === 0 || submitting}
        onClick={() =>
          selectedInv &&
          onConfirm({
            targetInvoiceId: selectedInv.invoice_id,
            targetInvoiceNumber: selectedInv.invoice_number,
            deductionAmount: pr.total_amount,
          })
        }
        className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Menyimpan…" : "Konfirmasi Refund & Potong Invoice"}
      </button>
    </div>
  );
}

// ─── Option meta ──────────────────────────────────────────────────────────────

const OPTION_META: Record<
  SettlementOption,
  { label: string; color: string }
> = {
  Replacement: {
    label: "Tukar Barang",
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  "Next PO Deduction": {
    label: "Potong Invoice PO",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  "Cash Refund": {
    label: "Uang Kembali",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

// ─── Root Modal ───────────────────────────────────────────────────────────────

export default function PurchaseReturnSettlementModal({
  open,
  onClose,
  onSettle,
  purchaseReturn: pr,
  purchaseOrders,
  goodsReceipts,
  purchaseInvoices,
}: PurchaseReturnSettlementModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!open || !pr) return null;

  const option = pr.settlement_option as SettlementOption;
  const meta = OPTION_META[option] ?? {
    label: option,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const alreadySettled = isAlreadySettled(pr.status);

  const handleSettle = async (payload: SettlementPayload) => {
    setSubmitting(true);
    try {
      await onSettle(pr.purchase_return_id, payload);
      // For Replacement, the parent closes the modal itself (it then opens GR form),
      // so only auto-close here for the other options.
      if (payload.type !== "Replacement") {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-navy-900 to-navy-600 shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-[15px] truncate">
                Selesaikan Retur — {pr.purchase_return_number}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                    meta.color
                  )}
                >
                  {meta.label}
                </span>
                <span className="text-slate-400 text-xs">{pr.supplier_name}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 shrink-0 ml-3"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5">
            {alreadySettled ? (
              <SettledBadge status={pr.status} />
            ) : option === "Replacement" ? (
              <ReplacementPanel
                pr={pr}
                submitting={submitting}
                onConfirm={(data) =>
                  handleSettle({ type: "Replacement", data })
                }
              />
            ) : option === "Next PO Deduction" ? (
              <NextPODeductionPanel
                pr={pr}
                purchaseInvoices={purchaseInvoices}
                submitting={submitting}
                onConfirm={(data) =>
                  handleSettle({ type: "Next PO Deduction", data })
                }
              />
            ) : option === "Cash Refund" ? (
              <CashRefundPanel
                pr={pr}
                purchaseInvoices={purchaseInvoices}
                submitting={submitting}
                onConfirm={(data) =>
                  handleSettle({ type: "Cash Refund", data })
                }
              />
            ) : (
              /* Unknown / legacy option */
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
                <AlertTriangle size={14} />
                Opsi penyelesaian tidak dikenali: &quot;{option}&quot;
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
