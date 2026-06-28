"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseOrder {
  purchase_order_id: number;
  po_number: string;
  supplier_id: number;
  total_amount: number;
  transaction_name?: string;
  transaction_detail?: string;

  supplier?: {
    supplier_id: number;
    supplier_name: string;
  };
}

export interface PurchaseDownPaymentFormData {
  purchase_order_id: number;
  supplier_id: number;
  payment_date: string;
  amount: number;
  payment_type: string;
  notes: string;
  status: string;
  transaction_name: string;
  transaction_detail: string;
}

interface PurchaseDownPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: PurchaseDownPaymentFormData
  ) => void;

  purchaseOrders: PurchaseOrder[];
}

export default function PurchaseDownPaymentModal({
  open,
  onClose,
  onSubmit,
  purchaseOrders,
}: PurchaseDownPaymentModalProps) {

  const [form, setForm] =
    useState<PurchaseDownPaymentFormData>({
      purchase_order_id: 0,
      supplier_id: 0,
      payment_date: "",
      amount: 0,
      payment_type: "Partial",
      notes: "",
      status: "Paid",
      transaction_name: "",
      transaction_detail: "",
    });

  useEffect(() => {

    if (open) {

      setForm({
        purchase_order_id: 0,
        supplier_id: 0,
        payment_date: "",
        amount: 0,
        payment_type: "Partial",
        notes: "",
        status: "Paid",
        transaction_name: "",
        transaction_detail: "",
      });

    }

  }, [open]);

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
                Tambah Purchase Down Payment
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Catat pembayaran uang muka supplier
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

            <FormField label="Purchase Order">

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

                  setForm({
                    ...form,
                    purchase_order_id:
                      selected.purchase_order_id,
                    supplier_id:
                      selected.supplier_id,
                    transaction_name:
                      selected.transaction_name ?? "",
                    transaction_detail:
                      selected.transaction_detail ?? "",
                  });

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

            <FormField label="Payment Date">

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

            <FormField label="Amount">

              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: Math.round(parseFloat(e.target.value || "0") * 100) / 100,
                  })
                }
                className={inputBase}
              />

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
              Simpan DP
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