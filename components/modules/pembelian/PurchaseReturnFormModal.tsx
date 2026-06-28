"use client";

import { useEffect, useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Settlement options (no Open Credit) ─────────────────────────────────────

export type SettlementOption =
  | "Replacement"
  | "Next PO Deduction"
  | "Cash Refund";

export interface GoodsReceiptOption {
  goods_receipt_id: number;
  receipt_number: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_number: string;
  /** The PO id that backs this GR — needed to load its detail items */
  purchase_order_id: number;
  total_amount: number;
}

export interface PODetailItem {
  purchase_order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;   // received qty on the GR
  price: number;
  subtotal: number;
}

/** A line in the return — subset of the GR's products */
export interface ReturnLineItem {
  product_id: number;
  product_name: string;
  qty_available: number;  // max from GR
  qty_return: number;     // what the user chose to return
  unit_price: number;
  subtotal: number;       // qty_return * unit_price
}

export interface PurchaseReturnFormData {
  goods_receipt_id: number;
  purchase_return_number: string;
  return_date: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_number: string;
  total_amount: number;
  settlement_option: SettlementOption;
  notes: string;
  status: string;
  closing_condition: string;
  transaction_name: string;
  transaction_detail: string;
  /** Serialised line items — passed through as notes / for stock restoration */
  return_items: ReturnLineItem[];
}

interface PurchaseReturnFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PurchaseReturnFormData) => void;
  goodsReceipts: GoodsReceiptOption[];
  poDetails: PODetailItem[];
  /** Auto-generated next return number from the backend */
  nextNumber?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SETTLEMENT_OPTIONS: SettlementOption[] = [
  "Replacement",
  "Next PO Deduction",
  "Cash Refund",
];

function getStatus(option: SettlementOption) {
  switch (option) {
    case "Replacement":       return "Awaiting Replacement";
    case "Next PO Deduction": return "Pending Deduction";
    case "Cash Refund":       return "Refund Pending";
  }
}

function getClosingCondition(option: SettlementOption) {
  switch (option) {
    case "Replacement":       return "Return item and ship replacement before closing.";
    case "Next PO Deduction": return "Settle the refund as a deduction on the next purchase order.";
    case "Cash Refund":       return "Process cash refund to supplier to close this return note.";
  }
}

