"use client";

import { useEffect, useState } from "react";
import { X, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoodsReceipt {
  goods_receipt_id: number;
  receipt_number: string;
  supplier_id: number;
  supplier_name: string;
  total_amount: number;
}

export interface PurchaseInvoiceFormData {
  goods_receipt_id: number;
  supplier_id: number;
  total_amount: number;
}

interface PurchaseInvoiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: PurchaseInvoiceFormData
  ) => void;

  goodsReceipts: GoodsReceipt[];

  mode?: "create" | "edit";

  currentStatus?: string;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID").format(n);

export default function PurchaseInvoiceFormModal({
  open,
  onClose,
  onSubmit,
  goodsReceipts,
  mode = "create",
  currentStatus = "Unpaid",
}: PurchaseInvoiceFormModalProps) {

  const [form, setForm] =
    useState<PurchaseInvoiceFormData>({
      goods_receipt_id: 0,
      supplier_id: 0,
      total_amount: 0,
    });

    const [status, setStatus] =
        useState(currentStatus);

  useEffect(() => {

    if (open) {

      setForm({
        goods_receipt_id: 0,
        supplier_id: 0,
        total_amount: 0,
      });
      setStatus(currentStatus);

    }

  }, [open]);

  if (!open) return null;

  const selectedGR =
    goodsReceipts.find(
      (gr) =>
        gr.goods_receipt_id ===
        form.goods_receipt_id
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
                Tambah Purchase Invoice
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Buat invoice pembelian baru
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
              label="Goods Receipt"
              icon={<Package size={13} />}
            >

              <select
                value={form.goods_receipt_id}
                onChange={(e) => {

                  const selected =
                    goodsReceipts.find(
                      (gr) =>
                        gr.goods_receipt_id ===
                        Number(
                          e.target.value
                        )
                    );

                  if (!selected) return;

                  setForm({
                    goods_receipt_id:
                      selected.goods_receipt_id,

                    supplier_id:
                      selected.supplier_id,

                    total_amount:
                      selected.total_amount,
                  });

                }}
                className={inputBase}
              >

                <option value="">
                  Pilih Goods Receipt
                </option>

                {goodsReceipts.map(
                  (gr) => (

                    <option
                      key={
                        gr.goods_receipt_id
                      }
                      value={
                        gr.goods_receipt_id
                      }
                    >
                      {gr.receipt_number}
                    </option>

                  )
                )}

              </select>

            </FormField>

            <FormField label="Supplier">

              <input
                readOnly
                value={
                  selectedGR
                    ?.supplier_name ?? ""
                }
                className={cn(
                  inputBase,
                  "bg-slate-50"
                )}
              />

            </FormField>

            <FormField label="Total Amount">

              <input
                readOnly
                value={`Rp ${formatRupiah(
                  form.total_amount
                )}`}
                className={cn(
                  inputBase,
                  "bg-slate-50"
                )}
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

                onSubmit(form);

                onClose();

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
              Simpan Invoice
            </button>

          </div>

        </div>

      </div>
    </>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {

  return (

    <div className="space-y-1.5">

      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">

        {icon && (
          <span className="text-slate-400">
            {icon}
          </span>
        )}

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