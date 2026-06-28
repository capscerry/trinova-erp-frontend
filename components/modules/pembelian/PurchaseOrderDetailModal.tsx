"use client";

import {
  X,
  Calendar,
  Building2,
  Package,
  ReceiptText,
  CalendarClock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface PurchaseOrderItem {
  id: string;

  product_name: string;

  quantity: number;

  uom_name: string;

  price: number;

  tax_percent: number;

  tax_amount: number;

  subtotal: number;

  available_stock?: number;

  lead_time_days?: number;
}

interface PurchaseOrderDetailData {
  po_number: string;

  supplier_name: string;

  order_date: string;

  expected_date?: string | null;

  status: string;

  items: PurchaseOrderItem[];

  transaction_name?: string;

  transaction_detail?: string;
}

interface PurchaseOrderDetailModalProps {
  open: boolean;

  onClose: () => void;

  data: PurchaseOrderDetailData | null;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatDate = (
  d: string
) =>
  new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(d));

const formatRupiah = (
  n: number
) =>
  new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }
  ).format(n);

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PurchaseOrderDetailModal({
  open,
  onClose,
  data,
}: PurchaseOrderDetailModalProps) {

  if (!open || !data) {
    return null;
  }

  const grandTotal =
    data.items.reduce(
      (acc, item) =>
        acc + item.subtotal,
      0
    );

  return (
    <>
      {/* BACKDROP */}

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

      {/* MODAL */}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div
          className="
            bg-white
            rounded-2xl
            shadow-2xl
            w-full
            max-w-4xl
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
                Detail Purchase Order
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Informasi lengkap purchase order
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
                transition-colors
              "
            >
              <X size={16} />
            </button>

          </div>

          {/* BODY */}

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* INFO */}

            <div className="grid grid-cols-2 gap-4">

              {/* PO NUMBER */}

              <div className="border border-slate-200 rounded-xl p-4">

                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

                  <ReceiptText size={14} />

                  PO Number

                </div>

                <div className="font-mono font-bold text-navy-900 text-sm">
                  {data.po_number}
                </div>

              </div>

              {/* SUPPLIER */}

              <div className="border border-slate-200 rounded-xl p-4">

                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

                  <Building2 size={14} />

                  Supplier

                </div>

                <div className="font-semibold text-slate-700 text-sm">
                  {data.supplier_name}
                </div>

              </div>

              {/* DATE */}

              <div className="border border-slate-200 rounded-xl p-4">

                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

                  <Calendar size={14} />

                  Order Date

                </div>

                <div className="text-slate-700 text-sm">
                  {formatDate(data.order_date)}
                </div>

              </div>

              {/* EXPECTED DATE */}

              <div className={`rounded-xl p-4 border ${
                data.expected_date
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200"
              }`}>

                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

                  <CalendarClock size={14} />

                  Tanggal Ekspektasi

                </div>

                <div className={`text-sm font-semibold ${
                  data.expected_date ? "text-amber-800" : "text-slate-400 font-normal italic"
                }`}>
                  {data.expected_date
                    ? formatDate(data.expected_date)
                    : "Tidak diset"}
                </div>

              </div>

              {/* STATUS */}

              <div className="border border-slate-200 rounded-xl p-4">

                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

                  <Package size={14} />

                  Status

                </div>

                <span
                  className="
                    inline-flex
                    px-3
                    py-1
                    rounded-full
                    text-xs
                    font-semibold
                    bg-emerald-50
                    text-emerald-700
                    border
                    border-emerald-200
                  "
                >
                  {data.status}
                </span>

              </div>

            </div>

            {(data.transaction_name || data.transaction_detail) && (
              <div className="grid grid-cols-1 gap-4">

                {data.transaction_name && (
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
                      <ReceiptText size={14} />
                      Transaction Name
                    </div>
                    <div className="font-semibold text-slate-700 text-sm">
                      {data.transaction_name}
                    </div>
                  </div>
                )}

                {data.transaction_detail && (
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
                      <ReceiptText size={14} />
                      Transaction Detail
                    </div>
                    <div className="text-slate-700 text-sm whitespace-pre-wrap">
                      {data.transaction_detail}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ITEM TABLE */}

            <div>

              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Detail Item
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full border-collapse text-xs">

                    <thead>

                      <tr className="bg-slate-50 border-b border-slate-200">

                        {[
                          "Product",
                          "Stock",
                          "Lead Time",
                          "Qty",
                          "UOM",
                          "Price",
                          "Tax %",
                          "Tax Amount",
                          "Subtotal",
                        ].map((header) => (

                          <th
                            key={header}
                            className="
                              px-4
                              py-3
                              text-left
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            {header}
                          </th>

                        ))}

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {data.items.map((item, idx) => (

                        <tr
                          key={item.id ? `${item.id}-${idx}` : idx}
                          className="hover:bg-slate-50/50"
                        >

                          <td className="px-4 py-3 font-medium text-slate-700">
                            {item.product_name}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {item.available_stock ?? "-"}
                          </td>

                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {item.lead_time_days != null
                              ? `${item.lead_time_days} Hari`
                              : "-"}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {item.uom_name || "-"}
                          </td>

                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {formatRupiah(item.price)}
                          </td>

                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {item.tax_percent > 0
                              ? `${item.tax_percent}%`
                              : "0%"}
                          </td>

                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                            {item.tax_percent > 0
                              ? `+${formatRupiah(item.tax_amount)}`
                              : "-"}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            {formatRupiah(item.subtotal)}
                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

            {/* TOTAL */}

            <div className="flex justify-end">

              <div className="bg-navy-900 text-white rounded-xl px-5 py-3 min-w-[240px]">

                <div className="flex items-center justify-between gap-8">

                  <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Grand Total
                  </span>

                  <span className="text-base font-bold text-gold-400">
                    {formatRupiah(
                      grandTotal
                    )}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}