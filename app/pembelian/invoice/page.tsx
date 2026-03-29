"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";

// ─── Type ─────────────────────────────────────────────────────────────────────
type InvoiceStatus =
  | "Not yet paid off"
  | "Paid off"
  | "Partially paid"
  | "Cancelled";

interface PurchaseInvoice {
  id: string;
  nomor: string;
  invoiceNo: string;
  tanggal: string;
  supplier: string;
  informasi: string;
  status: InvoiceStatus;
  age: number;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<InvoiceStatus, string> = {
  "Not yet paid off":
    "bg-amber-50 text-amber-700 border border-amber-200",
  "Paid off":
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Partially paid":
    "bg-blue-50 text-blue-700 border border-blue-200",
  "Cancelled":
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Columns (Sesuai Gambar) ──────────────────────────────────────────────────
const COLUMNS: Column<PurchaseInvoice>[] = [
  {
    key: "nomor",
    label: "Number #",
    width: "160px",
    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },
  {
    key: "invoiceNo",
    label: "Invoice No #",
    width: "180px",
  },
  {
    key: "tanggal",
    label: "Date",
    width: "120px",
    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap">
        {formatDate(String(val))}
      </span>
    ),
  },
  {
    key: "supplier",
    label: "Supplier",
    width: "220px",
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),
  },
  {
    key: "informasi",
    label: "Information",
    width: "200px",
    render: (val) => (
      <span className="text-slate-500 text-xs">{String(val) || "—"}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "160px",
    render: (val) => <InvoiceStatusBadge status={val as InvoiceStatus} />,
  },
  {
    key: "age",
    label: "Age (day)",
    width: "120px",
    render: (val) => (
      <span className="text-slate-600">{formatNumber(Number(val))}</span>
    ),
  },
  {
    key: "total",
    label: "Total",
    width: "150px",
    render: (val) => (
      <span className="font-semibold text-slate-700 tabular-nums">
        {formatNumber(Number(val))}
      </span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PurchaseInvoicePage() {
  return (
    <AppShell
      title="Purchase Invoice"
      subtitle="Kelola invoice pembelian"
    >
      <DataTable<PurchaseInvoice>
        title="Daftar Purchase Invoice"
        columns={COLUMNS}
        data={[]}   // data tetap kosong
        addLabel="Tambah Purchase Invoice"
        onAdd={() => {
          // TODO: buka modal tambah purchase invoice
        }}
        keyField="id"
      />
    </AppShell>
  );
}