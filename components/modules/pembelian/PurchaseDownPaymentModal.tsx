"use client";

import { useEffect, useState } from "react";
import { X, Truck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseOrder {
  purchase_order_id: number;
  po_number: string;
  supplier_id: number;
  total_amount: number;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;

  supplier?: {
    supplier_id: number;
    supplier_name: string;
  };
}

export interface PurchaseDownPaymentFormData {
  purchase_order_id: number;
  supplier_id: number;
  payment_date: string | null;
  amount: number;
  payment_type: string;
  notes: string | null;
  status: string;
  transaction_name: string;
  transaction_detail: string;
}

interface PurchaseDownPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: PurchaseDownPaymentFormData
  ) => Promise<void> | void;

  purchaseOrders: PurchaseOrder[];

  /** When provided the modal operates in edit mode */
  editId?: number | null;
  initialData?: Partial<PurchaseDownPaymentFormData> | null;
  /** Navigate to GR page after a successful create */
  onNavigateToGR?: () => void;
}

export default function PurchaseDownPaymentModal({
  open,
  onClose,
  onSubmit,
  purchaseOrders,
  editId,
  initialData,
  onNavigateToGR,
}: PurchaseDownPaymentModalProps) {

  const isEdit = Boolean(editId);

  const emptyForm: PurchaseDownPaymentFormData = {
    purchase_order_id: 0,
    supplier_id: 0,
    payment_date: "",
    amount: 0,
    payment_type: "Partial",
    notes: "",
    status: "Paid",
    transaction_name: "",
    transaction_detail: "",
  };

  const [form, setForm] =
    useState<PurchaseDownPaymentFormData>(emptyForm);

  const [amountError, setAmountError] =
    useState<string | null>(null);

  const [isSubmitted, setIsSubmitted] =
    useState(false);

  useEffect(() => {

    if (open) {

      setForm(
        initialData
          ? { ...emptyForm, ...initialData }
          : emptyForm
      );

      setAmountError(null);
      setIsSubmitted(false);

    }

  }, [open, editId, initialData]);

  if (!open) return null;

  // Sort newest-first by purchase_order_id
  const sortedPOs = [...purchaseOrders].sort(
    (a, b) => b.purchase_order_id - a.purchase_order_id
  );

  const selectedPO =
    purchaseOrders.find(
      (po) =>
        po.purchase_order_id ===
        form.purchase_order_id
    );

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div
          className="
            bg-white
            rounded-2xl
            shadow-2xl
            w-full
            max-w-xl
            border
            border-slate-200
            overflow-hidden
          "
        >

          {/* HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              px-6
              py-4
              bg-gradient-to-r
              from-navy-900
              to-navy-600
            "
          >

            <div>

              <h2 className="text-white font-semibold text-[15px]">
                {isEdit ? "Edit Purchase Down Payment" : "Tambah Purchase Down Payment"}
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit ? "Perbarui data uang muka supplier" : "Catat pembayaran uang muka supplier"}
              </p>

            </div>

            <button
              onClick={onClose}
              className="
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                text-slate-400
                hover:text-white
                hover:bg-white/10
              "
            >
              <X size={16} />
            </button>

          </div>

          {/* BODY */}

          <div className="p-6 space-y-4">

            <FormField label="Purchase Order" required>

              <select
                value={form.purchase_order_id}
                onChange={(e) => {

                  const selected =
                    purchaseOrders.find(
                      (po) =>
                        po.purchase_order_id ===
                        Number(e.target.value)
                    );

                  if (!selected) return;

                  const resolvedSupplierId =
                    Number(
                      selected.supplier?.supplier_id ??
                      selected.supplier_id ??
                      0
                    );

                  setForm({
                    ...form,
                    purchase_order_id:
                      selected.purchase_order_id,
                    supplier_id: resolvedSupplierId,
                    transaction_name:
                      selected.transaction_name ?? "",
                    transaction_detail:
                      selected.transaction_detail ?? "",
                  });

                  // Re-evaluate amount against the new PO total
                  const newMax = selected.total_amount ?? 0;
                  if (newMax > 0 && form.amount > newMax) {
                    setAmountError(
                      `Melebihi total PO (Rp ${newMax.toLocaleString("id-ID")})`
                    );
                  } else {
                    setAmountError(null);
                  }

                }}
                className={inputBase}
              >

                <option value="">
                  Pilih Purchase Order
                </option>

                {sortedPOs.map((po) => (

                  <option
                    key={po.purchase_order_id}
                    value={po.purchase_order_id}
                  >
                    {po.po_number}
                    {po.transaction_name ? ` | ${po.transaction_name}` : ""}
                  </option>

                ))}

              </select>

            </FormField>

            <FormField label="Supplier">

              <input
                readOnly
                    value={
                    selectedPO?.supplier?.supplier_name ?? ""
                    }
                className={cn(
                  inputBase,
                  "bg-slate-50"
                )}
              />

            </FormField>

            <FormField label="Total PO">

            <input
                readOnly
                value={`Rp ${Number(
                selectedPO?.total_amount ?? 0
                ).toLocaleString("id-ID")}`}
                className={cn(
                inputBase,
                "bg-slate-50"
                )}
            />

            </FormField>

            <FormField label="Payment Date" required>

              <input
                type="date"
                value={form.payment_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_date:
                      e.target.value,
                  })
                }
                className={inputBase}
              />

            </FormField>

            <FormField label="Amount" required>

              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => {
                  const value = Math.round(parseFloat(e.target.value || "0") * 100) / 100;
                  const max = selectedPO?.total_amount ?? 0;

                  if (max > 0 && value > max) {
                    setAmountError(
                      `Melebihi total PO (Rp ${max.toLocaleString("id-ID")})`
                    );
                  } else {
                    setAmountError(null);
                  }

                  setForm({ ...form, amount: value });
                }}
                className={cn(
                  inputBase,
                  amountError && "border-red-400 focus:ring-red-300"
                )}
              />

              {amountError && (
                <p className="text-xs text-red-500 font-medium mt-1">
                  {amountError}
                </p>
              )}

            </FormField>

            <FormField label="Payment Type">

              <select
                value={form.payment_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_type:
                      e.target.value,
                  })
                }
                className={inputBase}
              >
                <option value="Partial">
                  Partial
                </option>

                <option value="Full">
                  Full
                </option>
              </select>

            </FormField>

            <FormField label="Notes">

              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes:
                      e.target.value,
                  })
                }
                className={inputBase}
              />

            </FormField>

            {(form.transaction_name || form.transaction_detail) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Transaction Info (dari PO)
                </p>
                {form.transaction_name && (
                  <p className="text-sm font-semibold text-slate-700">
                    {form.transaction_name}
                  </p>
                )}
                {form.transaction_detail && (
                  <p className="text-xs text-slate-500 whitespace-pre-wrap">
                    {form.transaction_detail}
                  </p>
                )}
              </div>
            )}

            {selectedPO?.nomor_faktur_pajak && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Nomor Faktur Pajak (dari PO)
                </p>
                <p className="font-mono font-semibold text-sm text-slate-700">
                  {selectedPO.nomor_faktur_pajak}
                </p>
              </div>
            )}

          </div>

          {/* FOOTER */}

          <div
            className="
              flex
              flex-col
              gap-3
              px-6
              py-4
              border-t
              border-slate-100
              bg-slate-50/60
            "
          >

            {isSubmitted && !isEdit && onNavigateToGR ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Lanjutkan Ke
                </p>

                <button
                  onClick={() => {
                    onClose();
                    onNavigateToGR();
                  }}
                  className="flex items-center gap-4 w-full p-3.5 rounded-xl border text-left transition-all bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 shrink-0">
                    <Truck size={15} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Goods Receipt</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Buat penerimaan barang untuk PO ini</p>
                  </div>
                  <ArrowRight size={13} className="text-emerald-600 shrink-0" />
                </button>

                <div className="flex justify-start">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-end gap-2">

                <button
                  onClick={onClose}
                  className="
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-slate-600
                    bg-white
                    border
                    border-slate-200
                    rounded-lg
                  "
                >
                  Batal
                </button>

                <button
                  onClick={async () => {

                    // Resolve supplier_id from the selected PO at submit time
                    // in case it wasn't set via initialData (nested API shape)
                    const resolvedSupplierId =
                      form.supplier_id ||
                      Number(selectedPO?.supplier?.supplier_id ?? selectedPO?.supplier_id ?? 0);

                    // Guard: payment_date is required
                    if (!form.payment_date) {
                      alert("Tanggal pembayaran harus diisi.");
                      return;
                    }

                    // Guard: amount must not exceed PO total
                    const max = selectedPO?.total_amount ?? 0;
                    if (max > 0 && form.amount > max) {
                      setAmountError(
                        `Melebihi total PO (Rp ${max.toLocaleString("id-ID")})`
                      );
                      return;
                    }

                    // Send null for empty strings so ASP.NET DateTime? binding succeeds
                    await onSubmit({
                      ...form,
                      supplier_id: resolvedSupplierId,
                      payment_date: form.payment_date || null as any,
                      notes: form.notes || null as any,
                    });

                    setIsSubmitted(true);

                  }}
                  disabled={!!amountError}
                  className="
                    px-5
                    py-2
                    text-sm
                    font-semibold
                    text-gold-400
                    bg-navy-900
                    rounded-lg
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {isEdit ? "Simpan Perubahan" : "Simpan DP"}
                </button>

              </div>
            )}

          </div>

        </div>

      </div>
    </>
  );
}

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

      <label
        className="
          text-xs
          font-semibold
          text-slate-600
          uppercase
          tracking-wide
        "
      >
        {label}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>

      {children}

    </div>
  );
}

const inputBase = `
  w-full
  px-3
  py-2.5
  text-sm
  rounded-lg
  border
  border-slate-200
  bg-white
  text-slate-700
  placeholder-slate-400
  focus:outline-none
`;