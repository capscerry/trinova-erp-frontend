"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettlementOption =
  | "Replacement"
  | "Next PO Deduction"
  | "Cash Refund"
  | "Open Credit";

export interface GoodsReceiptOption {
  goods_receipt_id: number;
  receipt_number: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_number: string;
  total_amount: number;
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
}

interface PurchaseReturnFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PurchaseReturnFormData) => void;
  goodsReceipts: GoodsReceiptOption[];
  /** Auto-generated next return number from the backend (e.g. PR-0000000001) */
  nextNumber?: string;
}

const SETTLEMENT_OPTIONS: SettlementOption[] = [
  "Replacement",
  "Next PO Deduction",
  "Cash Refund",
  "Open Credit",
];

function getStatus(option: SettlementOption) {
  switch (option) {
    case "Replacement":       return "Awaiting Replacement";
    case "Next PO Deduction": return "Pending Deduction";
    case "Cash Refund":       return "Refund Pending";
    case "Open Credit":       return "Open Credit";
  }
}

function getClosingCondition(option: SettlementOption) {
  switch (option) {
    case "Replacement":       return "Return item and ship replacement before closing.";
    case "Next PO Deduction": return "Settle the refund as a deduction on the next purchase order.";
    case "Cash Refund":       return "Process cash refund to supplier to close this return note.";
    case "Open Credit":       return "Keep an open credit balance for future supplier invoices.";
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
  };
}

export default function PurchaseReturnFormModal({
  open,
  onClose,
  onSubmit,
  goodsReceipts,
  nextNumber,
}: PurchaseReturnFormModalProps) {
  const [form, setForm] = useState<PurchaseReturnFormData>(() => buildEmptyForm(nextNumber));

  // Reset form with the latest nextNumber every time the modal opens
  useEffect(() => {
    if (!open) return;
    setForm(buildEmptyForm(nextNumber));
  }, [open, nextNumber]);

  if (!open) return null;

  const selectedGR = goodsReceipts.find(
    (gr) => gr.goods_receipt_id === form.goods_receipt_id
  );

  const handleGRChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = goodsReceipts.find(
      (gr) => gr.goods_receipt_id === Number(e.target.value)
    );
    if (!selected) {
      setForm((f) => ({
        ...f,
        goods_receipt_id: 0,
        supplier_id: 0,
        supplier_name: "",
        purchase_order_number: "",
        total_amount: 0,
      }));
      return;
    }
    setForm((f) => ({
      ...f,
      goods_receipt_id: selected.goods_receipt_id,
      supplier_id: selected.supplier_id,
      supplier_name: selected.supplier_name,
      purchase_order_number: selected.purchase_order_number,
      total_amount: selected.total_amount,
    }));
  };

  const handleSubmit = () => {
    if (!selectedGR) return;

    const validated: PurchaseReturnFormData = {
      ...form,
      supplier_id: selectedGR.supplier_id,
      supplier_name: selectedGR.supplier_name,
      purchase_order_number: selectedGR.purchase_order_number,
      total_amount: selectedGR.total_amount,
      status: getStatus(form.settlement_option),
      closing_condition: getClosingCondition(form.settlement_option),
    };
    onSubmit(validated);
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-navy-900 to-navy-600">
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

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Nomor Retur — pre-filled from nextNumber, still editable */}
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

            {/* Read-only fields driven by form state (set on GR selection) */}
            <div className="grid gap-4 md:grid-cols-3">
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
              <FormField label="Total Retur">
                <input
                  readOnly
                  value={form.total_amount > 0 ? String(form.total_amount) : ""}
                  className={cn(inputBase, "bg-slate-50")}
                />
              </FormField>
            </div>

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
                rows={4}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={cn(inputBase, "resize-none")}
                placeholder="Tambahkan alasan retur atau instruksi tambahan"
              />
            </FormField>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800 mb-1">
                Kondisi penyelesaian
              </p>
              <p>{form.closing_condition}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="px-6 pb-4">
            {!selectedGR && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Pilih Goods Receipt terlebih dahulu untuk mengisi data retur.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
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
              disabled={!selectedGR}
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
