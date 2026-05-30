"use client";

import { useEffect, useState } from "react";

import {
  X,
  Hash,
  Calendar,
  Package,
  User,
  ToggleLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface PurchaseOrder {
  purchase_order_id: number;
  po_number: string;
}

interface PurchaseOrderDetail {
  purchase_order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface GoodsReceiptFormData {
  purchase_order_id: string;
  receipt_number: string;
  receipt_date: string;
  received_by: string;
  status: string;
}

interface GoodsReceiptFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GoodsReceiptFormData) => void;

  purchaseOrders: PurchaseOrder[];
  purchaseOrderDetails: PurchaseOrderDetail[];
}

const todayStr = () =>
  new Date().toISOString().split("T")[0];

const generateReceiptNumber = () =>
  `GR-${new Date().getFullYear()}-${Math.floor(
    Math.random() * 9000
  ) + 1000}`;

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(n);

export default function GoodsReceiptFormModal({
  open,
  onClose,
  onSubmit,
  purchaseOrders,
  purchaseOrderDetails,
}: GoodsReceiptFormModalProps) {

  const [selectedDetails, setSelectedDetails] =
    useState<PurchaseOrderDetail[]>([]);

  const [form, setForm] =
    useState<GoodsReceiptFormData>({
      purchase_order_id: "",
      receipt_number:
        generateReceiptNumber(),
      receipt_date: todayStr(),
      received_by: "",
      status: "Received",
    });

  useEffect(() => {

    if (open) {

      setForm({
        purchase_order_id: "",
        receipt_number:
          generateReceiptNumber(),
        receipt_date: todayStr(),
        received_by: "",
        status: "Received",
      });

      setSelectedDetails([]);
    }

  }, [open]);

  const setField = <
    K extends keyof GoodsReceiptFormData
  >(
    key: K,
    value: GoodsReceiptFormData[K]
  ) => {

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectPO = (
    purchaseOrderId: string
  ) => {

    setField(
      "purchase_order_id",
      purchaseOrderId
    );

    const filtered =
      purchaseOrderDetails.filter(
        (item) =>
          Number(item.purchase_order_id) ===
          Number(purchaseOrderId)
      );

    setSelectedDetails(filtered);
  };

  if (!open) return null;

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
            max-w-3xl
            max-h-[92vh]
            flex
            flex-col
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
                Tambah Goods Receipt
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Buat penerimaan barang baru
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

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <Section title="Informasi Goods Receipt">

              <div className="grid grid-cols-2 gap-4">

                <FormField
                  label="Receipt Number"
                  icon={<Hash size={13} />}
                >

                  <input
                    readOnly
                    value={form.receipt_number}
                    className={cn(
                      inputBase,
                      "bg-slate-50 text-slate-500"
                    )}
                  />

                </FormField>

                <FormField
                  label="Tanggal"
                  icon={<Calendar size={13} />}
                >

                  <input
                    type="date"
                    value={form.receipt_date}
                    onChange={(e) =>
                      setField(
                        "receipt_date",
                        e.target.value
                      )
                    }
                    className={inputBase}
                  />

                </FormField>

              </div>

              <FormField
                label="Purchase Order"
                icon={<Package size={13} />}
              >

                <select
                  value={form.purchase_order_id}
                  onChange={(e) =>
                    handleSelectPO(
                      e.target.value
                    )
                  }
                  className={inputBase}
                >

                  <option value="">
                    Pilih Purchase Order
                  </option>

                  {purchaseOrders.map((po) => (

                    <option
                      key={po.purchase_order_id}
                      value={po.purchase_order_id}
                    >
                      {po.po_number}
                    </option>

                  ))}

                </select>

              </FormField>

              <FormField
                label="Received By"
                icon={<User size={13} />}
              >

                <input
                  type="text"
                  value={form.received_by}
                  onChange={(e) =>
                    setField(
                      "received_by",
                      e.target.value
                    )
                  }
                  placeholder="Nama penerima..."
                  className={inputBase}
                />

              </FormField>

              <FormField
                label="Status"
                icon={<ToggleLeft size={13} />}
              >

                <div className="flex gap-2">

                  {[
                    "Received",
                    "Partial",
                    "Cancelled",
                  ].map((status) => (

                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setField(
                          "status",
                          status
                        )
                      }
                      className={cn(
                        `
                          px-3
                          py-1.5
                          rounded-lg
                          text-xs
                          font-semibold
                          border
                        `,
                        form.status === status
                          ? `
                            bg-navy-900
                            text-gold-400
                            border-navy-900
                          `
                          : `
                            bg-white
                            border-slate-200
                            text-slate-400
                          `
                      )}
                    >
                      {status}
                    </button>

                  ))}

                </div>

              </FormField>

            </Section>

            {/* DETAIL */}

            <Section title="Detail Item PO">

              <div className="border border-slate-200 rounded-xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full border-collapse text-xs">

                    <thead>

                      <tr className="bg-slate-50 border-b border-slate-200">

                        {[
                          "Product ID",
                          "Qty",
                          "Price",
                          "Subtotal",
                        ].map((h) => (

                          <th
                            key={h}
                            className="
                              px-3
                              py-2.5
                              text-left
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            {h}
                          </th>

                        ))}

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {selectedDetails.length === 0 && (

                        <tr>

                          <td
                            colSpan={4}
                            className="
                              px-4
                              py-8
                              text-center
                              text-slate-400
                            "
                          >
                            Belum ada item PO dipilih
                          </td>

                        </tr>
                      )}

                      {selectedDetails.map(
                        (
                          item,
                          index
                        ) => (

                          <tr
                            key={index}
                            className="hover:bg-slate-50/50"
                          >

                            <td className="px-3 py-3">
                              {item.product_id}
                            </td>

                            <td className="px-3 py-3">
                              {item.quantity}
                            </td>

                            <td className="px-3 py-3">
                              Rp {formatRupiah(item.price)}
                            </td>

                            <td className="px-3 py-3 font-semibold">
                              Rp {formatRupiah(item.subtotal)}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </Section>

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
              Simpan Goods Receipt
            </button>

          </div>

        </div>

      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {

  return (

    <div>

      <div className="mb-3">

        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {title}
        </h3>

      </div>

      <div className="space-y-3">
        {children}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORM FIELD
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// STYLE
// ─────────────────────────────────────────────────────────────

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