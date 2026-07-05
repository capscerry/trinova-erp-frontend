"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const formatINVNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
};

interface PurchaseInvoice {
  purchase_invoice_id: number;
  invoice_number: string;

  supplier_id: number;
  supplier_name: string;

  total_amount: number;

  dp_paid: number;

  outstanding_amount: number;

  transaction_name?: string;

  transaction_detail?: string;
}

export interface PurchasePaymentFormData {
  purchase_invoice_id: number;

  payment_date: string;

  amount: number;

  payment_method: string;

  notes: string;

  status: string;

  transaction_name: string;

  transaction_detail: string;
}

interface PurchasePaymentModalProps {
  open: boolean;

  isEdit?: boolean;

  initialData?: PurchasePaymentFormData & {
    purchase_payment_id?: number;
    invoice_number?: string;
    supplier_name?: string;
  };

  onClose: () => void;

  onSubmit: (
    data: PurchasePaymentFormData
  ) => void;

  purchaseInvoices: PurchaseInvoice[];
}

const EMPTY_FORM: PurchasePaymentFormData = {
  purchase_invoice_id: 0,
  payment_date: "",
  amount: 0,
  payment_method: "Transfer",
  notes: "",
  status: "Paid",
  transaction_name: "",
  transaction_detail: "",
};

