"use client";

import PurchaseInvoiceFormModal from "@/components/modules/pembelian/PurchaseInvoiceFormModal";
import PurchaseInvoiceDetailModal from "@/components/modules/pembelian/PurchaseInvoiceDetailModal";
import { AppShell } from "@/components/layout";
import {
  DataTable,
  type Column,
} from "@/components/ui/DataTable";

import { Button } from "@/components/ui/Button";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import { CheckCircle2, Download, FileText, X } from "lucide-react";
import * as XLSX from "xlsx-js-style";

import {
  getPurchaseInvoices,
  getGoodsReceipts,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  getPurchaseOrderDetails,
  getProducts,
} from "@/lib/services";

import { getPurchaseDownPayments } from "@/lib/services/purchase-down-payment.service";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type InvoiceStatus =
  | "Unpaid"
  | "Paid"
  | "Cancelled";

interface PurchaseInvoice {
  id: string;
  goods_receipt_id: number;
  invoice_number: string;
  invoice_date: string;
  supplier_id: number;
  supplier_name: string;
  total_amount: number;
  status: InvoiceStatus;
  age: number;
  dp_paid: number;
  payment_paid: number;
  outstanding_amount: number;
  transaction_name?: string;
  transaction_detail?: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

const formatNumber = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(n);

/**
 * Normalises any invoice number to INV-0000000000 format.
 * e.g. "INV000003", "INV-3", "3" → "INV-0000000003"
 */
const formatINVNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
};

// ─────────────────────────────────────────────────────────────
// STATUS
// ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<
  InvoiceStatus,
  string
