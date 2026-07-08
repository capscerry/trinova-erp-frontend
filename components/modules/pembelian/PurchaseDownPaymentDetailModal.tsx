"use client";

import {
  X,
  ReceiptText,
  Building2,
  Calendar,
  Wallet,
  BadgeCheck,
  Hash,
  Clock,
  Package,
  ArrowRight,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx-js-style";

interface PurchaseDownPaymentDetailData {
  purchase_down_payment_id?: number;

  dp_number: string;

  po_number: string;

  supplier_name: string;

  supplier_id?: number;

  purchase_order_id?: number;

  payment_date: string;

  payment_type: string;

  amount: number;

  po_total: number;

  status: string;

  notes?: string;

  created_at?: string;

  transaction_name?: string;

  transaction_detail?: string;

  nomor_faktur_pajak?: string;
}

interface PurchaseDownPaymentDetailModalProps {
  open: boolean;

  onClose: () => void;

  data: PurchaseDownPaymentDetailData | null;

  /** Navigate to GR page pre-seeded with this DP's PO */
  onNavigateToGR?: (poId: number, poNumber: string) => void;
}

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(d));

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const formatDPNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^DP-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `DP-${digits.padStart(10, "0")}`;
};

export default function PurchaseDownPaymentDetailModal({
  open,
  onClose,
  data,
  onNavigateToGR,
}: PurchaseDownPaymentDetailModalProps) {
  if (!open || !data) {
    return null;
  }

  const outstanding =
    (data.po_total ?? 0) -
    (data.amount ?? 0);

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
    const sCellL   = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "left",   vertical: "center" }, fill: WHITE, border: THIN };
    const sNum     = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right",  vertical: "center" }, fill: WHITE, border: THIN, numFmt: '#,##0' };
    const sFootLbl = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
    const sFootVal = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: '#,##0' };
    const sBlankN  = { fill: NAVY,  border: MED  };
    const sBlankT  = { fill: WHITE, border: THIN };

    const ws: XLSX.WorkSheet = {};
    const COLS = 4;
    const C = (row: number, col: number) => XLSX.utils.encode_cell({ r: row, c: col });
    const merges: XLSX.Range[] = [];
    let r = 0;

    // Row 0: title
    ws[C(r, 0)] = { v: "PURCHASE DOWN PAYMENT", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s", s: sTitle };
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    r++;

    // Row 1: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 2: DATE
    ws[C(r, 0)] = { v: "",           t: "s" };
    ws[C(r, 1)] = { v: "DATE",       t: "s", s: sHdrLbl };
    ws[C(r, 2)] = { v: formatDate(data.payment_date), t: "s", s: sHdrVal };
    ws[C(r, 3)] = { v: "",           t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    r++;

    // Row 3: DP NUMBER
    ws[C(r, 0)] = { v: "",           t: "s" };
    ws[C(r, 1)] = { v: "DP NUMBER",  t: "s", s: sHdrLbl };
    ws[C(r, 2)] = { v: formatDPNumber(data.dp_number), t: "s", s: sHdrVal };
    ws[C(r, 3)] = { v: "",           t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    r++;

    // Row 4: PO NUMBER
    ws[C(r, 0)] = { v: "",           t: "s" };
    ws[C(r, 1)] = { v: "PO NUMBER",  t: "s", s: sHdrLbl };
    ws[C(r, 2)] = { v: data.po_number ?? "—", t: "s", s: sHdrVal };
    ws[C(r, 3)] = { v: "",           t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    r++;

    // Row 5: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 6: SUPPLIER / STATUS labels
    ws[C(r, 0)] = { v: "SUPPLIER", t: "s", s: sHdrLbl };
    ws[C(r, 1)] = { v: "",         t: "s", s: sHdrLbl };
    ws[C(r, 2)] = { v: "STATUS",   t: "s", s: sHdrLbl };
    ws[C(r, 3)] = { v: "",         t: "s", s: sHdrLbl };
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    r++;

    // Row 7: supplier name / status value
    ws[C(r, 0)] = { v: data.supplier_name, t: "s", s: sHdrVal };
    ws[C(r, 1)] = { v: "",                 t: "s", s: sHdrVal };
    ws[C(r, 2)] = { v: data.status,        t: "s", s: sHdrVal };
    ws[C(r, 3)] = { v: "",                 t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    r++;

    // Row 8: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 9: payment details table header
    ws[C(r, 0)] = { v: "PAYMENT TYPE", t: "s", s: sColHdr };
    ws[C(r, 1)] = { v: "NOTES",        t: "s", s: sColHdr };
    ws[C(r, 2)] = { v: "PO TOTAL (Rp)",t: "s", s: sColHdr };
    ws[C(r, 3)] = { v: "DP PAID (Rp)", t: "s", s: sColHdr };
    r++;

    // Row 10: values
    ws[C(r, 0)] = { v: data.payment_type ?? "—",       t: "s", s: sCell };
    ws[C(r, 1)] = { v: data.notes?.trim() || "—",      t: "s", s: sCellL };
    ws[C(r, 2)] = { v: Number(data.po_total ?? 0),     t: "n", s: sNum  };
    ws[C(r, 3)] = { v: Number(data.amount  ?? 0),      t: "n", s: sNum  };
    r++;

    // Row 11: spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankT };
    r++;

    // OUTSTANDING footer row
    ws[C(r, 0)] = { v: "", t: "s", s: sBlankN };
    ws[C(r, 1)] = { v: "", t: "s", s: sBlankN };
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
    ws[C(r, 2)] = { v: "OUTSTANDING (Rp)", t: "s", s: sFootLbl };
    ws[C(r, 3)] = { v: outstanding,        t: "n", s: sFootVal };
    r++;

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: COLS - 1 } });
    ws["!merges"] = merges;
    ws["!rows"]   = [
      { hpt: 36 }, // title
      { hpt: 6  }, // spacer
      { hpt: 20 }, // DATE
      { hpt: 20 }, // DP NUMBER
      { hpt: 20 }, // PO NUMBER
      { hpt: 6  }, // spacer
      { hpt: 20 }, // SUPPLIER/STATUS labels
      { hpt: 22 }, // values
      { hpt: 6  }, // spacer
      { hpt: 22 }, // col headers
      { hpt: 22 }, // values row
    ];
    ws["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Down Payment");
    const safeName = formatDPNumber(data.dp_number).replace(/[^A-Za-z0-9-]/g, "_");
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
                Detail Purchase Down Payment
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Informasi lengkap pembayaran uang muka
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

          <div className="overflow-y-auto flex-1 p-6 space-y-5">

            {/* INFO CARD */}

            <div className="grid grid-cols-2 gap-4">

              {data.purchase_down_payment_id != null && (
                <InfoCard
                  icon={<Hash size={14} />}
                  label="DP ID"
                  value={String(data.purchase_down_payment_id)}
                />
              )}

              <InfoCard
                icon={<ReceiptText size={14} />}
                label="DP Number"
                value={formatDPNumber(data.dp_number)}
              />

              <InfoCard
                icon={<ReceiptText size={14} />}
                label="PO Number"
                value={data.po_number}
              />

              {data.purchase_order_id != null && (
                <InfoCard
                  icon={<Hash size={14} />}
                  label="PO ID"
                  value={String(data.purchase_order_id)}
                />
              )}

              <InfoCard
                icon={<Building2 size={14} />}
                label="Supplier"
                value={data.supplier_name}
              />

              {data.supplier_id != null && (
                <InfoCard
                  icon={<Building2 size={14} />}
                  label="Supplier ID"
                  value={String(data.supplier_id)}
                />
              )}

              <InfoCard
                icon={<Calendar size={14} />}
                label="Payment Date"
                value={formatDate(data.payment_date)}
              />

              {data.created_at && (
                <InfoCard
                  icon={<Clock size={14} />}
                  label="Created At"
                  value={formatDate(data.created_at)}
                />
              )}

              <InfoCard
                icon={<Wallet size={14} />}
                label="Payment Type"
                value={data.payment_type}
              />

              <InfoCard
                icon={<BadgeCheck size={14} />}
                label="Status"
                value={data.status}
              />

              {data.nomor_faktur_pajak && (
                <div className="col-span-2">
                  <InfoCard
                    icon={<Hash size={14} />}
                    label="Nomor Faktur Pajak"
                    value={data.nomor_faktur_pajak}
                  />
                </div>
              )}

            </div>

            {/* NOTES */}

            <div className="border border-slate-200 rounded-xl p-4">

              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Notes
              </p>

              <p className="text-sm text-slate-700">
                {data.notes?.trim()
                  ? data.notes
                  : "-"}
              </p>

            </div>

            {/* TRANSACTION */}

            {(data.transaction_name || data.transaction_detail) && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Transaction Info
                </p>

                {data.transaction_name && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">
                      Transaction Name
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {data.transaction_name}
                    </p>
                  </div>
                )}

                {data.transaction_detail && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">
                      Transaction Detail
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {data.transaction_detail}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* PAYMENT SUMMARY */}

            <div>

              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Payment Summary
              </h3>

              <div className="grid grid-cols-3 gap-4">

                <SummaryCard
                  label="PO Total"
                  value={formatRupiah(
                    data.po_total
                  )}
                />

                <SummaryCard
                  label="DP Paid"
                  value={formatRupiah(
                    data.amount
                  )}
                />

                <SummaryCard
                  label="Outstanding"
                  value={formatRupiah(
                    outstanding
                  )}
                />

              </div>

            </div>

          </div>

          {/* FOOTER */}

          <div className="flex flex-col gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">

            {onNavigateToGR && data?.purchase_order_id != null && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Lanjutkan Ke
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToGR(data.purchase_order_id!, data.po_number ?? "");
                  }}
                  className="flex items-center gap-4 w-full p-3.5 rounded-xl border text-left transition-all bg-violet-50 hover:bg-violet-100 border-violet-200 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 shrink-0">
                    <Package size={15} className="text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Goods Receipt</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Terima barang dari supplier</p>
                  </div>
                  <ArrowRight size={13} className="text-violet-600 shrink-0" />
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
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
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

// ─────────────────────────────────────────────────────────────
// SUB COMPONENTS
// ─────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">

      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

        {icon}

        {label}

      </div>

      <div className="text-sm font-semibold text-slate-700">
        {value}
      </div>

    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-navy-900 rounded-xl p-4">

      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-gold-400">
        {value}
      </p>

    </div>
  );
}