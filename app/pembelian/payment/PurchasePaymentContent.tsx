"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notify } from "@/lib/notify";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Download, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import * as XLSX from "xlsx-js-style";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

import PurchasePaymentFormModal from "@/components/modules/pembelian/PurchasePaymentFormModal";

import {
  getPurchasePayments,
  createPurchasePayment,
  updatePurchasePayment,
  deletePurchasePayment,
} from "@/lib/services/purchase-payment.service";

import {
  getPurchaseInvoices,
  updatePurchaseInvoice,
} from "@/lib/services";

// ---------------------------------------------
// HELPERS
// ---------------------------------------------

/**
 * Normalises any payment number to PAY-0000000000 format.
 * e.g. "PAY000003", "PAY-3", "3" - "PAY-0000000003"
 */
const formatPAYNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^PAY-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `PAY-${digits.padStart(10, "0")}`;
};

/**
 * Normalises any invoice number to INV-0000000000 format.
 * e.g. "INV000003", "INV-3", "3" - "INV-0000000003"
 */
const formatINVNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
};

// ---------------------------------------------
// COLUMNS
// ---------------------------------------------

const COLUMNS: Column<any>[] = [
  {
    key: "payment_number",
    label: "Payment Number",
    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {formatPAYNumber(String(val))}
      </span>
    ),
  },
  {
    key: "invoice_number",
    label: "Invoice Number",
    render: (val) => (
      <span className="font-mono text-[12px] text-slate-600">
        {formatINVNumber(String(val))}
      </span>
    ),
  },
  {
    key: "supplier_name",
    label: "Supplier",
  },
  {
    key: "amount",
    label: "Amount",
    render: (val) => (
      <span className="font-semibold text-slate-700">
        Rp {Number(val).toLocaleString("id-ID")}
      </span>
    ),
  },
  {
    key: "payment_method",
    label: "Method",
  },
  {
    key: "status",
    label: "Status",
    render: (val) => (
      <span
        className="
          inline-flex px-2.5 py-1
          rounded-full text-xs font-semibold
          bg-emerald-50 text-emerald-700
          border border-emerald-200
        "
      >
        {String(val)}
      </span>
    ),
  },
];

// ---------------------------------------------
// PAGE
// ---------------------------------------------