> = {
  Unpaid:
    "bg-amber-50 text-amber-700 border border-amber-200",

  Paid:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  Cancelled:
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function InvoiceStatusBadge({
  status,
}: {
  status: InvoiceStatus;
}) {
  return (
    <span
      className={`
        inline-flex
        px-2.5
        py-1
        rounded-full
        text-xs
        font-semibold
        whitespace-nowrap
        ${STATUS_STYLE[status]}
      `}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// TABLE COLUMN
// ─────────────────────────────────────────────────────────────

const COLUMNS: Column<PurchaseInvoice>[] = [
  {
    key: "invoice_number",
    label: "Invoice Number",

    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {formatINVNumber(String(val))}
      </span>
    ),
  },

  {
    key: "invoice_date",
    label: "Date",

    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap">
        {formatDate(String(val))}
      </span>
    ),
  },

  {
    key: "supplier_name",
    label: "Supplier",

    render: (val) => (
      <span className="font-medium text-slate-700">
        Supplier {String(val)}
      </span>
    ),
  },

  {
    key: "status",
    label: "Status",

    render: (val) => (
      <InvoiceStatusBadge
        status={val as InvoiceStatus}
      />
    ),
  },

  {
    key: "dp_paid",
    label: "DP Amount",

    render: (val) => (
      <span className="font-semibold text-blue-700">
        Rp {formatNumber(Number(val))}
      </span>
    ),
  },

  {
    key: "payment_paid",
    label: "Payment Amount",

    render: (val) => (
      <span className="font-semibold text-emerald-700">
        Rp {formatNumber(Number(val))}
      </span>
    ),
  },

  {
    key: "total_amount",
    label: "Total",

    render: (val) => (
      <span className="font-semibold text-slate-700">
        Rp {formatNumber(Number(val))}
      </span>
    ),
  },

  {
  key: "outstanding_amount",
  label: "Outstanding",

  render: (val) => (
    <span className="font-semibold text-amber-700">
      Rp {formatNumber(Number(val))}
    </span>
  ),
},
];

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function PurchaseInvoicePage() {

  const searchParams = useSearchParams();

  const [invoices, setInvoices] =
    useState<PurchaseInvoice[]>([]);

  const [goodsReceipts, setGoodsReceipts] =
    useState<any[]>([]);

  const [purchaseOrderDetails, setPurchaseOrderDetails] =
    useState<any[]>([]);

  const [products, setProducts] =
    useState<any[]>([]);

  const [downPayments, setDownPayments] =
    useState<any[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [openDetailModal, setOpenDetailModal] =
    useState(false);

  const [selectedInvoice, setSelectedInvoice] =
    useState<any>(null);
  
  const [openStatusModal, setOpenStatusModal] =
    useState(false);

  const [selectedStatus, setSelectedStatus] =
    useState("");

  const [openSuccessModal, setOpenSuccessModal] =
    useState(false);

  const [createdInvoiceNumber, setCreatedInvoiceNumber] =
    useState("");

  const tableRef = useRef<HTMLDivElement>(null);

  const fetchInvoices = async () => {

    try {

      const invoiceRes = await getPurchaseInvoices();

      const list = Array.isArray(invoiceRes)
        ? invoiceRes
        : invoiceRes.data;

      const mapped = list.map(
        (item: any) => {

          // Use server-computed outstanding_amount and dp_paid directly —
          // the backend SQL already subtracts both down-payments and
          // purchase-payments from total_amount correctly.
          const outstanding = Math.max(0, Number(item.outstanding_amount ?? 0));

          return {

            id:
              item.purchase_invoice_id.toString(),

            goods_receipt_id:
              item.goods_receipt_id,

            invoice_number:
              item.invoice_number,

            invoice_date:
              item.invoice_date,

            supplier_id:
              item.supplier_id,

            supplier_name:
              item.supplier_name,

            total_amount:
              item.total_amount,

            dp_paid:
              Number(item.dp_paid ?? 0),

            payment_paid:
              Number(item.payment_paid ?? 0),

            outstanding_amount:
              outstanding,

            status: (item.status === "Cancelled"
              ? "Cancelled"
              : outstanding === 0
                ? "Paid"
                : "Unpaid") as InvoiceStatus,

            age:
              Math.floor(
                (Date.now() -
                  new Date(
                    item.invoice_date
                  ).getTime()) /
                  (1000 * 60 * 60 * 24)
              ),

            transaction_name:
              item.transaction_name ?? "",

            transaction_detail:
              item.transaction_detail ?? "",
          };
        }
      );

      setInvoices(mapped);

    } catch (error) {

      console.error(error);
    }
  };

  const fetchGoodsReceipt = async () => {
    try {
      const res = await getGoodsReceipts();
      const list = Array.isArray(res) ? res : res.data;
      setGoodsReceipts(list);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPurchaseOrderDetails = async () => {
    try {
      const res = await getPurchaseOrderDetails();
      const list = Array.isArray(res) ? res : res.data ?? [];
      setPurchaseOrderDetails(list);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      const list = Array.isArray(res) ? res : res.data ?? [];
      setProducts(list);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDownPayments = async () => {
    try {
      const res = await getPurchaseDownPayments();
      const list = Array.isArray(res) ? res : res.data ?? [];
      setDownPayments(list);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchGoodsReceipt();
    fetchPurchaseOrderDetails();
    fetchProducts();
    fetchDownPayments();
  }, []);

  // Auto-open create modal when navigated from PO page with ?po_id=
  // The GR list is pre-filtered to only GRs from that PO.
  useEffect(() => {
    const poId = searchParams.get("po_id");
    if (!poId || goodsReceipts.length === 0) return;
    const numericPoId = Number(poId);
    const hasGRForPO = goodsReceipts.some(
      (gr: any) =>
        Number(gr.purchase_order_id ?? gr.purchase_order?.purchase_order_id) === numericPoId
    );
    if (!hasGRForPO) return;
    setOpenModal(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goodsReceipts]);

  const exportToExcel = () => {
    const today = new Date().toISOString().slice(0, 10);

    // ── Shared style helpers ──────────────────────────────────────────────
    const borderFull = {
      top:    { style: "medium" },
      bottom: { style: "medium" },
      left:   { style: "medium" },
      right:  { style: "medium" },
    };
    const borderThin = {
      top:    { style: "thin" },
      bottom: { style: "thin" },
      left:   { style: "thin" },
      right:  { style: "thin" },
    };

    const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
    const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
    const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };

    const styleHeader = {
      font:      { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill:      NAVY,
      border:    borderFull,
    };
    const styleCell = {
      font:      { sz: 10, color: { rgb: "374151" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill:      WHITE,
      border:    borderThin,
    };
    const styleCellLeft = {
      font:      { sz: 10, color: { rgb: "374151" } },
      alignment: { horizontal: "left", vertical: "center" },
      fill:      WHITE,
      border:    borderThin,
    };
    const styleNumber = {
      font:      { sz: 10, color: { rgb: "374151" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill:      WHITE,
      border:    borderThin,
      numFmt:    '#,##0',
    };
    const styleTotalLabel = {
      font:      { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill:      NAVY,
      border:    borderFull,
    };
    const styleTotalValue = {
      font:      { bold: true, sz: 11, color: { rgb: "F5C518" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill:      NAVY,
      border:    borderFull,
      numFmt:    '#,##0',
    };
    const styleTitleRow = {
      font:      { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill:      NAVY,
      border:    borderFull,
    };
    const styleSubtitle = {
      font:      { sz: 10, color: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill:      LGRAY,
      border:    borderFull,
    };

    // ── Build worksheet using cell-by-cell approach ───────────────────────
    const ws: XLSX.WorkSheet = {};

    const COLS = 9; // A–I

    // Helper: encode cell address
    const C = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

    // Row 0: Title
    ws[C(0, 0)] = { v: "PURCHASE INVOICE LIST", t: "s", s: styleTitleRow };
    for (let c = 1; c < COLS; c++) ws[C(0, c)] = { v: "", t: "s", s: styleTitleRow };

    // Row 1: Export date
    ws[C(1, 0)] = { v: `Export Date: ${today}`, t: "s", s: styleSubtitle };
    for (let c = 1; c < COLS; c++) ws[C(1, c)] = { v: "", t: "s", s: styleSubtitle };

    // Row 2: blank
    for (let c = 0; c < COLS; c++) ws[C(2, c)] = { v: "", t: "s" };

    // Row 3: column headers
    const headers = ["NO.", "INVOICE NUMBER", "DATE", "SUPPLIER", "STATUS", "AGE (DAY)", "TOTAL (Rp)", "PAID (Rp)", "OUTSTANDING (Rp)"];
    headers.forEach((h, c) => {
      ws[C(3, c)] = { v: h, t: "s", s: styleHeader };
    });

    // Data rows starting at row 4
    let grandTotal = 0;
    let grandPaid  = 0;
    let grandOut   = 0;

    invoices.forEach((inv, i) => {
      const r = 4 + i;
      ws[C(r, 0)] = { v: i + 1,                              t: "n", s: styleCell };
      ws[C(r, 1)] = { v: formatINVNumber(inv.invoice_number), t: "s", s: styleCell };
      ws[C(r, 2)] = { v: formatDate(inv.invoice_date),        t: "s", s: styleCell };
      ws[C(r, 3)] = { v: inv.supplier_name,                  t: "s", s: styleCellLeft };
      ws[C(r, 4)] = { v: inv.status,                          t: "s", s: styleCell };
      ws[C(r, 5)] = { v: inv.age,                             t: "n", s: styleCell };
      ws[C(r, 6)] = { v: inv.total_amount,                   t: "n", s: styleNumber };
      ws[C(r, 7)] = { v: inv.dp_paid,                        t: "n", s: styleNumber };
      ws[C(r, 8)] = { v: inv.outstanding_amount,             t: "n", s: styleNumber };
      grandTotal += inv.total_amount;
      grandPaid  += inv.dp_paid;
      grandOut   += inv.outstanding_amount;
    });

    // Total footer row
    const footerR = 4 + invoices.length + 1;
    for (let c = 0; c < 5; c++) ws[C(footerR, c)] = { v: "", t: "s", s: { fill: NAVY, border: borderFull } };
    ws[C(footerR, 5)] = { v: "TOTAL",    t: "s", s: styleTotalLabel };
    ws[C(footerR, 6)] = { v: grandTotal, t: "n", s: styleTotalValue };
    ws[C(footerR, 7)] = { v: grandPaid,  t: "n", s: styleTotalValue };
    ws[C(footerR, 8)] = { v: grandOut,   t: "n", s: styleTotalValue };

    // Set sheet ref range
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: footerR, c: COLS - 1 } });

    // Merges: title rows span all columns
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    ];

    // Row heights: title tall, subtitle, spacer, column headers, data rows default
    ws["!rows"] = [{ hpt: 36 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];

    // Column widths
    ws["!cols"] = [
      { wch: 5  },
      { wch: 22 },
      { wch: 14 },
      { wch: 28 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Invoice");
    XLSX.writeFile(wb, `Purchase_Invoice_${today}.xlsx`);
  };

  return (
    <AppShell
      title="Purchase Invoice"
      subtitle="Kelola invoice pembelian"
    >

        <div className="flex justify-end mb-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportToExcel}
          >
            <Download size={14} className="mr-1.5" />
            Export Excel
          </Button>
        </div>

        <div ref={tableRef}>
        <DataTable<PurchaseInvoice>
          title="Daftar Purchase Invoice"
          columns={COLUMNS}
          data={invoices}
          keyField="id"
          dateField="invoice_date"
          nameField="supplier_name"
          statusOptions={["Unpaid", "Paid", "Cancelled"]}
          addLabel="Tambah Invoice"
          onAdd={() => {
            setOpenModal(true);
          }}

          renderActions={(row) => (

    <div className="flex gap-1.5 justify-center">
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {

        setSelectedInvoice(row);

        setOpenDetailModal(true);

      }}
    >
      Detail
    </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {

          setSelectedInvoice(row);

          setSelectedStatus(
            row.status
          );

          setOpenStatusModal(true);

        }}
      >
        Edit
      </Button>

      <Button
        variant="danger"
        size="sm"
        onClick={async () => {

          const ok =
            confirm(
              `Hapus invoice ${formatINVNumber(row.invoice_number)}?`
            );

          if (!ok) return;

          await deletePurchaseInvoice(
            Number(row.id)
          );

          await fetchInvoices();
        }}
      >
        Hapus
      </Button>

    </div>

      )}
    />
        </div>

<PurchaseInvoiceDetailModal
  open={openDetailModal}
  onClose={() => {
    setOpenDetailModal(false);
    setSelectedInvoice(null);
  }}
  invoice={selectedInvoice}
  goodsReceipts={goodsReceipts}
  purchaseOrderDetails={purchaseOrderDetails}
  products={products}
  downPayments={downPayments}
/>

<PurchaseInvoiceFormModal
  open={openModal}
  onClose={() =>
    setOpenModal(false)
  }
  goodsReceipts={(() => {
    // When navigated from PO page, pre-filter to GRs for that PO
    const poIdParam = searchParams.get("po_id");
    const available = goodsReceipts.filter(
      (gr) => !invoices.some(
        (inv: any) => Number(inv.goods_receipt_id) === Number(gr.goods_receipt_id)
      )
    );
    if (!poIdParam) return available;
    const numericPoId = Number(poIdParam);
    const filtered = available.filter(
      (gr: any) =>
        Number(gr.purchase_order_id ?? gr.purchase_order?.purchase_order_id) === numericPoId
    );
    // Fall back to all available GRs if no GR matched the PO filter
    return filtered.length > 0 ? filtered : available;
  })()}
  onSubmit={async (data) => {

    try {

      const created = await createPurchaseInvoice({
        goods_receipt_id:
          data.goods_receipt_id,

        supplier_id:
          data.supplier_id,

        total_amount:
          data.total_amount,

        transaction_name:
          data.transaction_name ?? "",

        transaction_detail:
          data.transaction_detail ?? "",
      });

      // Refresh list BEFORE opening modal so the new row is already visible
      await fetchInvoices();

      setCreatedInvoiceNumber(
        created?.invoice_number ??
        created?.data?.invoice_number ??
        ""
      );

      setOpenSuccessModal(true);

    } catch (error) {

      console.error(error);

      alert(
        "Gagal membuat Purchase Invoice"
      );
    }
  }}
/>

{openStatusModal &&
 selectedInvoice && (

  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/50
    "
  >

    <div
      className="
        bg-white
        rounded-2xl
        w-full
        max-w-md
        overflow-hidden
      "
    >

      <div
        className="
          px-6
          py-4
          bg-gradient-to-r
          from-navy-900
          to-navy-600
        "
      >

        <h2 className="text-white font-semibold">
          Update Status Invoice
        </h2>

      </div>

      <div className="p-6 space-y-4">

        <div>

          <p className="text-xs font-semibold text-slate-400 uppercase">
            Invoice Number
          </p>

          <p className="mt-1 font-medium">
            {formatINVNumber(selectedInvoice.invoice_number)}
          </p>

        </div>

        <div>

          <p className="text-xs font-semibold text-slate-400 uppercase">
            Status
          </p>

          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(
                e.target.value
              )
            }
            className="
              w-full
              mt-2
              px-3
              py-2
              border
              border-slate-200
              rounded-lg
            "
          >

            <option value="Unpaid">
              Unpaid
            </option>

            <option value="Paid">
              Paid
            </option>

            <option value="Cancelled">
              Cancelled
            </option>

          </select>

        </div>

      </div>

      <div
        className="
          p-4
          border-t
          flex
          justify-end
          gap-2
        "
      >

        <button
          onClick={() =>
            setOpenStatusModal(false)
          }
          className="
            px-4
            py-2
            border
            rounded-lg
          "
        >
          Batal
        </button>

        <button
          onClick={async () => {

            await updatePurchaseInvoice(
              Number(
                selectedInvoice.id
              ),
              {
                status:
                  selectedStatus,
              }
            );

            await fetchInvoices();

            setOpenStatusModal(
              false
            );
          }}
          className="
            px-4
            py-2
            bg-navy-900
            text-gold-400
            rounded-lg
          "
        >
          Simpan
        </button>

      </div>

    </div>

  </div>

)}

{/* ── SUCCESS MODAL ─────────────────────────────────────────── */}

{openSuccessModal && (

  <>
    {/* Backdrop */}
    <div
      className="
        fixed inset-0 z-50
        bg-black/50 backdrop-blur-[2px]
      "
    />

    {/* Modal */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div
        className="
          bg-white rounded-2xl shadow-2xl
          w-full max-w-md
          border border-slate-200
          overflow-hidden
        "
      >

        {/* Header */}
        <div
          className="
            flex items-center justify-between
            px-6 py-4
            bg-gradient-to-r from-navy-900 to-navy-600
          "
        >
          <div>
            <h2 className="text-white font-semibold text-[15px]">
              Invoice Berhasil Dibuat
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Purchase Invoice baru telah tersimpan
            </p>
          </div>

          <button
            onClick={() => setOpenSuccessModal(false)}
            className="
              w-8 h-8 rounded-lg flex items-center justify-center
              text-slate-400 hover:text-white hover:bg-white/10
            "
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-4">

          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-emerald-500" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-slate-800 font-semibold text-base">
              Purchase Invoice berhasil dibuat!
            </p>
            {createdInvoiceNumber && (
              <p className="text-slate-500 text-sm">
                Nomor Invoice:{" "}
                <span className="font-mono font-semibold text-navy-700">
                  {formatINVNumber(createdInvoiceNumber)}
                </span>
              </p>
            )}
          </div>

          <div className="w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            Invoice baru sudah ditambahkan ke daftar Purchase Invoice.
            Anda dapat langsung melihat dan mengelolanya di tabel di bawah.
          </div>

        </div>

        {/* Footer */}
        <div
          className="
            flex items-center justify-end gap-2
            px-6 py-4 border-t border-slate-100 bg-slate-50/60
          "
        >
          <button
            onClick={() => setOpenSuccessModal(false)}
            className="
              px-4 py-2 text-sm font-semibold
              text-slate-600 bg-white border border-slate-200 rounded-lg
            "
          >
            Tutup
          </button>

          <button
            onClick={() => {
              setOpenSuccessModal(false);
              // Scroll the table into view so the new invoice is visible
              tableRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            className="
              flex items-center gap-2
              px-5 py-2 text-sm font-semibold
              text-gold-400 bg-navy-900 rounded-lg
            "
          >
            <FileText size={15} />
            Lihat Purchase Invoice
          </button>
        </div>

      </div>

    </div>
  </>

)}

    </AppShell>
  );
}