"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Calendar,
  Building2,
  Package,
  ReceiptText,
  CalendarClock,
  Scissors,
  Download,
  FileText,
  Printer,
  Hash,
  Mail,
  ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { notify } from "@/lib/notify";
import {
  getPurchaseOrderPrintDetail,
  sendPurchaseOrderEmail,
  type PurchaseOrderPrintDetail,
} from "@/lib/services/purchase-order-print.service";
import { generatePurchaseOrderPdf } from "@/lib/pdf/purchaseOrderPdf";
import { SendPurchaseOrderEmailModal } from "@/components/modules/pembelian/SendPurchaseOrderEmailModal";

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------

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
  purchase_order_id?: number;

  po_number: string;

  supplier_name: string;

  order_date: string;

  expected_date?: string | null;

  status: string;

  items: PurchaseOrderItem[];

  /** Stored total from the DB - may be lower than items sum if a purchase return deduction was applied */
  total_amount?: number;

  transaction_name?: string;

  transaction_detail?: string;

  nomor_faktur_pajak?: string;
}

interface PurchaseOrderDetailModalProps {
  open: boolean;

  onClose: () => void;

  data: PurchaseOrderDetailData | null;
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------

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

// -------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------

export default function PurchaseOrderDetailModal({
  open,
  onClose,
  data,
}: PurchaseOrderDetailModalProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDetail, setEmailDetail] = useState<PurchaseOrderPrintDetail | null>(null);
  const [loadingEmailDetail, setLoadingEmailDetail] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!open || !data) {
    return null;
  }

  // Downloads the SAME official template used for "Kirim Email" and the
  // print page (PurchaseOrderPrintDocument), instead of screenshotting the
  // detail modal itself -- keeps every PO PDF visually identical regardless
  // of which button produced it.
  const exportToPdf = async () => {
    if (!data.purchase_order_id) {
      notify.error("Gagal mengekspor PDF", "ID Purchase Order tidak ditemukan.");
      return;
    }
    setPdfLoading(true);
    try {
      const detail = emailDetail ?? (await getPurchaseOrderPrintDetail(data.purchase_order_id));
      if (!emailDetail) setEmailDetail(detail);

      const { blob, fileName } = await generatePurchaseOrderPdf(detail);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      notify.success("PDF berhasil diunduh");
    } catch (error) {
      console.error("[PDF Export Error – PurchaseOrder]", error);
      notify.error(
        "Gagal mengekspor PDF",
        error instanceof Error ? error.message : "Silakan coba lagi"
      );
    } finally {
      setPdfLoading(false);
    }
  };

  // -- Open email modal (fetches full print detail if not yet loaded) ----------
  const openEmailModal = async () => {
    if (!data.purchase_order_id) {
      setBanner({ type: "error", msg: "ID Purchase Order tidak ditemukan." });
      return;
    }
    if (emailDetail) {
      setEmailModalOpen(true);
      return;
    }
    setLoadingEmailDetail(true);
    try {
      const detail = await getPurchaseOrderPrintDetail(data.purchase_order_id);
      setEmailDetail(detail);
      setEmailModalOpen(true);
    } catch (err) {
      console.error("[Email Detail Fetch Error]", err);
      setBanner({ type: "error", msg: "Gagal memuat detail PO untuk email." });
    } finally {
      setLoadingEmailDetail(false);
    }
  };

  // -- Send PO email with generated PDF attachment -----------------------------
  const handleSendEmail = async (message: string) => {
    if (!emailDetail || !data.purchase_order_id) {
      throw new Error("Data Purchase Order tidak lengkap.");
    }
    let attachment: { base64: string; fileName: string } | undefined;
    try {
      const generated = await generatePurchaseOrderPdf(emailDetail);
      attachment = { base64: generated.base64, fileName: generated.fileName };
    } catch (err) {
      console.error("[PDF Generate Error]", err);
      // Non-fatal: send email without attachment if PDF generation fails
    }
    const successMsg = await sendPurchaseOrderEmail(
      data.purchase_order_id,
      message || undefined,
      attachment
    );
    setBanner({ type: "success", msg: successMsg });
    setEmailModalOpen(false);
  };

  const itemsTotal =
    data.items.reduce(
      (acc, item) =>
        acc + item.subtotal,
      0
    );

  // Always use the sum of line items as the authoritative total.
  // The stored DB total_amount can be stale (e.g. PO header saved before all
  // items were added), so trusting it would produce a spurious "return
  // deduction" banner. A real return deduction is only meaningful when a
  // purchase-return settlement record explicitly references this PO - which
  // the Detail modal does not have access to. Showing a deduction based purely
  // on a header/items mismatch is misleading, so we drop that inference here.
  const storedTotal = itemsTotal;
  const returnDeduction = 0;

  // -- Export to Excel ----------------------------------------------------
  const exportToExcel = () => {
    const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
    const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
    const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
    const MED   = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
    const THIN  = { top: { style: "thin"   }, bottom: { style: "thin"   }, left: { style: "thin"   }, right: { style: "thin"   } };

    const sTitle    = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, fill: NAVY, border: MED };
    const sHdrLbl   = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "left",   vertical: "center" }, fill: NAVY, border: MED };
    const sHdrVal   = { font: { sz: 10, color: { rgb: "1E3A5F" } },             alignment: { horizontal: "left",   vertical: "center" }, fill: LGRAY, border: MED };
    const sColHdr   = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: NAVY, border: MED };
    const sCell     = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center" }, fill: WHITE, border: THIN };
    const sCellLeft = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "left",   vertical: "center", wrapText: true }, fill: WHITE, border: THIN };
    const sCellRight= { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right",  vertical: "center" }, fill: WHITE, border: THIN, numFmt: '#,##0' };
    const sFootLbl  = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
    const sFootVal  = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: '#,##0' };
    const sBlankN   = { fill: NAVY,  border: MED  };
    const sBlankT   = { fill: WHITE, border: THIN };

    const ws: XLSX.WorkSheet = {};
    const COLS = 6;
    const C = (row: number, col: number) => XLSX.utils.encode_cell({ r: row, c: col });
    const merges: XLSX.Range[] = [];
    let r = 0;

    // Row 0: title
    ws[C(r, 0)] = { v: "PURCHASE ORDER", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s", s: sTitle };
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    r++;

    // Row 1: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 2: DATE
    ws[C(r, 0)] = { v: "", t: "s" }; ws[C(r, 1)] = { v: "", t: "s" }; ws[C(r, 2)] = { v: "", t: "s" };
    ws[C(r, 3)] = { v: "DATE",    t: "s", s: sHdrLbl };
    ws[C(r, 4)] = { v: formatDate(data.order_date), t: "s", s: sHdrVal };
    ws[C(r, 5)] = { v: "", t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 3: PO NUMBER
    ws[C(r, 0)] = { v: "", t: "s" }; ws[C(r, 1)] = { v: "", t: "s" }; ws[C(r, 2)] = { v: "", t: "s" };
    ws[C(r, 3)] = { v: "PO NUMBER", t: "s", s: sHdrLbl };
    ws[C(r, 4)] = { v: data.po_number, t: "s", s: sHdrVal };
    ws[C(r, 5)] = { v: "", t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 4: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 5: SUPPLIER / STATUS labels
    ws[C(r, 0)] = { v: "SUPPLIER", t: "s", s: sHdrLbl };
    ws[C(r, 1)] = { v: "",         t: "s", s: sHdrLbl };
    ws[C(r, 2)] = { v: "",         t: "s", s: sHdrLbl };
    ws[C(r, 3)] = { v: "STATUS",   t: "s", s: sHdrLbl };
    ws[C(r, 4)] = { v: "",         t: "s", s: sHdrLbl };
    ws[C(r, 5)] = { v: "",         t: "s", s: sHdrLbl };
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
    r++;

    // Row 6: supplier name / status value
    ws[C(r, 0)] = { v: data.supplier_name, t: "s", s: sHdrVal };
    ws[C(r, 1)] = { v: "",                 t: "s", s: sHdrVal };
    ws[C(r, 2)] = { v: "",                 t: "s", s: sHdrVal };
    ws[C(r, 3)] = { v: data.status,        t: "s", s: sHdrVal };
    ws[C(r, 4)] = { v: "",                 t: "s", s: sHdrVal };
    ws[C(r, 5)] = { v: "",                 t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
    r++;

    // Row 7: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 8: items table headers
    ws[C(r, 0)] = { v: "NO.",          t: "s", s: sColHdr };
    ws[C(r, 1)] = { v: "DESCRIPTION",  t: "s", s: sColHdr };
    ws[C(r, 2)] = { v: "",             t: "s", s: sColHdr };
    ws[C(r, 3)] = { v: "QTY",          t: "s", s: sColHdr };
    ws[C(r, 4)] = { v: "UNIT PRICE",   t: "s", s: sColHdr };
    ws[C(r, 5)] = { v: "TOTAL (Rp)",   t: "s", s: sColHdr };
    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
    r++;

    // Item rows
    const itemStartR = r;
    data.items.forEach((item, i) => {
      ws[C(r, 0)] = { v: i + 1,            t: "n", s: sCell };
      ws[C(r, 1)] = { v: item.product_name, t: "s", s: sCellLeft };
      ws[C(r, 2)] = { v: "",                t: "s", s: sCellLeft };
      ws[C(r, 3)] = { v: item.quantity,     t: "n", s: sCell };
      ws[C(r, 4)] = { v: item.price,        t: "n", s: sCellRight };
      ws[C(r, 5)] = { v: item.subtotal,     t: "n", s: sCellRight };
      merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
      r++;
    });

    // Pad to at least 5 item rows
    for (let fi = data.items.length; fi < 5; fi++) {
      for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankT };
      merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
      r++;
    }

    // SUBTOTAL
    const taxAmount      = Math.round(storedTotal / 1.11 * 0.11);
    const displaySubtotal = storedTotal - taxAmount;

    for (let c = 0; c < 4; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankN };
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    ws[C(r, 4)] = { v: "SUBTOTAL",     t: "s", s: sFootLbl };
    ws[C(r, 5)] = { v: displaySubtotal, t: "n", s: sFootVal };
    r++;

    // TAX
    for (let c = 0; c < 4; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankN };
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    ws[C(r, 4)] = { v: "TAX (11%)", t: "s", s: sFootLbl };
    ws[C(r, 5)] = { v: taxAmount,   t: "n", s: sFootVal };
    r++;

    // GRAND TOTAL
    for (let c = 0; c < 4; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankN };
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    ws[C(r, 4)] = { v: "GRAND TOTAL", t: "s", s: sFootLbl };
    ws[C(r, 5)] = { v: storedTotal,   t: "n", s: sFootVal };
    r++;

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: COLS - 1 } });
    ws["!merges"] = merges;
    ws["!rows"]   = [
      { hpt: 36 }, // title
      { hpt: 6  }, // spacer
      { hpt: 20 }, // DATE
      { hpt: 20 }, // PO NUMBER
      { hpt: 6  }, // spacer
      { hpt: 20 }, // SUPPLIER/STATUS labels
      { hpt: 22 }, // values
      { hpt: 6  }, // spacer
      { hpt: 22 }, // col headers
    ];
    ws["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
    const safeName = data.po_number.replace(/[^A-Za-z0-9-]/g, "_");
    XLSX.writeFile(wb, `${safeName}.xlsx`);
  };

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
              bg-linear-to-r
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

          <div ref={pdfRef} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

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

              {/* NOMOR FAKTUR PAJAK */}

              {data.nomor_faktur_pajak && (
                <div className="border border-slate-200 rounded-xl p-4">

                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

                    <Hash size={14} />

                    Nomor Faktur Pajak

                  </div>

                  <div className="font-mono font-semibold text-slate-700 text-sm">
                    {data.nomor_faktur_pajak}
                  </div>

                </div>
              )}

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

            {/* RETURN DEDUCTION NOTICE */}

            {returnDeduction > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <Scissors size={15} className="text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">
                    Purchase Return Deduction Applied
                  </p>
                  <p className="text-xs text-rose-600 mt-0.5">
                    A purchase return settlement reduced this PO's total by{" "}
                    <span className="font-semibold">{formatRupiah(returnDeduction)}</span>.
                    The Grand Total below reflects the adjusted amount.
                  </p>
                </div>
              </div>
            )}

            {/* TOTAL */}

            <div className="flex justify-end">

              <div className="bg-navy-900 text-white rounded-xl px-5 py-3 min-w-[240px]">

                {returnDeduction > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-8 mb-1">
                      <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                        Items Subtotal
                      </span>
                      <span className="text-sm text-slate-300">
                        {formatRupiah(itemsTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-8 mb-2">
                      <span className="text-xs text-rose-400 uppercase tracking-widest font-semibold">
                        Return Deduction
                      </span>
                      <span className="text-sm font-semibold text-rose-400">
                        - {formatRupiah(returnDeduction)}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-2" />
                  </>
                )}

                <div className="flex items-center justify-between gap-8">

                  <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Grand Total
                  </span>

                  <span className="text-base font-bold text-gold-400">
                    {formatRupiah(
                      storedTotal
                    )}
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Download size={14} />
                Export Excel
              </button>
              <button
                onClick={exportToPdf}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FileText size={14} />
                {pdfLoading ? "Mengekspor..." : "Convert to PDF"}
              </button>
              <button
                onClick={openEmailModal}
                disabled={loadingEmailDetail}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Mail size={14} />
                {loadingEmailDetail ? "Memuat..." : "Kirim Email"}
              </button>
              {data.purchase_order_id != null && (
                <>
                  <button
                    onClick={() => window.open(`/pembelian/po/${data.purchase_order_id}/print`, "_blank")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Printer size={14} />
                    Cetak / PDF
                  </button>
                  {/* "Detail" & "View" sekarang langsung navigasi ke halaman
                      /pembelian/po/{id} -- modal ini dipertahankan untuk alur
                      lain yang masih memakainya (mis. workflow proses PO).
                  <button
                    onClick={() => window.open(`/pembelian/po/${data.purchase_order_id}`, "_blank")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-navy-700 bg-gold-50 border border-gold-200 rounded-lg hover:bg-gold-100"
                  >
                    <ExternalLink size={14} />
                    Lihat Halaman Detail Baru
                  </button>
                  */}
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>

        </div>

      </div>

      {banner && (
        <div
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
            banner.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-red-600 text-white shadow-red-600/30"
          }`}
        >
          {banner.msg}
        </div>
      )}

      {emailDetail && (
        <SendPurchaseOrderEmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          onSend={handleSendEmail}
          poNumber={emailDetail.header.po_number}
          supplierName={emailDetail.supplier?.supplier_name || data.supplier_name}
          supplierEmail={emailDetail.supplier?.email}
        />
      )}
    </>
  );
}
