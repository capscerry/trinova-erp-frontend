"use client";

import { useEffect, useState } from "react";
import { X, Plus, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Settlement options -------------------------------------------------------

export type SettlementOption =
  | "Accept Loss"
  | "Next PO Deduction"
  | "Cash Refund";

export interface GoodsReceiptOption {
  goods_receipt_id: number;
  receipt_number: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_number: string;
  /** The PO id that backs this GR - needed to load its detail items */
  purchase_order_id: number;
  total_amount: number;
  nomor_faktur_pajak?: string;
}

export interface PODetailItem {
  purchase_order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;   // received qty on the GR
  price: number;
  subtotal: number;
}

/** A line in the return - subset of the GR's products */
export interface ReturnLineItem {
  product_id: number;
  product_name: string;
  /** Original received quantity - shown as read-only "Diterima" reference */
  qty_available: number;
  /** Units still available to return (remaining_qty from the backend) */
  remaining_qty: number;
  /** What the user chose to return - capped at remaining_qty */
  qty_return: number;
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
  /** Serialised line items - passed through as notes / for stock restoration */
  return_items: ReturnLineItem[];
}

export interface PurchaseOrderForValidation {
  purchase_order_id: number;
  supplier_id?: number;
  supplier_name?: string;
  status: string;
}

interface PurchaseReturnFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PurchaseReturnFormData) => Promise<void> | void;
  goodsReceipts: GoodsReceiptOption[];
  /**
   * Called when the user picks a Goods Receipt.
   * The page fetches `/purchase-return/gr/{grId}/available-details` and
   * returns the line items pre-shaped as ReturnLineItem[] (remaining_qty > 0
   * lines only, with unit_price resolved from PO details).
   * Return an empty array if the fetch fails - the form will show a warning.
   */
  onLoadReturnItems: (grId: number) => Promise<ReturnLineItem[]>;
  /** Auto-generated next return number from the backend */
  nextNumber?: string;
  /** Used to guard the Next PO Deduction option - pass all POs from the page */
  purchaseOrders?: PurchaseOrderForValidation[];
}

// --- Helpers ------------------------------------------------------------------

const SETTLEMENT_OPTIONS: SettlementOption[] = [
  "Accept Loss",
  "Next PO Deduction",
  "Cash Refund",
];

function getStatus(option: SettlementOption) {
  switch (option) {
    case "Accept Loss":       return "Awaiting Replacement";
    case "Next PO Deduction": return "Pending Deduction";
    case "Cash Refund":       return "Refund Pending";
  }
}

function getClosingCondition(option: SettlementOption) {
  switch (option) {
    case "Accept Loss":       return "Supplier will return fixed goods of the exact same product and quantity. Stock will be restored upon confirmation.";
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
    settlement_option: "Accept Loss",
    notes: "",
    status: getStatus("Accept Loss"),
    closing_condition: getClosingCondition("Accept Loss"),
    transaction_name: "",
    transaction_detail: "",
    return_items: [],
  };
}

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

// --- Component ----------------------------------------------------------------

