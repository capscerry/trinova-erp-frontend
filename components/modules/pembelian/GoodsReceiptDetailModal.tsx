"use client";

import { X, CreditCard, ArrowRight, Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";

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

  const itemsTotal: number = data.items?.reduce(
    (sum: number, item: any) => sum + item.subtotal, 0
  ) ?? 0;

  const exportToExcel = () => {
    const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
    const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
    const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
    const MED   = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
    const THIN  = { top: { style: "thin"   }, bottom: { style: "thin"   }, left: { style: "thin"   }, right: { style: "thin"   } };

    const sTitle   = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, fill: NAVY, border: MED };
    const sHdrLbl  = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "left",   vertical: "center" }, fill: NAVY, border: MED };
    const sHdrVal  = { font: { sz: 10, color: { rgb: "1E3A5F" } },             alignment: { horizontal: "left",   vertical: "center" }, fill: LGRAY, border: MED };
    const sColHdr  = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: NAVY, border: MED };
    const sCell    = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center" }, fill: WHITE, border: THIN };
    const sCellL   = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "left",   vertical: "center", wrapText: true }, fill: WHITE, border: THIN };
    const sCellR   = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right",  vertical: "center" }, fill: WHITE, border: THIN, numFmt: '#,##0' };
    const sFootLbl = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
    const sFootVal = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: '#,##0' };
    const sBlankN  = { fill: NAVY,  border: MED  };
    const sBlankT  = { fill: WHITE, border: THIN };

    const formatDateXlsx = (d: string) =>
      new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));

    const ws: XLSX.WorkSheet = {};
    const COLS = 6;
    const C = (row: number, col: number) => XLSX.utils.encode_cell({ r: row, c: col });
    const merges: XLSX.Range[] = [];
    let r = 0;

    // Row 0: title
    ws[C(r, 0)] = { v: "GOODS RECEIPT", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s", s: sTitle };
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    r++;

    // Row 1: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 2: DATE
    ws[C(r, 0)] = { v: "", t: "s" }; ws[C(r, 1)] = { v: "", t: "s" }; ws[C(r, 2)] = { v: "", t: "s" };
    ws[C(r, 3)] = { v: "DATE",         t: "s", s: sHdrLbl };
    ws[C(r, 4)] = { v: formatDateXlsx(data.receipt_date), t: "s", s: sHdrVal };
    ws[C(r, 5)] = { v: "",             t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 3: RECEIPT NUMBER
    ws[C(r, 0)] = { v: "", t: "s" }; ws[C(r, 1)] = { v: "", t: "s" }; ws[C(r, 2)] = { v: "", t: "s" };
    ws[C(r, 3)] = { v: "RECEIPT NO.",  t: "s", s: sHdrLbl };
    ws[C(r, 4)] = { v: data.receipt_number, t: "s", s: sHdrVal };
    ws[C(r, 5)] = { v: "",             t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 4: PO NUMBER
    ws[C(r, 0)] = { v: "", t: "s" }; ws[C(r, 1)] = { v: "", t: "s" }; ws[C(r, 2)] = { v: "", t: "s" };
    ws[C(r, 3)] = { v: "PO NUMBER",    t: "s", s: sHdrLbl };
    ws[C(r, 4)] = { v: data.po_number || "-", t: "s", s: sHdrVal };
    ws[C(r, 5)] = { v: "",             t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 5: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 6: RECEIVED BY / STATUS labels
    ws[C(r, 0)] = { v: "RECEIVED BY", t: "s", s: sHdrLbl };
    ws[C(r, 1)] = { v: "",            t: "s", s: sHdrLbl };
    ws[C(r, 2)] = { v: "",            t: "s", s: sHdrLbl };
    ws[C(r, 3)] = { v: "STATUS",      t: "s", s: sHdrLbl };
    ws[C(r, 4)] = { v: "",            t: "s", s: sHdrLbl };
    ws[C(r, 5)] = { v: "",            t: "s", s: sHdrLbl };
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
    r++;

    // Row 7: values
    ws[C(r, 0)] = { v: data.received_by ?? "—", t: "s", s: sHdrVal };
    ws[C(r, 1)] = { v: "",                      t: "s", s: sHdrVal };
    ws[C(r, 2)] = { v: "",                      t: "s", s: sHdrVal };
    ws[C(r, 3)] = { v: data.status,             t: "s", s: sHdrVal };
    ws[C(r, 4)] = { v: "",                      t: "s", s: sHdrVal };
    ws[C(r, 5)] = { v: "",                      t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
    r++;

    // Row 8: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 9: items table headers
    ws[C(r, 0)] = { v: "NO.",         t: "s", s: sColHdr };
    ws[C(r, 1)] = { v: "DESCRIPTION", t: "s", s: sColHdr };
    ws[C(r, 2)] = { v: "",            t: "s", s: sColHdr };
    ws[C(r, 3)] = { v: "QTY",         t: "s", s: sColHdr };
    ws[C(r, 4)] = { v: "UNIT PRICE",  t: "s", s: sColHdr };
    ws[C(r, 5)] = { v: "TOTAL (Rp)",  t: "s", s: sColHdr };
    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
    r++;

    // Item rows
    const items: any[] = data.items ?? [];
    items.forEach((item: any, i: number) => {
      ws[C(r, 0)] = { v: i + 1,            t: "n", s: sCell  };
      ws[C(r, 1)] = { v: item.product_name, t: "s", s: sCellL };
      ws[C(r, 2)] = { v: "",                t: "s", s: sCellL };
      ws[C(r, 3)] = { v: item.quantity,     t: "n", s: sCell  };
      ws[C(r, 4)] = { v: item.price,        t: "n", s: sCellR };
      ws[C(r, 5)] = { v: item.subtotal,     t: "n", s: sCellR };
      merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
      r++;
    });

    // Pad to at least 5 rows
    for (let fi = items.length; fi < 5; fi++) {
      for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankT };
      merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
      r++;
    }

    // SUBTOTAL / TAX / GRAND TOTAL
    const taxAmount       = Math.round(itemsTotal / 1.11 * 0.11);
    const displaySubtotal = itemsTotal - taxAmount;

    [
      ["SUBTOTAL",    displaySubtotal],
      ["TAX (11%)",   taxAmount],
      ["GRAND TOTAL", itemsTotal],
    ].forEach(([label, value]) => {
      for (let c = 0; c < 4; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankN };
      merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
      ws[C(r, 4)] = { v: label,  t: "s", s: sFootLbl };
      ws[C(r, 5)] = { v: value,  t: "n", s: sFootVal };
      r++;
    });

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: COLS - 1 } });
    ws["!merges"] = merges;
    ws["!rows"]   = [
      { hpt: 36 }, { hpt: 6  }, { hpt: 20 }, { hpt: 20 },
      { hpt: 20 }, { hpt: 6  }, { hpt: 20 }, { hpt: 22 },
      { hpt: 6  }, { hpt: 22 },
    ];
    ws["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Goods Receipt");
    const safeName = data.receipt_number.replace(/[^A-Za-z0-9-]/g, "_");
    XLSX.writeFile(wb, `${safeName}.xlsx`);
  };

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

              {data.nomor_faktur_pajak && (
                <div className="col-span-2 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Nomor Faktur Pajak
                  </div>
                  <div className="font-mono font-semibold text-sm text-slate-700">
                    {data.nomor_faktur_pajak}
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
                          "Product ID",
                          "Product Name",
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
                            colSpan={5}
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

                            <td className="px-3 py-3 text-slate-500">
                              {item.product_id ?? index + 1}
                            </td>

                            <td className="px-3 py-3 text-slate-700">
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
                          <td colSpan={4} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
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

            <div className="flex justify-between items-center">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download size={14} />
                Export Excel
              </button>
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