function PurchasePaymentInner() {

  const router = useRouter();

  const [payments, setPayments] =
    useState<any[]>([]);

  const [purchaseInvoices, setPurchaseInvoices] =
    useState<any[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [isEdit, setIsEdit] =
    useState(false);

  const [editingPayment, setEditingPayment] =
    useState<any | null>(null);

  const [openDetail, setOpenDetail] =
    useState(false);

  const [detailData, setDetailData] =
    useState<any | null>(null);

  // Page-level error for retry banner
  const [pageError, setPageError] = useState<string | null>(null);

  const [deleteRow, setDeleteRow] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Load data ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      console.log("[Payment Page] Loading Purchase Payments...");
      const res = await getPurchasePayments();
      // Safely normalise to array: service returns { data: [] } or array
      const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      console.log(`[Payment Page] Loaded ${list.length} payment(s)`);
      setPayments(list);
    } catch (err: any) {
      console.error("[Payment Page] Purchase Payment retrieval failed:", err?.message ?? err);
      setPayments([]);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      console.log("[Payment Page] Loading Purchase Invoices...");
      const res = await getPurchaseInvoices();
      const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      console.log(`[Payment Page] Loaded ${list.length} invoice(s)`);
      setPurchaseInvoices(list);
    } catch (err: any) {
      console.error("[Payment Page] Purchase Invoice retrieval failed:", err?.message ?? err);
      setPurchaseInvoices([]);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setPageError(null);
    try {
      await Promise.all([loadData(), fetchInvoices()]);
    } catch (err: any) {
      const msg = err?.message ?? "Gagal memuat halaman Purchase Payment";
      console.error("[Payment Page] Initial load failed:", msg);
      setPageError(msg);
    }
  }, [loadData, fetchInvoices]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const availableInvoices =
    purchaseInvoices.filter(
      (inv) => Number(inv.outstanding_amount) > 0
    );

  // --- Add ------------------------------------

  const handleAdd = () => {
    setIsEdit(false);
    setEditingPayment(null);
    setOpenModal(true);
  };

  // --- Edit -----------------------------------

  const handleEdit = (row: any) => {
    setIsEdit(true);
    setEditingPayment(row);
    setOpenModal(true);
  };

  // --- Delete ---------------------------------

  const handleDelete = (row: any) => {
    setDeleteRow(row);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      setDeleting(true);
      await deletePurchasePayment(deleteRow.purchase_payment_id);
      notify.success("Purchase Payment berhasil dihapus");
      await loadData();
      await fetchInvoices();
    } catch (err) {
      console.error(err);
      notify.error("Gagal menghapus Purchase Payment");
    } finally {
      setDeleting(false);
      setDeleteRow(null);
    }
  };

  // --- Detail ---------------------------------

  const handleDetail = (row: any) => {
    router.push(`/pembelian/payment/${row.purchase_payment_id}`);
  };

  // --- Submit (Create / Edit) ------------------

  const handleSubmit = async (data: any) => {
    try {

      if (isEdit && editingPayment) {

        // -- UPDATE --
        const payload = {
          payment_date:        data.payment_date,
          amount:              data.amount,
          payment_method:      data.payment_method,
          notes:               data.notes,
          status:              data.status,
          transaction_name:    data.transaction_name ?? "",
          transaction_detail:  data.transaction_detail ?? "",
        };

        await updatePurchasePayment(
          editingPayment.purchase_payment_id,
          payload
        );

        // Re-fetch invoices so we have the latest outstanding_amount,
        // then check if this invoice is now fully paid.
        await fetchInvoices();
        const freshInvoices: any[] = await getPurchaseInvoices().then(
          (r) => Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])
        );
        const updatedInvoice = freshInvoices.find(
          (inv: any) =>
            inv.purchase_invoice_id ===
            editingPayment.purchase_invoice_id
        );
        if (
          updatedInvoice &&
          Number(updatedInvoice.outstanding_amount) <= 0 &&
          updatedInvoice.status !== "Paid"
        ) {
          await updatePurchaseInvoice(
            updatedInvoice.purchase_invoice_id,
            { status: "Paid" }
          );
        }

        setOpenModal(false);
        setEditingPayment(null);
        notify.success("Purchase Payment berhasil diperbarui");
        await loadData();
        await fetchInvoices();

      } else {

        // -- CREATE --
        const payload = {
          purchase_invoice_id: data.purchase_invoice_id,
          payment_date:        data.payment_date,
          amount:              data.amount,
          payment_method:      data.payment_method,
          notes:               data.notes,
          status:              "Paid",
          transaction_name:    data.transaction_name ?? "",
          transaction_detail:  data.transaction_detail ?? "",
        };

        // Isolate the API call so that any failure in the
        // post-create UI steps below cannot trigger the error toast.
        try {
          await createPurchasePayment(payload);
        } catch (createError) {
          console.error("[PurchasePayment] Create API failed:", createError);
          notify.error("Gagal membuat Purchase Payment");
          return;
        }

        // API succeeded — show success toast and close modal immediately.
        setOpenModal(false);
        notify.success("Purchase Payment berhasil dibuat");

        // Post-create UI updates: mark invoice as Paid and/or redirect.
        // Failures here must NOT re-trigger the error toast.
        try {
          const paidInvoice = purchaseInvoices.find(
            (inv) =>
              inv.purchase_invoice_id === data.purchase_invoice_id
          );

          if (
            paidInvoice &&
            data.amount >= Number(paidInvoice.outstanding_amount)
          ) {
            await updatePurchaseInvoice(
              paidInvoice.purchase_invoice_id,
              { status: "Paid" }
            );
            router.push("/pembelian/invoice");
            return;
          }

          await loadData();
          await fetchInvoices();
        } catch (postCreateError) {
          // The payment was already saved; only the UI refresh/redirect
          // failed. Log it but do not show the error toast.
          console.error("[PurchasePayment] Post-create UI update failed:", postCreateError);
          await loadData().catch(() => {});
          await fetchInvoices().catch(() => {});
        }
      }

    } catch (error: any) {
      console.error("[Payment Page] handleSubmit failed:", error?.message ?? error);
      notify.error(
        isEdit
          ? "Gagal memperbarui Purchase Payment"
          : "Gagal membuat Purchase Payment"
      );
    }
  };

  // --- Excel helpers --------------------------

  const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
  const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
  const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
  const MED   = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
  const THIN  = { top: { style: "thin"   }, bottom: { style: "thin"   }, left: { style: "thin"   }, right: { style: "thin"   } };

  const sTitle  = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, fill: NAVY, border: MED };
  const sSub    = { font: { sz: 10, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "center", vertical: "center" }, fill: LGRAY, border: MED };
  const sColHdr = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: NAVY, border: MED };
  const sCell   = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center" }, fill: WHITE, border: THIN };
  const sCellL  = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "left",   vertical: "center", wrapText: true }, fill: WHITE, border: THIN };
  const sNum    = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right",  vertical: "center" }, fill: WHITE, border: THIN, numFmt: '#,##0' };
  const sTotLbl = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
  const sTotVal = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: '#,##0' };
  const sHdrLbl = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "left", vertical: "center" }, fill: NAVY, border: MED };
  const sHdrVal = { font: { sz: 10, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "left", vertical: "center" }, fill: LGRAY, border: MED };
  const sBlankN = { fill: NAVY, border: MED };

  const formatDateXlsx = (d: string) =>
    d ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d)) : "-";

  const C = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

  const exportList = () => {
    const today = new Date().toISOString().slice(0, 10);
    const COLS = 6;
    const ws: XLSX.WorkSheet = {};

    ws[C(0, 0)] = { v: "PURCHASE PAYMENT LIST", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(0, c)] = { v: "", t: "s", s: sTitle };

    ws[C(1, 0)] = { v: `Export Date: ${today}`, t: "s", s: sSub };
    for (let c = 1; c < COLS; c++) ws[C(1, c)] = { v: "", t: "s", s: sSub };

    for (let c = 0; c < COLS; c++) ws[C(2, c)] = { v: "", t: "s" };

    ["NO.", "PAYMENT NUMBER", "INVOICE NUMBER", "SUPPLIER", "METHOD", "AMOUNT (Rp)"].forEach((h, c) => {
      ws[C(3, c)] = { v: h, t: "s", s: sColHdr };
    });

    let grandTotal = 0;
    payments.forEach((p: any, i: number) => {
      const r = 4 + i;
      ws[C(r, 0)] = { v: i + 1,                              t: "n", s: sCell  };
      ws[C(r, 1)] = { v: formatPAYNumber(p.payment_number),  t: "s", s: sCell  };
      ws[C(r, 2)] = { v: formatINVNumber(p.invoice_number),  t: "s", s: sCell  };
      ws[C(r, 3)] = { v: p.supplier_name ?? "-",             t: "s", s: sCellL };
      ws[C(r, 4)] = { v: p.payment_method ?? "-",            t: "s", s: sCell  };
      ws[C(r, 5)] = { v: Number(p.amount ?? 0),              t: "n", s: sNum   };
      grandTotal += Number(p.amount ?? 0);
    });

    const footerR = 4 + payments.length + 1;
    for (let c = 0; c < 4; c++) ws[C(footerR, c)] = { v: "", t: "s", s: sBlankN };
    ws[C(footerR, 4)] = { v: "TOTAL",      t: "s", s: sTotLbl };
    ws[C(footerR, 5)] = { v: grandTotal,   t: "n", s: sTotVal };

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: footerR, c: COLS - 1 } });
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    ];
    ws["!rows"]   = [{ hpt: 36 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];
    ws["!cols"]   = [{ wch: 5 }, { wch: 22 }, { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Payment");
    XLSX.writeFile(wb, `Purchase_Payment_${today}.xlsx`);
  };

  const exportDetail = (d: any) => {
    const COLS = 4;
    const ws: XLSX.WorkSheet = {};
    const merges: XLSX.Range[] = [];
    let r = 0;

    // Title
    ws[C(r, 0)] = { v: "PURCHASE PAYMENT", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s", s: sTitle };
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    r++;

    // Spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Right-side header block
    const headerFields: [string, string][] = [
      ["DATE",           formatDateXlsx(d.payment_date)],
      ["PAYMENT NUMBER", formatPAYNumber(d.payment_number)],
      ["INVOICE NUMBER", formatINVNumber(d.invoice_number)],
    ];
    headerFields.forEach(([label, value]) => {
      ws[C(r, 0)] = { v: "",    t: "s" };
      ws[C(r, 1)] = { v: label, t: "s", s: sHdrLbl };
      ws[C(r, 2)] = { v: value, t: "s", s: sHdrVal };
      ws[C(r, 3)] = { v: "",    t: "s", s: sHdrVal };
      merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
      r++;
    });

    // Spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // SUPPLIER / STATUS labels
    ws[C(r, 0)] = { v: "SUPPLIER", t: "s", s: sHdrLbl };
    ws[C(r, 1)] = { v: "",         t: "s", s: sHdrLbl };
    ws[C(r, 2)] = { v: "STATUS",   t: "s", s: sHdrLbl };
    ws[C(r, 3)] = { v: "",         t: "s", s: sHdrLbl };
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    r++;

    ws[C(r, 0)] = { v: d.supplier_name ?? "-", t: "s", s: sHdrVal };
    ws[C(r, 1)] = { v: "",                      t: "s", s: sHdrVal };
    ws[C(r, 2)] = { v: d.status ?? "-",         t: "s", s: sHdrVal };
    ws[C(r, 3)] = { v: "",                      t: "s", s: sHdrVal };
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    r++;

    // Spacer
    for (let c = 0; c < COLS; c++) ws[C(r, c)] = { v: "", t: "s" };
    r++;

    // Payment details table header
    ws[C(r, 0)] = { v: "METHOD",      t: "s", s: sColHdr };
    ws[C(r, 1)] = { v: "NOTES",       t: "s", s: sColHdr };
    ws[C(r, 2)] = { v: "",            t: "s", s: sColHdr };
    ws[C(r, 3)] = { v: "AMOUNT (Rp)", t: "s", s: sColHdr };
    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
    r++;

    ws[C(r, 0)] = { v: d.payment_method ?? "-",  t: "s", s: sCell  };
    ws[C(r, 1)] = { v: d.notes?.trim() || "-",   t: "s", s: sCellL };
    ws[C(r, 2)] = { v: "",                        t: "s", s: sCellL };
    ws[C(r, 3)] = { v: Number(d.amount ?? 0),     t: "n", s: sNum   };
    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
    r++;

    // Total footer
    for (let c = 0; c < 3; c++) ws[C(r, c)] = { v: "", t: "s", s: sBlankN };
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    ws[C(r, 3)] = { v: Number(d.amount ?? 0), t: "n", s: sTotVal };
    r++;

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: COLS - 1 } });
    ws["!merges"] = merges;
    ws["!rows"]   = [
      { hpt: 36 }, { hpt: 6 },
      { hpt: 20 }, { hpt: 20 }, { hpt: 20 },
      { hpt: 6  }, { hpt: 20 }, { hpt: 22 },
      { hpt: 6  }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 },
    ];
    ws["!cols"] = [{ wch: 18 }, { wch: 55 }, { wch: 14 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Payment");
    const safeName = formatPAYNumber(d.payment_number).replace(/[^A-Za-z0-9-]/g, "_");
    XLSX.writeFile(wb, `${safeName}.xlsx`);
  };

  // --- Render ---------------------------------

  return (
    <AppShell
      title="Purchase Payment"
      subtitle="Kelola pembayaran supplier"
    >

      <div className="flex justify-end mb-3">
        <Button variant="secondary" size="sm" onClick={exportList}>
          <Download size={14} className="mr-1.5" />
          Export Excel
        </Button>
      </div>

      {/* Page-level error banner with retry */}
      {pageError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">Gagal memuat data</p>
            <p className="text-xs text-red-600 mt-0.5">{pageError}</p>
          </div>
          <button
            onClick={loadAll}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            <RefreshCw size={12} /> Coba Lagi
          </button>
        </div>
      )}

      <DataTable<any>
        title="Daftar Purchase Payment"
        columns={COLUMNS}
        data={payments}
        keyField="purchase_payment_id"
        nameField="supplier_name"
        statusOptions={["Paid", "Unpaid", "Cancelled"]}
        addLabel="Tambah Payment"
        onAdd={handleAdd}
        renderActions={(row) => (
          <div className="flex gap-1.5 justify-center">

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDetail(row)}
            >
              Detail
            </Button>

            {(() => {
              const linkedInvoice = purchaseInvoices.find(
                (inv) => inv.purchase_invoice_id === row.purchase_invoice_id
              );
              const invoiceIsPaid = linkedInvoice?.status === "Paid";
              return !invoiceIsPaid ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(row)}
                >
                  Edit
                </Button>
              ) : null;
            })()}

            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(row)}
            >
              Hapus
            </Button>

          </div>
        )}
      />

      {/* --- Form Modal (Create / Edit) ---- */}

      <PurchasePaymentFormModal
        open={openModal}
        isEdit={isEdit}
        initialData={editingPayment ?? undefined}
        onClose={() => {
          setOpenModal(false);
          setEditingPayment(null);
        }}
        purchaseInvoices={
          isEdit ? purchaseInvoices : availableInvoices
        }
        onSubmit={handleSubmit}
      />

      {/* --- Detail Modal --------------------- */}

      {openDetail && detailData && (

        <div
          className="
            fixed inset-0
            bg-black/50 backdrop-blur-[2px]
            flex items-center justify-center
            z-50
          "
        >
          <div
            className="
              bg-white rounded-2xl
              w-full max-w-lg
              shadow-2xl border border-slate-200
              overflow-hidden
            "
          >

            {/* Header */}
            <div
              className="
                flex items-center justify-between
                px-6 py-4
                bg-linear-to-r from-navy-900 to-navy-600
              "
            >
              <div>
                <h2 className="text-white font-semibold text-[15px]">
                  Detail Purchase Payment
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Informasi lengkap pembayaran
                </p>
              </div>

              <button
                onClick={() => setOpenDetail(false)}
                className="
                  w-8 h-8 rounded-lg
                  flex items-center justify-center
                  text-slate-400
                  hover:text-white hover:bg-white/10
                  transition-colors
                "
              >
                -
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3">

              {[
                { label: "Payment Number", value: formatPAYNumber(detailData.payment_number) },
                { label: "Invoice Number", value: formatINVNumber(detailData.invoice_number) },
                { label: "Supplier",       value: detailData.supplier_name },
                {
                  label: "Amount",
                  value: `Rp ${Number(detailData.amount).toLocaleString("id-ID")}`,
                },
                { label: "Payment Date",   value: detailData.payment_date },
                { label: "Payment Method", value: detailData.payment_method },
                { label: "Status",         value: detailData.status },
                { label: "Notes",          value: detailData.notes || "-" },
                ...(detailData.transaction_name
                  ? [{ label: "Transaction Name", value: detailData.transaction_name }]
                  : []),
                ...(detailData.transaction_detail
                  ? [{ label: "Transaction Detail", value: detailData.transaction_detail }]
                  : []),
              ].map(({ label, value }) => (

                <div
                  key={label}
                  className="border border-slate-200 rounded-xl p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {value || "-"}
                  </p>
                </div>

              ))}

            </div>

            {/* Footer */}
            <div
              className="
                border-t border-slate-100
                px-6 py-4
                flex justify-between items-center
                bg-slate-50/60
              "
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportDetail(detailData)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Download size={14} />
                  Export Excel
                </button>
                {/* "Detail"/"View" sekarang langsung navigasi ke halaman
                    /pembelian/payment/{id} -- modal ini dipertahankan untuk
                    alur lain yang masih memakainya.
                {detailData?.purchase_payment_id != null && (
                  <button
                    onClick={() => window.open(`/pembelian/payment/${detailData.purchase_payment_id}`, "_blank")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-navy-700 bg-gold-50 border border-gold-200 rounded-lg hover:bg-gold-100"
                  >
                    <ExternalLink size={14} />
                    Lihat Halaman Detail Baru
                  </button>
                )}
                */}
              </div>
              <Button
                variant="ghost"
                onClick={() => setOpenDetail(false)}
              >
                Tutup
              </Button>
            </div>

          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteRow !== null}
        title="Hapus Purchase Payment?"
        message={`Yakin ingin menghapus payment ${deleteRow ? formatPAYNumber(deleteRow.payment_number) : ""}?`}
        confirmLabel="Hapus"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRow(null)}
      />
    </AppShell>
  );
}

import { Suspense } from "react";

export default function PurchasePaymentContent() {
  return (
    <Suspense fallback={null}>
      <PurchasePaymentInner />
    </Suspense>
  );
}
