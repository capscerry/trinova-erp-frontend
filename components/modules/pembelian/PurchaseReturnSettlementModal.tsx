"use client";

import { useState } from "react";
import {
  X,
  RefreshCcw,
  Scissors,
  Banknote,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReturnLineItem } from "./PurchaseReturnFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettlementOption =
  | "Accept Loss"
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
  total_amount?: number;
  outstanding_amount?: number;
}

/** A product the supplier sells — used in Option A picker */
export interface SupplierProductOption {
  supplier_product_id: number;
  product_id: number;
  product_name: string;
  supplier_id: number;
  unit_price: number;
}

// ─── Panel payloads ───────────────────────────────────────────────────────────

/** Option A — supplier ships back fixed goods of the exact same product & quantity */
export interface AcceptLossPayload {
  /** Return line items that the supplier will replace 1-for-1 */
  returnItems: ReturnLineItem[];
  returnAmount: number;
}

/** Option B — deduct return total from a selected next PO's total */
export interface NextPODeductionPayload {
  targetPOId: number;
  targetPONumber: string;
  deductionAmount: number;
  /** New PO total after deduction */
  newPOTotal: number;
}

/** Option C — deduct return amount from the linked invoice */
export interface CashRefundPayload {
  targetInvoiceId: number;
  targetInvoiceNumber: string;
  deductionAmount: number;
  /** ISO date string for the return credit payment */
  returnDate: string;
}

export type SettlementPayload =
  | { type: "Accept Loss";        data: AcceptLossPayload }
  | { type: "Next PO Deduction"; data: NextPODeductionPayload }
  | { type: "Cash Refund";       data: CashRefundPayload };

