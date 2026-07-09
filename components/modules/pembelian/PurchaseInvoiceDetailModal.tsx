"use client";

import { useEffect, useState } from "react";
import {
  X,
  ReceiptText,
  Building2,
  Calendar,
  BadgeCheck,
  Download,
  Wallet,
  CreditCard,
  Hash,
  ArrowDownCircle,
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { getPaymentsByInvoice } from "@/lib/services/purchase-payment.service";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  age: number;
  dp_paid: number;
  payment_paid: number;
  outstanding_amount: number;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
}

interface Payment {
  purchase_payment_id: number;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  status: string;
  notes?: string;
}

interface DownPayment {
  purchase_down_payment_id: number;
  dp_number: string;
  purchase_order_id: number;
  payment_date?: string;
  payment_type?: string;
  amount?: number;
  status?: string;
  notes?: string;
}

interface PurchaseInvoiceDetailModalProps {
  open: boolean;
  onClose: () => void;
  invoice: PurchaseInvoice | null;
  goodsReceipts?: any[];
  purchaseOrderDetails?: any[];
  products?: any[];
  downPayments?: any[];
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

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

const formatINVNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
};

const formatPAYNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^PAY-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `PAY-${digits.padStart(10, "0")}`;
};

const STATUS_STYLE: Record<string, string> = {
  Paid:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Unpaid:    "bg-amber-50 text-amber-700 border border-amber-200",
  Cancelled: "bg-rose-50 text-rose-600 border border-rose-200",
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PurchaseInvoiceDetailModal({
  open,
  onClose,
  invoice,
  goodsReceipts = [],
  purchaseOrderDetails = [],
  products = [],
  downPayments = [],
}: PurchaseInvoiceDetailModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !invoice) return;

    const fetchPayments = async () => {
      setLoading(true);
      try {
        const res = await getPaymentsByInvoice(Number(invoice.id));
        const list = Array.isArray(res) ? res : res.data ?? [];
        // Client-side guard: only keep payments that belong to this invoice
        const filtered = list.filter(
          (p: any) =>
            p.purchase_invoice_id == null ||
            Number(p.purchase_invoice_id) === Number(invoice.id)
        );
        setPayments(filtered);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [open, invoice]);

  if (!open || !invoice) return null;

  // ── Resolve the PO ID for this invoice via goods_receipt ──
  const inv = invoice as any;
  let poId: number | null = inv.purchase_order_id ? Number(inv.purchase_order_id) : null;
  if (!poId && inv.goods_receipt_id) {
    const matchedGR = goodsReceipts.find(
      (gr: any) => Number(gr.goods_receipt_id ?? gr.id) === Number(inv.goods_receipt_id)
    );
    poId = matchedGR ? Number(matchedGR.purchase_order_id ?? null) : null;
  }

  // ── Filter down payments that belong to this invoice's PO ──
  const invoiceDPs: DownPayment[] = poId
    ? downPayments.filter(
        (dp: any) => Number(dp.purchase_order_id) === poId
      )
    : [];

  const totalDPMade = invoiceDPs.reduce(
    (sum, dp) => sum + Number(dp.amount ?? 0),
    0
  );

  // Sum only the payments fetched for this invoice
  const totalPaymentsMade = payments.reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0
  );

  // Outstanding = total - down payments - purchase payments
  const computedOutstanding = Math.max(
    0,
    invoice.total_amount - totalDPMade - totalPaymentsMade
  );

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // ── Resolve line items: PO details joined with products by product_id ──
    const inv = invoice as any;

    // Strategy 1: invoice carries purchase_order_id directly
    let poId: number | null = inv.purchase_order_id ? Number(inv.purchase_order_id) : null;

    // Strategy 2: invoice → GR lookup via goods_receipt_id
    if (!poId && inv.goods_receipt_id) {
      const matchedGR = goodsReceipts.find(
        (gr: any) => Number(gr.goods_receipt_id ?? gr.id) === Number(inv.goods_receipt_id)
      );
      poId = matchedGR ? Number(matchedGR.purchase_order_id ?? null) : null;
    }

    // Strategy 3: match GR by transaction_name
    if (!poId && inv.transaction_name) {
      const matchedGR = goodsReceipts.find(
        (gr: any) => gr.transaction_name === inv.transaction_name
      );
      poId = matchedGR ? Number(matchedGR.purchase_order_id ?? null) : null;
    }

    const lineItems: { description: string; qty: number; unitPrice: number; total: number }[] =
      poId
        ? purchaseOrderDetails
            .filter((d: any) => Number(d.purchase_order_id) === poId)
            .map((d: any) => {
              const product = products.find(
                (p: any) => Number(p.product_id) === Number(d.product_id)
              );
              return {
                description: product?.product_name ?? product?.nama ?? `Product ${d.product_id}`,
                qty:         Number(d.quantity ?? 0),
                unitPrice:   Number(d.price ?? 0),
                total:       Number(d.subtotal ?? 0),
              };
            })
        : [];

    // ── Shared styles ─────────────────────────────────────────────────────
    const ALL_MED  = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
    const ALL_THIN = { top: { style: "thin"   }, bottom: { style: "thin"   }, left: { style: "thin"   }, right: { style: "thin"   } };

    // Navy background (#1E2D4F matches the app's navy-900) + white bold text
    const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
    const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } }; // light gray for value cells
    const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };

    const sTitle = {
      font:      { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill:      NAVY,
      border:    ALL_MED,
    };
    const sHdrLabel = {
      font:      { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "left", vertical: "center" },
      fill:      NAVY,
      border:    ALL_MED,
    };
    const sHdrValue = {
      font:      { sz: 10, color: { rgb: "1E3A5F" } },
      alignment: { horizontal: "left", vertical: "center" },
      fill:      LGRAY,
      border:    ALL_MED,
    };
    const sColHdr = {
      font:      { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill:      NAVY,
      border:    ALL_MED,
    };
    const sCell = {
      font:      { sz: 10, color: { rgb: "374151" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill:      WHITE,
      border:    ALL_THIN,
    };
    const sCellLeft = {
      font:      { sz: 10, color: { rgb: "374151" } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      fill:      WHITE,
      border:    ALL_THIN,
    };
    const sCellRight = {
      font:      { sz: 10, color: { rgb: "374151" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill:      WHITE,
      border:    ALL_THIN,
      numFmt:    '#,##0',
    };
    const sFootLabel = {
      font:      { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill:      NAVY,
      border:    ALL_MED,
    };
    const sFootValue = {
      font:      { bold: true, sz: 11, color: { rgb: "F5C518" } }, // gold accent
      alignment: { horizontal: "right", vertical: "center" },
      fill:      NAVY,
      border:    ALL_MED,
      numFmt:    '#,##0',
    };
    const sBlankMed  = { fill: NAVY,  border: ALL_MED  };
    const sBlankThin = { fill: WHITE, border: ALL_THIN };

    const ws: XLSX.WorkSheet = {};
    const COLS = 6;
    const C = (row: number, col: number) => XLSX.utils.encode_cell({ r: row, c: col });
    const merges: XLSX.Range[] = [];
    let r = 0;

    // Row 0: title
    ws[C(r, 0)] = { v: "PURCHASE INVOICE", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    r++;

    // Row 1: blank spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 2: DATE
    ws[C(r, 0)] = { v: "", t: "s" }; ws[C(r, 1)] = { v: "", t: "s" }; ws[C(r, 2)] = { v: "", t: "s" };
    ws[C(r, 3)] = { v: "DATE",       t: "s", s: sHdrLabel };
    ws[C(r, 4)] = { v: formatDate(invoice.invoice_date), t: "s", s: sHdrValue };
    ws[C(r, 5)] = { v: "", t: "s", s: sHdrValue };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 3: INVOICE NO.
    ws[C(r, 0)] = { v: "", t: "s" }; ws[C(r, 1)] = { v: "", t: "s" }; ws[C(r, 2)] = { v: "", t: "s" };
    ws[C(r, 3)] = { v: "INVOICE NO.", t: "s", s: sHdrLabel };
    ws[C(r, 4)] = { v: formatINVNumber(invoice.invoice_number), t: "s", s: sHdrValue };
    ws[C(r, 5)] = { v: "", t: "s", s: sHdrValue };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 4: blank
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 5: SUPPLIER / BILL TO labels
    ws[C(r, 0)] = { v: "SUPPLIER", t: "s", s: sHdrLabel };
    ws[C(r, 1)] = { v: "", t: "s", s: sHdrLabel };
    ws[C(r, 2)] = { v: "", t: "s", s: sHdrLabel };
    ws[C(r, 3)] = { v: "BILL TO",  t: "s", s: sHdrLabel };
    ws[C(r, 4)] = { v: "", t: "s", s: sHdrLabel };
    ws[C(r, 5)] = { v: "", t: "s", s: sHdrLabel };
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
    r++;

    // Row 6: supplier name / bill-to (empty)
    ws[C(r, 0)] = { v: invoice.supplier_name, t: "s", s: sHdrValue };
    ws[C(r, 1)] = { v: "", t: "s", s: sHdrValue };
    ws[C(r, 2)] = { v: "", t: "s", s: sHdrValue };
    ws[C(r, 3)] = { v: "", t: "s", s: sHdrValue };
    ws[C(r, 4)] = { v: "", t: "s", s: sHdrValue };
    ws[C(r, 5)] = { v: "", t: "s", s: sHdrValue };
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
    r++;

    // Row 7: blank
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 8: PAYMENT / INVOICE DATE / STATUS / REFERENCE column headers
    ws[C(r, 0)] = { v: "PAYMENT",      t: "s", s: sColHdr };
    ws[C(r, 1)] = { v: "INVOICE DATE", t: "s", s: sColHdr };
    ws[C(r, 2)] = { v: "STATUS",       t: "s", s: sColHdr };
    ws[C(r, 3)] = { v: "",             t: "s", s: sColHdr };
    ws[C(r, 4)] = { v: "REFERENCE",    t: "s", s: sColHdr };
    ws[C(r, 5)] = { v: "",             t: "s", s: sColHdr };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 9: payment info values
    const firstPayment = payments[0];
    const paymentNoValue = firstPayment?.payment_number
      ? formatPAYNumber(firstPayment.payment_number)
      : "—";
    ws[C(r, 0)] = { v: paymentNoValue,                    t: "s", s: sCell };
    ws[C(r, 1)] = { v: formatDate(invoice.invoice_date),  t: "s", s: sCell };
    ws[C(r, 2)] = { v: invoice.status,                    t: "s", s: sCell };
    ws[C(r, 3)] = { v: "",                                t: "s", s: sCell };
    ws[C(r, 4)] = { v: invoice.supplier_name, t: "s", s: sCell };
    ws[C(r, 5)] = { v: "",                                t: "s", s: sCell };
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    r++;

    // Row 10: blank
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Row 11: items table column headers
    ws[C(r, 0)] = { v: "NO.",         t: "s", s: sColHdr };
    ws[C(r, 1)] = { v: "DESCRIPTION", t: "s", s: sColHdr };
    ws[C(r, 2)] = { v: "",            t: "s", s: sColHdr };
    ws[C(r, 3)] = { v: "QTY",         t: "s", s: sColHdr };
    ws[C(r, 4)] = { v: "UNIT PRICE",  t: "s", s: sColHdr };
    ws[C(r, 5)] = { v: "TOTAL (Rp)",  t: "s", s: sColHdr };
    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
    r++;

    // Item rows
    const itemStartR = r;
    if (lineItems.length === 0) {
      ws[C(r, 0)] = { v: "", t: "s", s: sBlankThin }; ws[C(r, 1)] = { v: "", t: "s", s: sBlankThin };
      ws[C(r, 2)] = { v: "", t: "s", s: sBlankThin }; ws[C(r, 3)] = { v: "", t: "s", s: sBlankThin };
      ws[C(r, 4)] = { v: "", t: "s", s: sBlankThin }; ws[C(r, 5)] = { v: "", t: "s", s: sBlankThin };
      merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
      r++;
    } else {
      lineItems.forEach((item, i) => {
        ws[C(r, 0)] = { v: i + 1,           t: "n", s: sCell };
        ws[C(r, 1)] = { v: item.description, t: "s", s: sCellLeft };
        ws[C(r, 2)] = { v: "",              t: "s", s: sCellLeft };
        ws[C(r, 3)] = { v: item.qty,        t: "n", s: sCell };
        ws[C(r, 4)] = { v: item.unitPrice,  t: "n", s: sCellRight };
        ws[C(r, 5)] = { v: item.total,      t: "n", s: sCellRight };
        merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
        r++;
      });
    }

    // Pad to at least 5 item rows
    const filled = r - itemStartR;
    for (let fi = filled; fi < 5; fi++) {
      ws[C(r, 0)] = { v: "", t: "s", s: sBlankThin }; ws[C(r, 1)] = { v: "", t: "s", s: sBlankThin };
      ws[C(r, 2)] = { v: "", t: "s", s: sBlankThin }; ws[C(r, 3)] = { v: "", t: "s", s: sBlankThin };
      ws[C(r, 4)] = { v: "", t: "s", s: sBlankThin }; ws[C(r, 5)] = { v: "", t: "s", s: sBlankThin };
      merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
      r++;
    }

    // SUBTOTAL / TAX / GRAND TOTAL
    const grandTotal     = invoice.total_amount;
    const taxAmount      = Math.round(grandTotal / 1.11 * 0.11);
    const displaySubtotal = grandTotal - taxAmount;

    // SUBTOTAL
    for (let c = 0; c < 4; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankMed };
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    ws[C(r, 4)] = { v: "SUBTOTAL",    t: "s", s: sFootLabel };
    ws[C(r, 5)] = { v: displaySubtotal, t: "n", s: sFootValue };
    r++;

    // TAX
    for (let c = 0; c < 4; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankMed };
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    ws[C(r, 4)] = { v: "TAX (11%)",   t: "s", s: sFootLabel };
    ws[C(r, 5)] = { v: taxAmount,     t: "n", s: sFootValue };
    r++;

    // GRAND TOTAL
    for (let c = 0; c < 4; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankMed };
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    ws[C(r, 4)] = { v: "GRAND TOTAL", t: "s", s: sFootLabel };
    ws[C(r, 5)] = { v: grandTotal,    t: "n", s: sFootValue };
    r++;

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: COLS - 1 } });
    ws["!merges"] = merges;
    ws["!rows"]   = [
      { hpt: 36 }, // row 0: title
      { hpt: 6  }, // row 1: spacer
      { hpt: 20 }, // row 2: DATE
      { hpt: 20 }, // row 3: INVOICE NO.
      { hpt: 6  }, // row 4: blank
      { hpt: 20 }, // row 5: SUPPLIER/BILL TO labels
      { hpt: 22 }, // row 6: supplier name values
      { hpt: 6  }, // row 7: blank
      { hpt: 20 }, // row 8: payment terms headers
      { hpt: 20 }, // row 9: payment term values
      { hpt: 6  }, // row 10: blank
      { hpt: 20 }, // row 11: items column headers
    ];
    ws["!cols"]   = [{ wch: 20 }, { wch: 28 }, { wch: 10 }, { wch: 8 }, { wch: 22 }, { wch: 22 }];

    XLSX.utils.book_append_sheet(wb, ws, "Purchase Invoice");
    const safeNum = formatINVNumber(invoice.invoice_number).replace(/[^A-Za-z0-9-]/g, "_");
    XLSX.writeFile(wb, `${safeNum}.xlsx`);
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">

          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px]">
                Detail Purchase Invoice
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {formatINVNumber(invoice.invoice_number)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">

            {/* ── INVOICE INFO GRID ── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Informasi Invoice
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={<ReceiptText size={13} />} label="Invoice Number" value={formatINVNumber(invoice.invoice_number)} />
                <InfoCard icon={<Calendar size={13} />}    label="Invoice Date"   value={formatDate(invoice.invoice_date)} />
                <InfoCard icon={<Building2 size={13} />}   label="Supplier"       value={invoice.supplier_name} />
                <InfoCard icon={<Hash size={13} />}        label="Umur (Hari)"    value={String(invoice.age)} />
                {invoice.nomor_faktur_pajak && (
                  <div className="col-span-2">
                    <InfoCard
                      icon={<Hash size={13} />}
                      label="Nomor Faktur Pajak"
                      value={invoice.nomor_faktur_pajak}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── STATUS BADGE ── */}
            {(() => {
              const liveStatus =
                invoice.status === "Cancelled"
                  ? "Cancelled"
                  : computedOutstanding === 0
                  ? "Paid"
                  : "Unpaid";
              return (
                <div className="flex items-center gap-3">
                  <BadgeCheck size={15} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[liveStatus] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {liveStatus}
                  </span>
                </div>
              );
            })()}

            {/* ── PAYMENT SUMMARY CARDS ── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Ringkasan Pembayaran
              </p>
              <div className="grid grid-cols-4 gap-3">
                <SummaryCard label="Invoice Total"   value={formatRupiah(invoice.total_amount)} />
                <SummaryCard label="DP Dibayar"      value={formatRupiah(totalDPMade)} />
                <SummaryCard label="Payment Dibayar" value={formatRupiah(totalPaymentsMade)} highlight />
                <SummaryCard label="Outstanding"     value={formatRupiah(computedOutstanding)} dim={computedOutstanding === 0} />
              </div>
            </div>

            {/* ── DOWN PAYMENT HISTORY ── */}
            {invoiceDPs.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Riwayat Down Payment
                </p>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          No. DP
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          Tanggal
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          Tipe
                        </th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-400 uppercase tracking-wide">
                          Jumlah
                        </th>
                        <th className="px-4 py-2.5 text-center font-semibold text-slate-400 uppercase tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDPs.map((dp, i) => (
                        <tr
                          key={dp.purchase_down_payment_id ?? i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-navy-700">
                            {dp.dp_number ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {dp.payment_date ? formatDate(dp.payment_date) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <ArrowDownCircle size={11} className="text-slate-400" />
                              {dp.payment_type ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {formatRupiah(Number(dp.amount ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[dp.status ?? ""] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {dp.status ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-navy-900">
                        <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                          Total DP
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gold-400">
                          {formatRupiah(totalDPMade)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ── PAYMENT HISTORY ── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Riwayat Pembayaran
              </p>

              {loading ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Memuat data pembayaran...
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center">
                  <Wallet size={20} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Belum ada pembayaran tercatat</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          No. Pembayaran
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          Tanggal
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          Metode
                        </th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-400 uppercase tracking-wide">
                          Jumlah
                        </th>
                        <th className="px-4 py-2.5 text-center font-semibold text-slate-400 uppercase tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr
                          key={p.purchase_payment_id ?? i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-navy-700">
                            {p.payment_number ? formatPAYNumber(p.payment_number) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {p.payment_date ? formatDate(p.payment_date) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <CreditCard size={11} className="text-slate-400" />
                              {p.payment_method ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {formatRupiah(Number(p.amount ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[p.status] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* TOTAL ROW */}
                    <tfoot>
                      <tr className="bg-navy-900">
                        <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                          Total Dibayar
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gold-400">
                          {formatRupiah(
                            payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
                          )}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>

                  {/* NOTES — shown if any payment has notes */}
                  {payments.some(p => p.notes?.trim()) && (
                    <div className="border-t border-slate-200 px-4 py-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Catatan</p>
                      {payments
                        .filter(p => p.notes?.trim())
                        .map((p, i) => (
                          <p key={i} className="text-xs text-slate-600">
                            <span className="font-semibold text-navy-700">{formatPAYNumber(p.payment_number)}:</span>{" "}
                            {p.notes}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── TRANSACTION INFO ── */}
            {(invoice.transaction_name || invoice.transaction_detail) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Transaction Info
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {invoice.transaction_name && (
                    <InfoCard
                      icon={<ReceiptText size={13} />}
                      label="Transaction Name"
                      value={invoice.transaction_name}
                    />
                  )}
                  {invoice.transaction_detail && (
                    <div className="border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                        <ReceiptText size={13} />
                        Transaction Detail
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {invoice.transaction_detail}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Download size={14} />
              Export Excel
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  dim,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="bg-navy-900 rounded-xl p-3.5">
      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold leading-tight">
        {label}
      </p>
      <p className={`mt-1.5 text-sm font-bold ${highlight ? "text-emerald-400" : dim ? "text-slate-500" : "text-gold-400"}`}>
        {value}
      </p>
    </div>
  );
}
