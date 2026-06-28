"use client";

import { useState } from "react";
import {
  X,
  PackageCheck,
  Scissors,
  Banknote,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettlementOption =
  | "Replacement"
  | "Next PO Deduction"
  | "Cash Refund"
  | "Open Credit";

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
}

// ─── Panel payloads ───────────────────────────────────────────────────────────

export interface ReplacementPayload {
  replacementGRNumber: string;
}

export interface NextPODeductionPayload {
  targetPOId: number;
  targetPONumber: string;
  deductionAmount: number;
}

export interface CashRefundPayload {
  transferRef: string;
  transferDate: string;
}

export interface OpenCreditPayload {
  supplierId: number;
  creditAmount: number;
}

export type SettlementPayload =
  | { type: "Replacement"; data: ReplacementPayload }
  | { type: "Next PO Deduction"; data: NextPODeductionPayload }
  | { type: "Cash Refund"; data: CashRefundPayload }
  | { type: "Open Credit"; data: OpenCreditPayload };

interface PurchaseReturnSettlementModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with a typed payload; parent handles the actual API call */
  onSettle: (returnId: number, payload: SettlementPayload) => Promise<void>;
  purchaseReturn: PurchaseReturnRow | null;
  /** All POs — the modal filters to the same supplier internally */
  purchaseOrders: PurchaseOrderOption[];
  /** All GRs — Panel A (Replacement) filters to same supplier, excluding the return's own GR */
  goodsReceipts: GoodsReceiptOption[];
  /** All invoices — Panel C (Cash Refund) filters to the GR on this return */
  purchaseInvoices: PurchaseInvoiceOption[];
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const CLOSED_STATUSES = new Set(["Closed", "Deduction Locked", "Credit Applied"]);

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

const readonlyBase = cn(inputBase, "bg-slate-50 cursor-default");

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

// ─── Panel A: Replacement ─────────────────────────────────────────────────────