interface PurchaseReturnSettlementModalProps {
  open: boolean;
  onClose: () => void;
  onSettle: (returnId: number, payload: SettlementPayload) => Promise<void>;
  purchaseReturn: PurchaseReturnRow | null;
  purchaseOrders: PurchaseOrderOption[];
  goodsReceipts: GoodsReceiptOption[];
  purchaseInvoices: PurchaseInvoiceOption[];
  /** Return line items loaded from the originating GR/PO — used in Option A */
  returnItems?: ReturnLineItem[];
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const CLOSED_STATUSES = new Set(["Closed", "Deduction Locked"]);
function isAlreadySettled(s: string) { return CLOSED_STATUSES.has(s); }

// ─── Shared sub-components ────────────────────────────────────────────────────

function FormField({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
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
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300";

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
      <p className="text-sm font-semibold text-slate-700">Retur ini sudah diselesaikan</p>
      <span className="inline-flex px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
        {status}
      </span>
    </div>
  );
}

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

// ─── Panel A: Accept Loss — supplier ships back the exact same defective items ─

function AcceptLossPanel({
  pr,
  returnItems,
  submitting,
  onConfirm,
}: {
  pr: PurchaseReturnRow;
  returnItems: ReturnLineItem[];
  submitting: boolean;
  onConfirm: (data: AcceptLossPayload) => void;
}) {
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
  const activeItems = returnItems.filter((i) => i.qty_return > 0);

  return (
    <div className="space-y-5">
      {/* Description banner */}
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-1.5 text-sm text-sky-800">
        <div className="flex items-center gap-2 font-semibold">
          <RefreshCcw size={16} />
          Opsi A — Terima Barang Pengganti (Accept Loss)
        </div>
        <p className="text-xs leading-relaxed text-sky-700">
          Supplier akan mengirimkan kembali barang yang sudah diperbaiki dengan
          produk dan jumlah yang <span className="font-semibold">sama persis</span>.
          Stok akan dipulihkan secara otomatis setelah dikonfirmasi.
        </p>
      </div>

      {/* Return summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur"   value={pr.purchase_return_number} />
        <InfoRow label="Supplier"    value={pr.supplier_name} />
        <InfoRow label="Nilai Retur" value={`Rp ${fmt(pr.total_amount)}`} />
      </div>

      {/* Items that will be returned by supplier */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Barang yang Akan Dikirim Kembali oleh Supplier
        </p>

        {activeItems.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada item retur yang tercatat. Buat ulang retur dengan memilih produk yang dikembalikan.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-400">Produk</th>
                  <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-slate-400 w-24">Qty</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-slate-400 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeItems.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-700">{item.product_name}</td>
                    <td className="px-3 py-2 text-center font-semibold text-sky-700">{item.qty_return}</td>
                    <td className="px-3 py-2 text-right text-slate-600">Rp {fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={2} className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-500">Total</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-800">
                    Rp {fmt(activeItems.reduce((s, i) => s + i.subtotal, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Stock restore notice */}
      {activeItems.length > 0 && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 space-y-1">
          <p className="font-semibold text-emerald-800">Efek ke stok</p>
          <p>
            Stok untuk {activeItems.length} produk di atas akan dipulihkan
            sesuai jumlah aslinya setelah konfirmasi.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={activeItems.length === 0 || submitting}
        onClick={() => onConfirm({ returnItems: activeItems, returnAmount: pr.total_amount })}
        className="w-full py-2.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Menyimpan…" : "Konfirmasi Penerimaan Barang Pengganti"}
      </button>
    </div>
  );
}

// ─── Panel B: Next PO Deduction — deduct return total from a selected PO ──────

function NextPODeductionPanel({
  pr, purchaseOrders, submitting, onConfirm,
}: {
  pr: PurchaseReturnRow;
  purchaseOrders: PurchaseOrderOption[];
  submitting: boolean;
  onConfirm: (data: NextPODeductionPayload) => void;
}) {
  // Active POs from same supplier
  const eligiblePOs = purchaseOrders.filter((po) => {
    const sameSupplier =
      (pr.supplier_id > 0 && po.supplier_id === pr.supplier_id) ||
      po.supplier_name?.toLowerCase() === pr.supplier_name.toLowerCase();
    const isActive = !["Cancelled", "Completed", "Closed"].includes(po.status);
    return sameSupplier && isActive;
  });

  const [selectedPOId, setSelectedPOId] = useState<number>(
    eligiblePOs[0]?.purchase_order_id ?? 0
  );

  const selectedPO = eligiblePOs.find((p) => p.purchase_order_id === selectedPOId);
  const deduction = pr.total_amount;
  const poTotal = selectedPO?.total_amount ?? 0;
  const exceedsPOTotal = selectedPO != null && deduction > poTotal;
  const newPOTotal = exceedsPOTotal ? poTotal : poTotal - deduction;
  const canConfirm = !!selectedPO && !submitting && eligiblePOs.length > 0 && !exceedsPOTotal;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-violet-50 border border-violet-200 p-4 space-y-1.5 text-sm text-violet-800">
        <div className="flex items-center gap-2 font-semibold">
          <Scissors size={16} />
          Opsi B — Potong PO Berikutnya (Next PO Deduction)
        </div>
        <p className="text-xs leading-relaxed text-violet-700">
          Total retur (Rp {fmt(deduction)}) akan dipotong dari total PO aktif supplier ini yang dipilih.
          Status retur berubah ke <span className="font-semibold">Deduction Locked</span>.
        </p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur"      value={pr.purchase_return_number} />
        <InfoRow label="Supplier"       value={pr.supplier_name} />
        <InfoRow label="Nilai Potongan" value={`Rp ${fmt(deduction)}`} />
      </div>

      <FormField
        label="Pilih PO Target Potongan"
        hint={eligiblePOs.length === 0 ? "Belum ada PO aktif dari supplier ini." : "Hanya PO aktif dari supplier yang sama."}
      >
        {eligiblePOs.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada PO aktif ditemukan untuk supplier ini.
          </div>
        ) : (
          <select title="Pilih PO" value={selectedPOId}
            onChange={(e) => setSelectedPOId(Number(e.target.value))}
            className={inputBase}>
            {eligiblePOs.map((po) => (
              <option key={po.purchase_order_id} value={po.purchase_order_id}>
                {po.po_number} — Rp {fmt(po.total_amount)} ({po.status})
              </option>
            ))}
          </select>
        )}
      </FormField>

      {/* Validation error — deduction exceeds PO total */}
      {exceedsPOTotal && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Nilai potongan{" "}
            <span className="font-semibold">Rp {fmt(deduction)}</span> melebihi
            total PO{" "}
            <span className="font-semibold">Rp {fmt(poTotal)}</span>.
            Pilih PO dengan total yang lebih besar atau sesuaikan nilai retur sebelum melanjutkan.
          </span>
        </div>
      )}

      {selectedPO && !exceedsPOTotal && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-700 space-y-1">
          <p className="font-semibold text-violet-800">Preview potongan</p>
          <p>
            PO <span className="font-mono font-semibold">{selectedPO.po_number}</span>{" "}
            akan berkurang dari <span className="font-semibold">Rp {fmt(poTotal)}</span>{" "}
            menjadi <span className="font-semibold text-emerald-700">Rp {fmt(newPOTotal)}</span>.
          </p>
          <p>Status retur → <span className="font-semibold">Deduction Locked</span>.</p>
        </div>
      )}

      <button type="button"
        disabled={!canConfirm}
        onClick={() => selectedPO && onConfirm({
          targetPOId: selectedPO.purchase_order_id,
          targetPONumber: selectedPO.po_number,
          deductionAmount: deduction,
          newPOTotal,
        })}
        className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
        {submitting ? "Menyimpan…" : "Potong Total PO"}
      </button>
    </div>
  );
}

// ─── Panel C: Cash Refund — post a Return Credit payment against the invoice ──

function CashRefundPanel({
  pr, purchaseInvoices, submitting, onConfirm,
}: {
  pr: PurchaseReturnRow;
  purchaseInvoices: PurchaseInvoiceOption[];
  submitting: boolean;
  onConfirm: (data: CashRefundPayload) => void;
}) {
  // purchaseInvoices is already pre-filtered to unpaid invoices for this supplier
  const eligible = purchaseInvoices;

  const [selectedInvId, setSelectedInvId] = useState<number>(
    eligible[0]?.invoice_id ?? 0
  );
  const [returnDate, setReturnDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const selectedInv = eligible.find((inv) => inv.invoice_id === selectedInvId);
  const deduction = pr.total_amount;

  // Validation: deduction must not exceed the invoice's outstanding balance
  const invoiceOutstanding = selectedInv?.outstanding_amount ?? selectedInv?.total_amount ?? 0;
  const exceedsOutstanding = selectedInv != null && deduction > invoiceOutstanding;
  const canConfirm = !!selectedInv && eligible.length > 0 && !!returnDate && !submitting && !exceedsOutstanding;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-1.5 text-sm text-amber-800">
        <div className="flex items-center gap-2 font-semibold">
          <Banknote size={16} />
          Opsi C — Uang Kembali (Cash Refund)
        </div>
        <p className="text-xs leading-relaxed text-amber-700">
          Nilai retur (Rp {fmt(deduction)}) akan dicatat sebagai kredit pembayaran
          pada invoice yang dipilih, mengurangi saldo outstanding-nya.
          Supplier mentransfer selisihnya ke rekening perusahaan.
        </p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur"     value={pr.purchase_return_number} />
        <InfoRow label="Supplier"      value={pr.supplier_name} />
        <InfoRow label="Jumlah Kredit" value={`Rp ${fmt(deduction)}`} />
      </div>

      <FormField
        label="Invoice Terkait"
        hint={
          eligible.length === 0
            ? "Tidak ada invoice ditemukan untuk retur ini."
            : "Kredit akan dikurangkan dari outstanding invoice yang dipilih."
        }
      >
        {eligible.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada invoice ditemukan.
          </div>
        ) : (
          <select title="Pilih Invoice" value={selectedInvId}
            onChange={(e) => setSelectedInvId(Number(e.target.value))}
            className={inputBase}>
            {eligible.map((inv) => (
              <option key={inv.invoice_id} value={inv.invoice_id}>
                {inv.invoice_number}
                {inv.outstanding_amount != null
                  ? ` — Outstanding: Rp ${fmt(inv.outstanding_amount)}`
                  : inv.total_amount != null
                    ? ` — Rp ${fmt(inv.total_amount)}`
                    : ""}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Tanggal Kredit" hint="Tanggal diterimanya transfer dari supplier">
        <input
          type="date"
          title="Tanggal Kredit"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          className={inputBase}
        />
      </FormField>

      {/* Validation error — deduction exceeds outstanding */}
      {exceedsOutstanding && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Kredit retur{" "}
            <span className="font-semibold">Rp {fmt(deduction)}</span> melebihi
            outstanding invoice{" "}
            <span className="font-semibold">Rp {fmt(invoiceOutstanding)}</span>.
            Pilih invoice lain atau sesuaikan nilai retur sebelum melanjutkan.
          </span>
        </div>
      )}

      {selectedInv && !exceedsOutstanding && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 space-y-1">
          <p className="font-semibold text-amber-800">Efek ke invoice</p>
          <p>
            Kredit <span className="font-semibold">Rp {fmt(deduction)}</span> akan
            dicatat sebagai pembayaran (Return Credit) pada invoice{" "}
            <span className="font-mono font-semibold">{selectedInv.invoice_number}</span>,
            mengurangi outstanding dari{" "}
            <span className="font-semibold">Rp {fmt(invoiceOutstanding)}</span> menjadi{" "}
            <span className="font-semibold text-emerald-700">Rp {fmt(Math.max(0, invoiceOutstanding - deduction))}</span>.
          </p>
          <p className="text-amber-600">Pastikan transfer dari supplier telah diterima sebelum konfirmasi.</p>
        </div>
      )}

      <button type="button"
        disabled={!canConfirm}
        onClick={() =>
          selectedInv &&
          onConfirm({
            targetInvoiceId:     selectedInv.invoice_id,
            targetInvoiceNumber: selectedInv.invoice_number,
            deductionAmount:     deduction,
            returnDate,
          })
        }
        className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
        {submitting ? "Menyimpan…" : "Konfirmasi Refund & Catat Kredit"}
      </button>
    </div>
  );
}

// ─── Option meta ──────────────────────────────────────────────────────────────

const OPTION_META: Record<SettlementOption, { label: string; color: string }> = {
  "Accept Loss": {
    label: "Terima Barang Pengganti",
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  "Next PO Deduction": {
    label: "Potong PO Berikutnya",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  "Cash Refund": {
    label: "Uang Kembali",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

// ─── Root Modal ───────────────────────────────────────────────────────────────

export default function PurchaseReturnSettlementModal({
  open, onClose, onSettle,
  purchaseReturn: pr,
  purchaseOrders, goodsReceipts, purchaseInvoices, returnItems = [],
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
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-navy-900 to-navy-600 shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-[15px] truncate">
                Selesaikan Retur — {pr.purchase_return_number}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border", meta.color)}>
                  {meta.label}
                </span>
                <span className="text-slate-400 text-xs">{pr.supplier_name}</span>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close modal"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 shrink-0 ml-3">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5">
            {alreadySettled ? (
              <SettledBadge status={pr.status} />
            ) : option === "Accept Loss" ? (
              <AcceptLossPanel
                pr={pr}
                returnItems={returnItems}
                submitting={submitting}
                onConfirm={(data) => handleSettle({ type: "Accept Loss", data })}
              />
            ) : option === "Next PO Deduction" ? (
              <NextPODeductionPanel
                pr={pr}
                purchaseOrders={purchaseOrders}
                submitting={submitting}
                onConfirm={(data) => handleSettle({ type: "Next PO Deduction", data })}
              />
            ) : option === "Cash Refund" ? (
              <CashRefundPanel
                pr={pr}
                purchaseInvoices={purchaseInvoices}
                submitting={submitting}
                onConfirm={(data) => handleSettle({ type: "Cash Refund", data })}
              />
            ) : (
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
