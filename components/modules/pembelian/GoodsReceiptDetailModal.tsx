"use client";

import { X, CreditCard, ArrowRight } from "lucide-react";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(n);

interface GoodsReceiptDetailModalProps {
  open: boolean;
  onClose: () => void;
  data: any;
  /** Navigate to Purchase Payment page */
  onNavigateToPayment?: () => void;
}

export default function GoodsReceiptDetailModal({
  open,
  onClose,
  data,
  onNavigateToPayment,
}: GoodsReceiptDetailModalProps) {

  if (!open || !data) return null;

  return (
    <>
      {/* BACKDROP */}

      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* MODAL */}

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
                Detail Goods Receipt
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Informasi detail penerimaan barang
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

            {/* INFO */}

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-1">

                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Receipt Number
                </div>

                <div className="text-sm font-semibold text-slate-700">
                  {data.receipt_number}
                </div>

              </div>

              <div className="space-y-1">

                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Receipt Date
                </div>

                <div className="text-sm text-slate-700">
                  {data.receipt_date}
                </div>

              </div>

              <div className="space-y-1">

                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Purchase Order
                </div>

                <div className="text-sm font-semibold text-slate-700">
                  {data.po_number || "-"}
                </div>

              </div>

              <div className="space-y-1">

                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Received By
                </div>

                <div className="text-sm text-slate-700">
                  {data.received_by}
                </div>

              </div>

              <div className="space-y-1">

                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Status
                </div>

                <div className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {data.status}
                </div>

              </div>

              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Transaction Name
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {data.transaction_name || "-"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Total PO Amount
                </div>
                <div className="text-sm font-bold text-navy-700">
                  {data.total_amount != null
                    ? `Rp ${formatRupiah(data.total_amount)}`
                    : "-"}
                </div>
              </div>

              {data.transaction_detail && (
                <div className="col-span-2 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Transaction Detail
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {data.transaction_detail}
                  </div>
                </div>
              )}

            </div>

            {/* ITEM TABLE */}

            <div>

              <div className="mb-3">

                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Detail Item
                </h3>

              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full border-collapse text-xs">

                    <thead>

                      <tr className="bg-slate-50 border-b border-slate-200">

                        {[
                          "Product",
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

                      {data.items?.length === 0 && (

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
                            Tidak ada item
                          </td>

                        </tr>
                      )}

                      {data.items?.map(
                        (
                          item: any,
                          index: number
                        ) => (

                          <tr
                            key={index}
                            className="hover:bg-slate-50/50"
                          >

                            <td className="px-3 py-3">
                              {item.product_name}
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

                    {data.items?.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td colSpan={3} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                            Total
                          </td>
                          <td className="px-3 py-2.5 text-sm font-bold text-navy-700">
                            Rp {formatRupiah(
                              data.items.reduce(
                                (sum: number, item: any) => sum + item.subtotal,
                                0
                              )
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}

                  </table>

                </div>

              </div>

            </div>

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

            {onNavigateToPayment && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Lanjutkan Ke
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToPayment();
                  }}
                  className="flex items-center gap-4 w-full p-3.5 rounded-xl border text-left transition-all bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 shrink-0">
                    <CreditCard size={15} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Purchase Payment</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Catat pembayaran ke supplier</p>
                  </div>
                  <ArrowRight size={13} className="text-emerald-600 shrink-0" />
                </button>
              </>
            )}

            <div className="flex justify-start">
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
                  hover:bg-slate-100
                  transition-colors
                "
              >
                Tutup
              </button>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}