export default function PurchasePaymentFormModal({
  open,
  isEdit = false,
  initialData,
  onClose,
  onSubmit,
  purchaseInvoices,
}: PurchasePaymentModalProps) {

  const [form, setForm] =
    useState<PurchasePaymentFormData>(EMPTY_FORM);

  const [amountError, setAmountError] =
    useState<string>("");

  useEffect(() => {

    if (open) {

      if (isEdit && initialData) {

        setForm({
          purchase_invoice_id: initialData.purchase_invoice_id,
          payment_date:        initialData.payment_date,
          amount:              initialData.amount,
          payment_method:      initialData.payment_method,
          notes:               initialData.notes,
          status:              initialData.status,
          transaction_name:    initialData.transaction_name ?? "",
          transaction_detail:  initialData.transaction_detail ?? "",
        });

      } else {

        setForm(EMPTY_FORM);
        setAmountError("");

      }
    }

  }, [open, isEdit, initialData]);

  if (!open) return null;

  // In edit mode, include all invoices so the current one is selectable.
  // In create mode, only show invoices that still have an outstanding balance.
  const invoiceOptions = isEdit
    ? purchaseInvoices
    : purchaseInvoices.filter((x) => x.outstanding_amount > 0);

  // Sort newest-first by purchase_invoice_id
  const sortedInvoiceOptions = [...invoiceOptions].sort(
    (a, b) => b.purchase_invoice_id - a.purchase_invoice_id
  );

  const selectedInvoice =
    purchaseInvoices.find(
      (inv) =>
        inv.purchase_invoice_id ===
        form.purchase_invoice_id
    );

  // Maximum payable = outstanding amount (Total - DP - prior payments)
  const maxPayable = selectedInvoice?.outstanding_amount ?? 0;

  return (
    <>
      <div
        onClick={onClose}
        className="
          fixed
          inset-0
          bg-black/50
          backdrop-blur-[2px]
          z-40
        "
      />

      <div
        className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          p-4
        "
      >

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

              <h2
                className="
                  text-white
                  font-semibold
                  text-[15px]
                "
              >
                {isEdit
                  ? "Edit Purchase Payment"
                  : "Tambah Purchase Payment"}
              </h2>

              <p
                className="
                  text-slate-400
                  text-xs
                  mt-0.5
                "
              >
                {isEdit
                  ? "Ubah data pembayaran invoice supplier"
                  : "Catat pembayaran invoice supplier"}
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

            <FormField
              label="Purchase Invoice"
            >

              <select
                value={form.purchase_invoice_id}
                disabled={isEdit}
                onChange={(e) => {

                  const selected =
                    invoiceOptions.find(
                      (inv) =>
                        inv.purchase_invoice_id ===
                        Number(e.target.value)
                    );

                  setForm({
                    ...form,
                    purchase_invoice_id: Number(e.target.value),
                    amount: selected?.outstanding_amount ?? 0,
                    transaction_name:   selected?.transaction_name  ?? form.transaction_name,
                    transaction_detail: selected?.transaction_detail ?? form.transaction_detail,
                  });

                }}
                className={cn(
                  inputBase,
                  isEdit && "bg-slate-50 cursor-not-allowed"
                )}
              >

                <option value="">
                  Pilih Invoice
                </option>

                {sortedInvoiceOptions.map((inv) => (

                  <option
                    key={inv.purchase_invoice_id}
                    value={inv.purchase_invoice_id}
                  >
                    {formatINVNumber(inv.invoice_number)}
                    {inv.transaction_name ? ` | ${inv.transaction_name}` : ""}
                    {" | Outstanding: Rp "}
                    {Number(inv.outstanding_amount).toLocaleString("id-ID")}
                  </option>

                ))}

              </select>

            </FormField>

            <FormField label="Supplier">

              <input
                readOnly
                value={selectedInvoice?.supplier_name ?? ""}
                className={cn(inputBase, "bg-slate-50")}
              />

            </FormField>

            <FormField label="Invoice Amount">

              <input
                readOnly
                value={`Rp ${Number(
                  selectedInvoice?.total_amount ?? 0
                ).toLocaleString("id-ID")}`}
                className={cn(inputBase, "bg-slate-50")}
              />

            </FormField>

            <FormField label="DP Paid">

              <input
                readOnly
                value={`Rp ${Number(
                  selectedInvoice?.dp_paid ?? 0
                ).toLocaleString("id-ID")}`}
                className={cn(inputBase, "bg-slate-50")}
              />

            </FormField>

            <FormField label="Outstanding Amount">

              <input
                readOnly
                value={`Rp ${Number(
                  selectedInvoice?.outstanding_amount ?? 0
                ).toLocaleString("id-ID")}`}
                className={cn(inputBase, "bg-slate-50")}
              />

            </FormField>

            <FormField label="Payment Date">

              <input
                type="date"
                value={form.payment_date}
                onChange={(e) =>
                  setForm({ ...form, payment_date: e.target.value })
                }
                className={inputBase}
              />

            </FormField>

            <FormField label="Payment Amount">

              <input
                type="number"
                value={form.amount}
                min={0}
                max={maxPayable > 0 ? maxPayable : undefined}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setForm({ ...form, amount: val });
                  if (maxPayable > 0 && val > maxPayable) {
                    setAmountError(
                      `Melebihi sisa tagihan. Maksimal: Rp ${maxPayable.toLocaleString("id-ID")}`
                    );
                  } else {
                    setAmountError("");
                  }
                }}
                className={cn(
                  inputBase,
                  amountError && "border-rose-400 focus:ring-rose-300"
                )}
              />
              {amountError && (
                <p className="text-xs text-rose-500 mt-1">{amountError}</p>
              )}

            </FormField>

            <FormField label="Payment Method">

              <select
                value={form.payment_method}
                onChange={(e) =>
                  setForm({ ...form, payment_method: e.target.value })
                }
                className={inputBase}
              >
                <option value="Transfer">Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Giro">Giro</option>
              </select>

            </FormField>

            <FormField label="Notes">

              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                className={inputBase}
              />

            </FormField>

            {(form.transaction_name || form.transaction_detail) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Transaction Info (dari Invoice)
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

          </div>

          {/* FOOTER */}

          <div
            className="
              flex
              items-center
              justify-end
              gap-2
              px-6
              py-4
              border-t
              border-slate-100
              bg-slate-50/60
            "
          >

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
              onClick={() => {

                if (
                  maxPayable > 0 &&
                  form.amount > maxPayable
                ) {
                  setAmountError(
                    `Melebihi sisa tagihan. Maksimal: Rp ${maxPayable.toLocaleString("id-ID")}`
                  );
                  return;
                }

                onSubmit(form);

              }}
              className="
                px-5
                py-2
                text-sm
                font-semibold
                text-gold-400
                bg-navy-900
                rounded-lg
              "
            >
              {isEdit ? "Simpan Perubahan" : "Simpan Payment"}
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