export default function PurchaseReturnFormModal({
  open,
  onClose,
  onSubmit,
  goodsReceipts,
  onLoadReturnItems,
  nextNumber,
  purchaseOrders = [],
}: PurchaseReturnFormModalProps) {
  const [form, setForm] = useState<PurchaseReturnFormData>(() =>
    buildEmptyForm(nextNumber)
  );
  const [returnItems, setReturnItems] = useState<ReturnLineItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setForm(buildEmptyForm(nextNumber));
    setReturnItems([]);
    setLoadingItems(false);
    setIsSubmitting(false);
  }, [open, nextNumber]);

  if (!open) return null;

  const selectedGR = goodsReceipts.find(
    (gr) => gr.goods_receipt_id === form.goods_receipt_id
  );

  // Compute whether any active POs exist for the selected supplier -
  // used to guard the "Next PO Deduction" settlement option.
  const INACTIVE_PO_STATUSES = new Set(["Cancelled", "Completed", "Closed"]);
  const hasEligiblePOs = purchaseOrders.some((po) => {
    if (INACTIVE_PO_STATUSES.has(po.status)) return false;
    if (!selectedGR) return false;
    return (
      (selectedGR.supplier_id > 0 && po.supplier_id === selectedGR.supplier_id) ||
      po.supplier_name?.toLowerCase() === selectedGR.supplier_name.toLowerCase()
    );
  });

  // -- When user picks a GR, load returnable lines from the backend ------------

  const handleGRChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
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

    // Optimistically clear the previous GR's lines while fetching
    setReturnItems([]);
    setForm((f) => ({
      ...f,
      goods_receipt_id: gr.goods_receipt_id,
      supplier_id: gr.supplier_id,
      supplier_name: gr.supplier_name,
      purchase_order_number: gr.purchase_order_number,
      total_amount: 0,
      return_items: [],
    }));

    // Fetch lines that still have remaining_qty > 0 from the backend
    setLoadingItems(true);
    try {
      const items = await onLoadReturnItems(gr.goods_receipt_id);
      setReturnItems(items);
      setForm((f) => ({ ...f, return_items: items }));
    } finally {
      setLoadingItems(false);
    }
  };

  // -- Quantity change for a return line --------------------------------------

  const handleQtyChange = (productId: number, raw: number) => {
    setReturnItems((prev) => {
      const next = prev.map((item) => {
        if (item.product_id !== productId) return item;
        // Cap at remaining_qty - this is the backend-enforced maximum
        const qty = Math.max(0, Math.min(raw, item.remaining_qty));
        return { ...item, qty_return: qty, subtotal: qty * item.unit_price };
      });
      const total = next.reduce((s, i) => s + i.subtotal, 0);
      setForm((f) => ({ ...f, total_amount: total, return_items: next }));
      return next;
    });
  };

  // --- Submit ----------------------------------------------------------------

  const handleSubmit = async () => {
    if (isSubmitting) return;
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

    setIsSubmitting(true);
    try {
      await onSubmit(validated);
    } finally {
      setIsSubmitting(false);
    }
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

          {/* Body - scrollable */}
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
              <FormField label="Goods Receipt" required>
                <select
                  title="Pilih Goods Receipt"
                  value={form.goods_receipt_id}
                  onChange={handleGRChange}
                  className={inputBase}
                >
                  <option value={0}>Pilih Goods Receipt</option>
                  {goodsReceipts.map((gr) => (
                    <option key={gr.goods_receipt_id} value={gr.goods_receipt_id}>
                      {gr.receipt_number} - {gr.supplier_name}
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

            {selectedGR?.nomor_faktur_pajak && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Nomor Faktur Pajak (dari PO)
                </p>
                <p className="font-mono font-semibold text-sm text-slate-700">
                  {selectedGR.nomor_faktur_pajak}
                </p>
              </div>
            )}

            {selectedGR && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                  Produk yang Dikembalikan
                </label>

                {loadingItems ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500 text-center">
                    Memuat data produk-
                  </div>
                ) : returnItems.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                    Tidak ada item tersisa untuk dikembalikan pada Goods Receipt ini.
                    Semua qty sudah habis di-retur sebelumnya.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">
                            Produk
                          </th>
                          <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-20">
                            Diterima
                          </th>
                          <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-20">
                            Sisa
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
                            {/* Diterima - original received qty, read-only reference */}
                            <td className="px-3 py-2.5 text-center text-slate-400">
                              {item.qty_available}
                            </td>
                            {/* Sisa - remaining returnable qty, drives the cap */}
                            <td className={cn(
                              "px-3 py-2.5 text-center font-semibold",
                              item.remaining_qty === 0
                                ? "text-rose-500"
                                : item.remaining_qty < item.qty_available
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            )}>
                              {item.remaining_qty}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQtyChange(item.product_id, item.qty_return - 1)
                                  }
                                  disabled={item.qty_return <= 0}
                                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <Minus size={11} />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={item.remaining_qty}
                                  value={item.qty_return}
                                  onChange={(e) =>
                                    handleQtyChange(item.product_id, Number(e.target.value))
                                  }
                                  className="w-14 text-center text-sm font-semibold rounded border border-slate-200 py-1 px-1 focus:outline-none focus:ring-1 focus:ring-navy-300"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQtyChange(item.product_id, item.qty_return + 1)
                                  }
                                  disabled={item.qty_return >= item.remaining_qty}
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
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td
                            colSpan={5}
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
            <FormField label="Opsi Penyelesaian" required>
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
                className={cn(
                  inputBase,
                  form.settlement_option === "Cash Refund" &&
                    "border-amber-400 focus:ring-amber-300 bg-amber-50"
                )}
              >
                {SETTLEMENT_OPTIONS.map((option) => {
                  const isNextPO = option === "Next PO Deduction";
                  const disableNextPO = isNextPO && !!selectedGR && !hasEligiblePOs;
                  return (
                    <option key={option} value={option} disabled={disableNextPO}>
                      {option === "Accept Loss"       ? "Opsi A - Penggantian Barang (Accept Loss)" :
                       option === "Next PO Deduction"
                         ? disableNextPO
                           ? "Opsi B - Potong PO Berikutnya (tidak tersedia - belum ada PO aktif)"
                           : "Opsi B - Terima Kerugian / Potong PO Berikutnya"
                         : option === "Cash Refund"    ? "Opsi C - Cash Refund (Uang Kembali)"
                         : option}
                    </option>
                  );
                })}
              </select>

              {/* Next PO Deduction - no eligible POs warning */}
              {form.settlement_option === "Next PO Deduction" && selectedGR && !hasEligiblePOs && (
                <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">Tidak ada PO aktif untuk supplier ini</p>
                    <p className="leading-relaxed text-rose-700">
                      Opsi B memerlukan minimal satu PO aktif dari{" "}
                      <span className="font-semibold">{selectedGR.supplier_name}</span>.
                      Buat PO baru untuk supplier ini terlebih dahulu, atau pilih opsi lain:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                      <li><span className="font-semibold">Opsi A</span> - Supplier mengirim kembali barang pengganti</li>
                      <li><span className="font-semibold">Opsi C</span> - Nilai retur dikembalikan tunai melalui invoice</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Cash Refund constraint warning */}
              {form.settlement_option === "Cash Refund" && (
                <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">Cash Refund memerlukan invoice yang belum lunas</p>
                    <p className="leading-relaxed text-amber-700">
                      Opsi ini hanya dapat diproses jika supplier memiliki{" "}
                      <span className="font-semibold">invoice yang masih outstanding</span>.
                      Jika tidak ada, pilih:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      <li><span className="font-semibold">Opsi A</span> - Supplier mengirim kembali barang pengganti</li>
                      <li><span className="font-semibold">Opsi B</span> - Nilai retur dipotong dari PO berikutnya</li>
                    </ul>
                    <p className="text-amber-600 italic">
                      Jika Anda menyimpan dengan Opsi C saat tidak ada invoice outstanding, server akan menolak permintaan ini.
                    </p>
                  </div>
                </div>
              )}
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
            {selectedGR && !loadingItems && returnItems.length === 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                Goods Receipt ini tidak memiliki sisa qty yang dapat dikembalikan.
              </div>
            )}
            {selectedGR && !loadingItems && returnItems.length > 0 && !hasSelection && (
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
              disabled={
                isSubmitting ||
                !selectedGR ||
                loadingItems ||
                !hasSelection ||
                (form.settlement_option === "Next PO Deduction" && !!selectedGR && !hasEligiblePOs)
              }
              className="px-4 py-2 rounded-lg bg-navy-900 text-white hover:bg-navy-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Menyimpan…" : "Simpan Retur"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// --- Sub-components -----------------------------------------------------------

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none";