function buildEmptyForm(nextNumber = ""): PurchaseReturnFormData {
  return {
    goods_receipt_id: 0,
    purchase_return_number: nextNumber,
    return_date: new Date().toISOString().split("T")[0],
    supplier_id: 0,
    supplier_name: "",
    purchase_order_number: "",
    total_amount: 0,
    settlement_option: "Replacement",
    notes: "",
    status: getStatus("Replacement"),
    closing_condition: getClosingCondition("Replacement"),
    transaction_name: "",
    transaction_detail: "",
    return_items: [],
  };
}

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseReturnFormModal({
  open,
  onClose,
  onSubmit,
  goodsReceipts,
  poDetails,
  nextNumber,
}: PurchaseReturnFormModalProps) {
  const [form, setForm] = useState<PurchaseReturnFormData>(() =>
    buildEmptyForm(nextNumber)
  );
  const [returnItems, setReturnItems] = useState<ReturnLineItem[]>([]);

  // Reset whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setForm(buildEmptyForm(nextNumber));
    setReturnItems([]);
  }, [open, nextNumber]);

  if (!open) return null;

  const selectedGR = goodsReceipts.find(
    (gr) => gr.goods_receipt_id === form.goods_receipt_id
  );

  // ── When user picks a GR, populate return-item rows from PO details ─────────

  const handleGRChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const grId = Number(e.target.value);
    const gr = goodsReceipts.find((g) => g.goods_receipt_id === grId);

    if (!gr) {
      setForm((f) => ({
        ...f,
        goods_receipt_id: 0,
        supplier_id: 0,
        supplier_name: "",
        purchase_order_number: "",
        total_amount: 0,
        return_items: [],
      }));
      setReturnItems([]);
      return;
    }

    // Load PO detail items for this GR's PO
    const items = poDetails
      .filter((d) => Number(d.purchase_order_id) === Number(gr.purchase_order_id))
      .map((d) => ({
        product_id: d.product_id,
        product_name: d.product_name ?? `Produk #${d.product_id}`,
        qty_available: d.quantity,
        qty_return: 0,
        unit_price: d.price,
        subtotal: 0,
      } satisfies ReturnLineItem));

    setReturnItems(items);

    setForm((f) => ({
      ...f,
      goods_receipt_id: gr.goods_receipt_id,
      supplier_id: gr.supplier_id,
      supplier_name: gr.supplier_name,
      purchase_order_number: gr.purchase_order_number,
      total_amount: 0,
      return_items: items,
    }));
  };

  // ── Quantity change for a return line ──────────────────────────────────────

  const handleQtyChange = (productId: number, raw: number) => {
    setReturnItems((prev) => {
      const next = prev.map((item) => {
        if (item.product_id !== productId) return item;
        const qty = Math.max(0, Math.min(raw, item.qty_available));
        return { ...item, qty_return: qty, subtotal: qty * item.unit_price };
      });
      const total = next.reduce((s, i) => s + i.subtotal, 0);
      setForm((f) => ({ ...f, total_amount: total, return_items: next }));
      return next;
    });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!selectedGR) return;
    if (returnItems.every((i) => i.qty_return === 0)) return;

    const validated: PurchaseReturnFormData = {
      ...form,
      supplier_id: selectedGR.supplier_id,
      supplier_name: selectedGR.supplier_name,
      purchase_order_number: selectedGR.purchase_order_number,
      total_amount: returnItems.reduce((s, i) => s + i.subtotal, 0),
      status: getStatus(form.settlement_option),
      closing_condition: getClosingCondition(form.settlement_option),
      return_items: returnItems.filter((i) => i.qty_return > 0),
    };
    onSubmit(validated);
  };

  const totalReturn = returnItems.reduce((s, i) => s + i.subtotal, 0);
  const hasSelection = returnItems.some((i) => i.qty_return > 0);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px]">
                Tambah Purchase Return
              </h2>
              <p className="text-slate-300 text-xs mt-0.5">
                Catat retur pembelian dan pilih opsi penyelesaian.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Return number */}
            <FormField label="Nomor Retur">
              <input
                type="text"
                value={form.purchase_return_number}
                onChange={(e) =>
                  setForm({ ...form, purchase_return_number: e.target.value })
                }
                placeholder="Kosongkan untuk auto-generate"
                className={inputBase}
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Tanggal Retur">
                <input
                  type="date"
                  title="Tanggal Retur"
                  value={form.return_date}
                  onChange={(e) =>
                    setForm({ ...form, return_date: e.target.value })
                  }
                  className={inputBase}
                />
              </FormField>
              <FormField label="Goods Receipt">
                <select
                  title="Pilih Goods Receipt"
                  value={form.goods_receipt_id}
                  onChange={handleGRChange}
                  className={inputBase}
                >
                  <option value={0}>Pilih Goods Receipt</option>
                  {goodsReceipts.map((gr) => (
                    <option key={gr.goods_receipt_id} value={gr.goods_receipt_id}>
                      {gr.receipt_number} — {gr.supplier_name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Read-only context fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Supplier">
                <input
                  readOnly
                  value={form.supplier_name}
                  className={cn(inputBase, "bg-slate-50")}
                />
              </FormField>
              <FormField label="Nomor PO Terkait">
                <input
                  readOnly
                  value={form.purchase_order_number}
                  className={cn(inputBase, "bg-slate-50")}
                />
              </FormField>
            </div>

            {/* ── Product / quantity picker ─────────────────────────────── */}
            {selectedGR && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                  Produk yang Dikembalikan
                </label>

                {returnItems.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                    Tidak ada item ditemukan pada PO terkait GR ini.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">
                            Produk
                          </th>
                          <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-24">
                            Tersedia
                          </th>
                          <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-32">
                            Qty Retur
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-28">
                            Harga
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-28">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {returnItems.map((item) => (
                          <tr
                            key={item.product_id}
                            className={cn(
                              "hover:bg-slate-50/60",
                              item.qty_return > 0 && "bg-sky-50/40"
                            )}
                          >
                            <td className="px-3 py-2.5 font-medium text-slate-700">
                              {item.product_name}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-500">
                              {item.qty_available}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQtyChange(
                                      item.product_id,
                                      item.qty_return - 1
                                    )
                                  }
                                  disabled={item.qty_return <= 0}
                                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <Minus size={11} />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={item.qty_available}
                                  value={item.qty_return}
                                  onChange={(e) =>
                                    handleQtyChange(
                                      item.product_id,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-14 text-center text-sm font-semibold rounded border border-slate-200 py-1 px-1 focus:outline-none focus:ring-1 focus:ring-navy-300"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQtyChange(
                                      item.product_id,
                                      item.qty_return + 1
                                    )
                                  }
                                  disabled={
                                    item.qty_return >= item.qty_available
                                  }
                                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-600">
                              Rp {formatRp(item.unit_price)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                              {item.qty_return > 0
                                ? `Rp ${formatRp(item.subtotal)}`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td
                            colSpan={4}
                            className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500"
                          >
                            Total Retur
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-sm text-navy-800">
                            Rp {formatRp(totalReturn)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Settlement option */}
            <FormField label="Opsi Penyelesaian">
              <select
                title="Opsi Penyelesaian"
                value={form.settlement_option}
                onChange={(e) => {
                  const option = e.target.value as SettlementOption;
                  setForm({
                    ...form,
                    settlement_option: option,
                    status: getStatus(option),
                    closing_condition: getClosingCondition(option),
                  });
                }}
                className={inputBase}
              >
                {SETTLEMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Keterangan / Catatan">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={cn(inputBase, "resize-none")}
                placeholder="Tambahkan alasan retur atau instruksi tambahan"
              />
            </FormField>

            <FormField label="Transaction Name">
              <input
                type="text"
                value={form.transaction_name}
                onChange={(e) =>
                  setForm({ ...form, transaction_name: e.target.value })
                }
                placeholder="Nama transaksi..."
                className={inputBase}
              />
            </FormField>

            <FormField label="Transaction Detail">
              <textarea
                rows={2}
                value={form.transaction_detail}
                onChange={(e) =>
                  setForm({ ...form, transaction_detail: e.target.value })
                }
                placeholder="Detail transaksi..."
                className={cn(inputBase, "resize-none")}
              />
            </FormField>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800 mb-1">
                Kondisi penyelesaian
              </p>
              <p>{form.closing_condition}</p>
            </div>
          </div>

          {/* Warnings */}
          <div className="px-6 pb-3 shrink-0 space-y-2">
            {!selectedGR && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Pilih Goods Receipt terlebih dahulu untuk mengisi data retur.
              </div>
            )}
            {selectedGR && !hasSelection && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Pilih setidaknya satu produk dengan qty retur lebih dari 0.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedGR || !hasSelection}
              className="px-4 py-2 rounded-lg bg-navy-900 text-white hover:bg-navy-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              Simpan Retur
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none";