function ReplacementPanel({
  pr,
  goodsReceipts,
  submitting,
  onConfirm,
}: {
  pr: PurchaseReturnRow;
  goodsReceipts: GoodsReceiptOption[];
  submitting: boolean;
  onConfirm: (data: ReplacementPayload) => void;
}) {
  // Same supplier, exclude the original GR that caused the return.
  // Prefer supplier_id match; fall back to case-insensitive supplier_name
  // comparison when supplier_id is 0 on either side (backend may not nest it).
  const eligible = goodsReceipts.filter((gr) => {
    const sameSupplier =
      pr.supplier_id > 0 && gr.supplier_id > 0
        ? gr.supplier_id === pr.supplier_id
        : gr.supplier_name.toLowerCase().trim() ===
          pr.supplier_name.toLowerCase().trim();

    // Only exclude the originating GR when we actually know its id
    const isOriginal =
      pr.goods_receipt_id > 0 &&
      gr.goods_receipt_id === pr.goods_receipt_id;

    return sameSupplier && !isOriginal;
  });

  const [selectedGRId, setSelectedGRId] = useState<number>(
    eligible[0]?.goods_receipt_id ?? 0
  );

  const selectedGR = eligible.find((gr) => gr.goods_receipt_id === selectedGRId);

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-2 text-sm text-sky-800">
        <div className="flex items-center gap-2 font-semibold">
          <PackageCheck size={16} />
          Opsi A — Tukar Barang (Replacement)
        </div>
        <p className="text-xs leading-relaxed text-sky-700">
          Vendor akan mengirim barang pengganti sejumlah qty retur. Setelah
          barang pengganti diterima dan di-GR, pilih nomor GR-nya di sini
          untuk menutup retur ini.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur" value={pr.purchase_return_number} />
        <InfoRow label="Supplier" value={pr.supplier_name} />
        <InfoRow
          label="Total Retur"
          value={new Intl.NumberFormat("id-ID").format(pr.total_amount)}
        />
        <InfoRow label="PO Terkait" value={pr.purchase_order_number} />
      </div>

      {/* GR dropdown */}
      <FormField
        label="Nomor GR Barang Pengganti"
        hint={
          eligible.length === 0
            ? "Belum ada GR baru dari supplier ini. Pastikan GR barang pengganti sudah dibuat."
            : "Hanya GR dari supplier yang sama yang ditampilkan, tidak termasuk GR asal retur."
        }
      >
        {eligible.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada GR pengganti ditemukan untuk supplier ini.
          </div>
        ) : (
          <select
            title="Pilih GR Pengganti"
            value={selectedGRId}
            onChange={(e) => setSelectedGRId(Number(e.target.value))}
            className={inputBase}
          >
            {eligible.map((gr) => (
              <option key={gr.goods_receipt_id} value={gr.goods_receipt_id}>
                {gr.receipt_number} — {gr.supplier_name}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <button
        type="button"
        disabled={!selectedGR || submitting}
        onClick={() =>
          selectedGR &&
          onConfirm({ replacementGRNumber: selectedGR.receipt_number })
        }
        className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Menyimpan…" : "Konfirmasi GR Pengganti"}
      </button>
    </div>
  );
}

// ─── Panel B: Next PO Deduction ───────────────────────────────────────────────

function NextPODeductionPanel({
  pr,
  purchaseOrders,
  submitting,
  onConfirm,
}: {
  pr: PurchaseReturnRow;
  purchaseOrders: PurchaseOrderOption[];
  submitting: boolean;
  onConfirm: (data: NextPODeductionPayload) => void;
}) {
  // Filter to same supplier's open POs (any non-Cancelled, non-Completed status)
  const eligiblePOs = purchaseOrders.filter((po) => {
    const sameSupplier =
      po.supplier_name?.toLowerCase() === pr.supplier_name.toLowerCase() ||
      po.supplier_id === pr.supplier_id;
    const isOpen = !["Cancelled", "Completed", "Closed"].includes(po.status);
    return sameSupplier && isOpen;
  });

  const [selectedPOId, setSelectedPOId] = useState<number>(
    eligiblePOs[0]?.purchase_order_id ?? 0
  );
  const [deductionAmount, setDeductionAmount] = useState<string>(
    String(pr.total_amount)
  );

  const selectedPO = eligiblePOs.find((p) => p.purchase_order_id === selectedPOId);

  const amountNum = Number(deductionAmount.replace(/\D/g, "")) || 0;
  const overLimit = amountNum > pr.total_amount;

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-xl bg-violet-50 border border-violet-200 p-4 space-y-2 text-sm text-violet-800">
        <div className="flex items-center gap-2 font-semibold">
          <Scissors size={16} />
          Opsi B — Potong PO Depan (Next PO Deduction)
        </div>
        <p className="text-xs leading-relaxed text-violet-700">
          Nominal retur akan dikunci sebagai potongan pada PO berikutnya dari
          supplier ini. Retur ditutup otomatis saat invoice PO tersebut
          di-submit.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur" value={pr.purchase_return_number} />
        <InfoRow label="Supplier" value={pr.supplier_name} />
        <InfoRow
          label="Maks. Potongan"
          value={new Intl.NumberFormat("id-ID").format(pr.total_amount)}
        />
      </div>

      {/* PO picker */}
      <FormField
        label="Pilih PO Target Potongan"
        hint={
          eligiblePOs.length === 0
            ? "Belum ada PO aktif untuk supplier ini. Buat PO baru terlebih dahulu."
            : "Hanya PO aktif dari supplier yang sama yang ditampilkan."
        }
      >
        {eligiblePOs.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada PO aktif ditemukan untuk supplier ini.
          </div>
        ) : (
          <select
            title="Pilih PO"
            value={selectedPOId}
            onChange={(e) => setSelectedPOId(Number(e.target.value))}
            className={inputBase}
          >
            {eligiblePOs.map((po) => (
              <option key={po.purchase_order_id} value={po.purchase_order_id}>
                {po.po_number} — Rp{" "}
                {new Intl.NumberFormat("id-ID").format(po.total_amount)} ({po.status})
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
            ? `Tidak boleh melebihi total retur (Rp ${new Intl.NumberFormat("id-ID").format(pr.total_amount)})`
            : undefined
        }
      >
        <input
          type="number"
          min={0}
          max={pr.total_amount}
          value={deductionAmount}
          onChange={(e) => setDeductionAmount(e.target.value)}
          className={cn(inputBase, overLimit && "border-rose-300 focus:ring-rose-200")}
        />
      </FormField>

      {selectedPO && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">Preview potongan</p>
          <p>
            PO <span className="font-mono font-semibold">{selectedPO.po_number}</span>{" "}
            akan mendapat potongan{" "}
            <span className="font-semibold text-rose-600">
              Rp {new Intl.NumberFormat("id-ID").format(amountNum)}
            </span>{" "}
            saat invoice-nya di-submit. Status retur berubah ke{" "}
            <span className="font-semibold">Deduction Locked</span>.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!selectedPO || amountNum <= 0 || overLimit || submitting}
        onClick={() =>
          selectedPO &&
          onConfirm({
            targetPOId: selectedPO.purchase_order_id,
            targetPONumber: selectedPO.po_number,
            deductionAmount: amountNum,
          })
        }
        className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Menyimpan…" : "Kunci Potongan pada PO"}
      </button>
    </div>
  );
}

// ─── Panel C: Cash Refund ─────────────────────────────────────────────────────

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
  // Filter to invoices linked to this return's GR
  const eligible = purchaseInvoices.filter(
    (inv) => inv.goods_receipt_id === pr.goods_receipt_id
  );

  const [selectedInvId, setSelectedInvId] = useState<number>(
    eligible[0]?.invoice_id ?? 0
  );

  const selectedInv = eligible.find((inv) => inv.invoice_id === selectedInvId);

  // Transfer ref and date are pre-filled from the invoice but remain editable
  const [transferRef, setTransferRef] = useState(
    eligible[0]?.invoice_number ?? ""
  );
  const [transferDate, setTransferDate] = useState(
    eligible[0]?.invoice_date ?? new Date().toISOString().split("T")[0]
  );

  const handleInvoiceChange = (id: number) => {
    setSelectedInvId(id);
    const inv = eligible.find((i) => i.invoice_id === id);
    if (inv) {
      setTransferRef(inv.invoice_number);
      setTransferDate(inv.invoice_date);
    }
  };

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-sm text-amber-800">
        <div className="flex items-center gap-2 font-semibold">
          <Banknote size={16} />
          Opsi C — Uang Kembali (Cash Refund)
        </div>
        <p className="text-xs leading-relaxed text-amber-700">
          Vendor mentransfer kembali nilai retur ke rekening perusahaan. Pilih
          invoice terkait dan klik "Konfirmasi Refund Diterima" setelah
          transfer valid.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur" value={pr.purchase_return_number} />
        <InfoRow label="Supplier" value={pr.supplier_name} />
        <InfoRow
          label="Jumlah Refund"
          value={`Rp ${new Intl.NumberFormat("id-ID").format(pr.total_amount)}`}
        />
      </div>

      {/* Invoice picker */}
      <FormField
        label="Invoice Terkait"
        hint={
          eligible.length === 0
            ? "Tidak ada invoice ditemukan untuk GR ini."
            : "Invoice untuk GR asal retur. Nomor invoice dipakai sebagai referensi transfer."
        }
      >
        {eligible.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada invoice ditemukan untuk GR ini. Isi referensi transfer secara manual.
          </div>
        ) : (
          <select
            title="Pilih Invoice"
            value={selectedInvId}
            onChange={(e) => handleInvoiceChange(Number(e.target.value))}
            className={inputBase}
          >
            {eligible.map((inv) => (
              <option key={inv.invoice_id} value={inv.invoice_id}>
                {inv.invoice_number} — {inv.invoice_date}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {/* Transfer ref — pre-filled from invoice, editable */}
      <FormField
        label="Nomor Referensi Transfer"
        hint="Diisi otomatis dari nomor invoice. Ubah jika nomor referensi dari vendor berbeda."
      >
        <input
          type="text"
          value={transferRef}
          onChange={(e) => setTransferRef(e.target.value)}
          placeholder="Contoh: INV-20260626-001"
          className={inputBase}
        />
      </FormField>

      <FormField label="Tanggal Transfer">
        <input
          type="date"
          title="Tanggal Transfer"
          value={transferDate}
          onChange={(e) => setTransferDate(e.target.value)}
          className={inputBase}
        />
      </FormField>

      {/* Expected amount reminder */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700 mb-0.5">
          Jumlah yang harus diterima
        </p>
        <p className="font-mono text-base font-bold text-emerald-600">
          Rp {new Intl.NumberFormat("id-ID").format(pr.total_amount)}
        </p>
        <p className="mt-1 text-slate-400">
          Pastikan nominal pada bukti transfer sesuai sebelum konfirmasi.
        </p>
      </div>

      <button
        type="button"
        disabled={!transferRef.trim() || !transferDate || submitting}
        onClick={() =>
          onConfirm({ transferRef: transferRef.trim(), transferDate })
        }
        className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Menyimpan…" : "Konfirmasi Refund Diterima"}
      </button>
    </div>
  );
}

// ─── Panel D: Open Credit ─────────────────────────────────────────────────────

function OpenCreditPanel({
  pr,
  submitting,
  onConfirm,
}: {
  pr: PurchaseReturnRow;
  submitting: boolean;
  onConfirm: (data: OpenCreditPayload) => void;
}) {
  const [creditAmount, setCreditAmount] = useState<string>(
    String(pr.total_amount)
  );

  const amountNum = Number(creditAmount.replace(/\D/g, "")) || 0;
  const overLimit = amountNum > pr.total_amount;

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 space-y-2 text-sm text-teal-800">
        <div className="flex items-center gap-2 font-semibold">
          <Wallet size={16} />
          Opsi D — Kredit Terbuka (Open Credit)
        </div>
        <p className="text-xs leading-relaxed text-teal-700">
          Nilai retur dimasukkan sebagai saldo kredit perusahaan di profil
          vendor. Saldo ini akan otomatis terpotong pada setiap PO baru sampai
          habis.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur" value={pr.purchase_return_number} />
        <InfoRow label="Supplier" value={pr.supplier_name} />
        <InfoRow
          label="Nilai Retur"
          value={`Rp ${new Intl.NumberFormat("id-ID").format(pr.total_amount)}`}
        />
        <InfoRow label="Supplier ID" value={String(pr.supplier_id)} />
      </div>

      {/* Credit amount (may be partial) */}
      <FormField
        label="Nominal Kredit yang Diposting (Rp)"
        hint={
          overLimit
            ? `Tidak boleh melebihi total retur (Rp ${new Intl.NumberFormat("id-ID").format(pr.total_amount)})`
            : "Defaultnya sama dengan total retur. Bisa dikecilkan jika ada biaya restocking."
        }
      >
        <input
          type="number"
          min={0}
          max={pr.total_amount}
          value={creditAmount}
          onChange={(e) => setCreditAmount(e.target.value)}
          className={cn(inputBase, overLimit && "border-rose-300 focus:ring-rose-200")}
        />
      </FormField>

      {!overLimit && amountNum > 0 && (
        <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-teal-700 space-y-1">
          <p className="font-semibold text-teal-800">Efek ke sistem</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>
              Saldo kredit vendor{" "}
              <span className="font-semibold">{pr.supplier_name}</span>{" "}
              bertambah{" "}
              <span className="font-mono font-bold">
                Rp {new Intl.NumberFormat("id-ID").format(amountNum)}
              </span>
            </li>
            <li>
              Saldo berkurang otomatis di setiap PO baru sampai mencapai 0
            </li>
            <li>Status retur berubah ke <span className="font-semibold">Credit Applied</span></li>
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={amountNum <= 0 || overLimit || submitting}
        onClick={() => onConfirm({ supplierId: pr.supplier_id, creditAmount: amountNum })}
        className="w-full py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Menyimpan…" : "Posting Kredit ke Profil Vendor"}
      </button>
    </div>
  );
}

// ─── Option icon/label map ────────────────────────────────────────────────────

const OPTION_META: Record<
  SettlementOption,
  { label: string; color: string }
> = {
  Replacement: {
    label: "Tukar Barang",
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  "Next PO Deduction": {
    label: "Potong PO Depan",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  "Cash Refund": {
    label: "Uang Kembali",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  "Open Credit": {
    label: "Kredit Terbuka",
    color: "bg-teal-100 text-teal-700 border-teal-200",
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
  const meta = OPTION_META[option];
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* Sheet */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px]">
                Selesaikan Retur
              </h2>
              <p className="text-slate-300 text-xs mt-0.5">
                {pr.purchase_return_number} — {pr.supplier_name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {meta && (
                <span
                  className={cn(
                    "hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                    meta.color
                  )}
                >
                  {meta.label}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body (scrollable) */}
          <div className="p-6 overflow-y-auto">
            {alreadySettled ? (
              <SettledBadge status={pr.status} />
            ) : option === "Replacement" ? (
              <ReplacementPanel
                pr={pr}
                goodsReceipts={goodsReceipts}
                submitting={submitting}
                onConfirm={(data) =>
                  handleSettle({ type: "Replacement", data })
                }
              />
            ) : option === "Next PO Deduction" ? (
              <NextPODeductionPanel
                pr={pr}
                purchaseOrders={purchaseOrders}
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
            ) : option === "Open Credit" ? (
              <OpenCreditPanel
                pr={pr}
                submitting={submitting}
                onConfirm={(data) =>
                  handleSettle({ type: "Open Credit", data })
                }
              />
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                Opsi penyelesaian tidak dikenali: {pr.settlement_option}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
