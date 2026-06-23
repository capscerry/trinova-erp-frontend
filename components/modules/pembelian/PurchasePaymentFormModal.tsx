"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseInvoice {
  purchase_invoice_id: number;
  invoice_number: string;

  supplier_id: number;
  supplier_name: string;

  total_amount: number;

  dp_paid: number;

  outstanding_amount: number;
}

export interface PurchasePaymentFormData {
  purchase_invoice_id: number;

  payment_date: string;

  amount: number;

  payment_method: string;

  notes: string;

  status: string;
}

interface PurchasePaymentModalProps {
  open: boolean;

  onClose: () => void;

  onSubmit: (
    data: PurchasePaymentFormData
  ) => void;

  purchaseInvoices: PurchaseInvoice[];
}

export default function PurchasePaymentFormModal({
  open,
  onClose,
  onSubmit,
  purchaseInvoices,
}: PurchasePaymentModalProps) {

  const [form, setForm] =
    useState<PurchasePaymentFormData>({
      purchase_invoice_id: 0,

      payment_date: "",

      amount: 0,

      payment_method: "Transfer",

      notes: "",

      status: "Paid",
    });

  useEffect(() => {

    if (open) {

      setForm({
        purchase_invoice_id: 0,

        payment_date: "",

        amount: 0,

        payment_method: "Transfer",

        notes: "",

        status: "Paid",
      });

    }

  }, [open]);

  if (!open) return null;

  const availableInvoices =
    purchaseInvoices.filter(
      (x) =>
        x.outstanding_amount > 0
    );

  const selectedInvoice =
    availableInvoices.find(
      (inv) =>
        inv.purchase_invoice_id ===
        form.purchase_invoice_id
    );

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
                Tambah Purchase Payment
              </h2>

              <p
                className="
                  text-slate-400
                  text-xs
                  mt-0.5
                "
              >
                Catat pembayaran invoice supplier
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
                value={
                  form.purchase_invoice_id
                }
                onChange={(e) => {

                  const selected =
                    availableInvoices.find(
                      (inv) =>
                        inv.purchase_invoice_id ===
                        Number(
                          e.target.value
                        )
                    );

                  setForm({
                    ...form,

                    purchase_invoice_id:
                      Number(
                        e.target.value
                      ),

                    amount:
                      selected
                        ?.outstanding_amount ?? 0,
                  });

                }}
                className={inputBase}
              >

                <option value="">
                  Pilih Invoice
                </option>

                {availableInvoices.map(
                  (inv) => (

                  <option
                    key={
                      inv.purchase_invoice_id
                    }
                    value={
                      inv.purchase_invoice_id
                    }
                  >
                    {inv.invoice_number}
                    {" | Outstanding: Rp "}
                    {Number(
                      inv.outstanding_amount
                    ).toLocaleString("id-ID")}
                  </option>

                  )
                )}

              </select>

            </FormField>

            <FormField label="Supplier">

              <input
                readOnly
                value={
                  selectedInvoice
                    ?.supplier_name ?? ""
                }
                className={cn(
                  inputBase,
                  "bg-slate-50"
                )}
              />

            </FormField>

            <FormField
              label="Invoice Amount"
            >

              <input
                readOnly
                value={`Rp ${Number(
                  selectedInvoice
                    ?.total_amount ?? 0
                ).toLocaleString(
                  "id-ID"
                )}`}
                className={cn(
                  inputBase,
                  "bg-slate-50"
                )}
              />

            </FormField>

            <FormField label="DP Paid">

              <input
                readOnly
                value={`Rp ${Number(
                  selectedInvoice
                    ?.dp_paid ?? 0
                ).toLocaleString(
                  "id-ID"
                )}`}
                className={cn(
                  inputBase,
                  "bg-slate-50"
                )}
              />

            </FormField>

            <FormField
              label="Outstanding Amount"
            >

              <input
                readOnly
                value={`Rp ${Number(
                  selectedInvoice
                    ?.outstanding_amount ??
                    0
                ).toLocaleString(
                  "id-ID"
                )}`}
                className={cn(
                  inputBase,
                  "bg-slate-50"
                )}
              />

            </FormField>

            <FormField
              label="Payment Date"
            >

              <input
                type="date"
                value={
                  form.payment_date
                }
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

            <FormField
              label="Payment Amount"
            >

              <input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,

                    amount:
                      Number(
                        e.target.value
                      ),
                  })
                }
                className={inputBase}
              />

            </FormField>

            <FormField
              label="Payment Method"
            >

              <select
                value={
                  form.payment_method
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    payment_method:
                      e.target.value,
                  })
                }
                className={inputBase}
              >

                <option value="Transfer">
                  Transfer
                </option>

                <option value="Cash">
                  Cash
                </option>

                <option value="Giro">
                  Giro
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
                  form.amount >
                  (selectedInvoice
                    ?.outstanding_amount ??
                    0)
                ) {

                  alert(
                    "Payment amount cannot exceed outstanding amount"
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
              Simpan Payment
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