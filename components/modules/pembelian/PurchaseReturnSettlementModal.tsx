"use client";

import { useState } from "react";
import {
  X,
  PackageCheck,
  Scissors,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
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

/** Option A — user picks replacement products to PO; return amount is applied as a discount */
export interface ReplacementPayload {
  targetPOId: number;
  targetPONumber: string;
  /** New PO total after applying the return-amount discount */
  newPOTotal: number;
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
  | { type: "Replacement";       data: ReplacementPayload }
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
  /** All supplier-products — Option A filters to same supplier */
  supplierProducts: SupplierProductOption[];
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

// ─── Panel A: Replacement — pick supplier products + select a PO to discount ──

interface PickedProduct {
  supplier_product_id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  qty: number;
}

function ReplacementPanel({
  pr, purchaseOrders, supplierProducts, submitting, onConfirm,
}: {
  pr: PurchaseReturnRow;
  purchaseOrders: PurchaseOrderOption[];
  supplierProducts: SupplierProductOption[];
  submitting: boolean;
  onConfirm: (data: ReplacementPayload) => void;
}) {
  // Products from the same supplier
  const availableProducts = supplierProducts.filter((sp) => {
    if (pr.supplier_id > 0 && sp.supplier_id > 0)
      return sp.supplier_id === pr.supplier_id;
    return true; // no supplier_id to filter by
  });

  // Active POs from same supplier (any non-Cancelled/Completed/Closed)
  const eligiblePOs = purchaseOrders.filter((po) => {
    const sameSupplier =
      (pr.supplier_id > 0 && po.supplier_id === pr.supplier_id) ||
      po.supplier_name?.toLowerCase() === pr.supplier_name.toLowerCase();
    const isActive = !["Cancelled", "Completed", "Closed"].includes(po.status);
    return sameSupplier && isActive;
  });

  const [picked, setPicked] = useState<PickedProduct[]>([]);
  const [selectedPOId, setSelectedPOId] = useState<number>(
    eligiblePOs[0]?.purchase_order_id ?? 0
  );

  const selectedPO = eligiblePOs.find((p) => p.purchase_order_id === selectedPOId);
  const pickedTotal = picked.reduce((s, p) => s + p.unit_price * p.qty, 0);
  const discount = pr.total_amount;
  const newPOTotal = Math.max(0, (selectedPO?.total_amount ?? 0) - discount);

  const handleAddProduct = (spId: number) => {
    const sp = availableProducts.find((p) => p.supplier_product_id === spId);
    if (!sp) return;
    setPicked((prev) => {
      if (prev.find((p) => p.supplier_product_id === spId)) return prev;
      return [...prev, { ...sp, qty: 1 }];
    });
  };

  const handleQty = (spId: number, delta: number) => {
    setPicked((prev) =>
      prev
        .map((p) => p.supplier_product_id === spId ? { ...p, qty: Math.max(1, p.qty + delta) } : p)
        .filter((p) => p.qty > 0)
    );
  };

  const handleRemove = (spId: number) => {
    setPicked((prev) => prev.filter((p) => p.supplier_product_id !== spId));
  };

  const canConfirm = picked.length > 0 && selectedPO != null && !submitting;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-1.5 text-sm text-sky-800">
        <div className="flex items-center gap-2 font-semibold">
          <PackageCheck size={16} />
          Opsi A — Tukar Barang (Replacement)
        </div>
        <p className="text-xs leading-relaxed text-sky-700">
          Pilih produk pengganti dari katalog supplier ini. Total retur (Rp {fmt(discount)}) akan
          dipotong langsung dari total PO yang dipilih sebagai diskon.
        </p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
        <InfoRow label="No. Retur"   value={pr.purchase_return_number} />
        <InfoRow label="Supplier"    value={pr.supplier_name} />
        <InfoRow label="Nilai Retur (Diskon)" value={`Rp ${fmt(discount)}`} />
      </div>

      {/* Product picker */}
      <FormField label="Tambah Produk Pengganti" hint="Produk dari katalog supplier yang sama">
        {availableProducts.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada produk dari supplier ini di katalog.
          </div>
        ) : (
          <select
            title="Pilih produk"
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleAddProduct(Number(e.target.value)); e.target.value = ""; }}
            className={inputBase}
          >
            <option value="">— Pilih produk untuk ditambahkan —</option>
            {availableProducts
              .filter((sp) => !picked.find((p) => p.supplier_product_id === sp.supplier_product_id))
              .map((sp) => (
                <option key={sp.supplier_product_id} value={sp.supplier_product_id}>
                  {sp.product_name} — Rp {fmt(sp.unit_price)}
                </option>
              ))}
          </select>
        )}
      </FormField>

      {/* Picked products table */}
      {picked.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-400">Produk</th>
                <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-slate-400 w-28">Qty</th>
                <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-slate-400 w-28">Subtotal</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {picked.map((p) => (
                <tr key={p.supplier_product_id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-medium text-slate-700">{p.product_name}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => handleQty(p.supplier_product_id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100">
                        <Minus size={11} />
                      </button>
                      <span className="w-8 text-center font-semibold">{p.qty}</span>
                      <button type="button" onClick={() => handleQty(p.supplier_product_id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100">
                        <Plus size={11} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">Rp {fmt(p.unit_price * p.qty)}</td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => handleRemove(p.supplier_product_id)}
                      className="text-rose-400 hover:text-rose-600 text-xs font-bold">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={2} className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-500">Total Produk</td>
                <td className="px-3 py-2 text-right font-bold text-slate-800">Rp {fmt(pickedTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* PO picker */}
      <FormField
        label="PO yang Mendapat Diskon Retur"
        hint={eligiblePOs.length === 0 ? "Belum ada PO aktif dari supplier ini." : "Total PO akan dikurangi sebesar nilai retur."}
      >
        {eligiblePOs.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Tidak ada PO aktif dari supplier ini.
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

      {/* Preview */}
      {selectedPO && (
        <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-700 space-y-1">
          <p className="font-semibold text-sky-800">Preview potongan PO</p>
          <p>
            PO <span className="font-mono font-semibold">{selectedPO.po_number}</span>{" "}
            berkurang dari <span className="font-semibold">Rp {fmt(selectedPO.total_amount)}</span>{" "}
            menjadi <span className="font-semibold text-emerald-700">Rp {fmt(newPOTotal)}</span>.
          </p>
        </div>
      )}

      <button type="button" disabled={!canConfirm}
        onClick={() => selectedPO && onConfirm({
          targetPOId: selectedPO.purchase_order_id,
          targetPONumber: selectedPO.po_number,
          newPOTotal,
          returnAmount: discount,
        })}
        className="w-full py-2.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
        {submitting ? "Menyimpan…" : "Konfirmasi Penggantian & Potong PO"}
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
  const newPOTotal = Math.max(0, (selectedPO?.total_amount ?? 0) - deduction);

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

      {selectedPO && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-700 space-y-1">
          <p className="font-semibold text-violet-800">Preview potongan</p>
          <p>
            PO <span className="font-mono font-semibold">{selectedPO.po_number}</span>{" "}
            akan berkurang dari <span className="font-semibold">Rp {fmt(selectedPO.total_amount)}</span>{" "}
            menjadi <span className="font-semibold text-emerald-700">Rp {fmt(newPOTotal)}</span>.
          </p>
          <p>Status retur → <span className="font-semibold">Deduction Locked</span>.</p>
        </div>
      )}

      <button type="button"
        disabled={!selectedPO || submitting || eligiblePOs.length === 0}
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
  // Primary filter: invoices whose GR matches this return's GR
  let eligible = purchaseInvoices.filter(
    (inv) => inv.goods_receipt_id === pr.goods_receipt_id && pr.goods_receipt_id > 0
  );
  // Fallback: same supplier when GR id is 0 or unmatched
  if (eligible.length === 0) {
    eligible = purchaseInvoices.filter(
      (inv) =>
        inv.supplier_name.toLowerCase().trim() ===
        pr.supplier_name.toLowerCase().trim()
    );
  }

  const [selectedInvId, setSelectedInvId] = useState<number>(
    eligible[0]?.invoice_id ?? 0
  );
  const [returnDate, setReturnDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const selectedInv = eligible.find((inv) => inv.invoice_id === selectedInvId);
  const deduction = pr.total_amount;

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
                {inv.total_amount != null ? ` — Rp ${fmt(inv.total_amount)}` : ""}
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

      {selectedInv && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 space-y-1">
          <p className="font-semibold text-amber-800">Efek ke invoice</p>
          <p>
            Kredit <span className="font-semibold">Rp {fmt(deduction)}</span> akan
            dicatat sebagai pembayaran (Return Credit) pada invoice{" "}
            <span className="font-mono font-semibold">{selectedInv.invoice_number}</span>,
            mengurangi outstanding balance-nya.
          </p>
          <p className="text-amber-600">Pastikan transfer dari supplier telah diterima sebelum konfirmasi.</p>
        </div>
      )}

      <button type="button"
        disabled={!selectedInv || eligible.length === 0 || !returnDate || submitting}
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
  Replacement: {
    label: "Tukar Barang",
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
  purchaseOrders, goodsReceipts, purchaseInvoices, supplierProducts,
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
            ) : option === "Replacement" ? (
              <ReplacementPanel
                pr={pr}
                purchaseOrders={purchaseOrders}
                supplierProducts={supplierProducts}
                submitting={submitting}
                onConfirm={(data) => handleSettle({ type: "Replacement", data })}
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
