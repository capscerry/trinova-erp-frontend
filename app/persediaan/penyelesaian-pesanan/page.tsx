"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui";

// ─── Type ──────────────────────────────────────────────────────────────────────
type POStatus =
  | "Waiting to be processed"
  | "Processed"
  | "Partially processed"
  | "Cancelled";

interface OrderFulfillment {
  id: string;
  nomor: string;
  tanggal: string;

pekerjaan: string;
tipe_penyelesaian: string;
  keterangan: string;

}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(n);

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

// ─── Status Badge khusus PO ────────────────────────────────────────────────────
const STATUS_STYLE: Record<POStatus, string> = {
  "Waiting to be processed":
    "bg-amber-50 text-amber-700 border border-amber-200",
  Processed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Partially processed": "bg-blue-50 text-blue-700 border border-blue-200",
  Cancelled: "bg-rose-50 text-rose-600 border border-rose-200",
};

function POStatusBadge({ status }: { status: POStatus }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<OrderFulfillment>[] = [
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
    key: "pekerjaan",
    label: "Pekerjaan",
    width: "200px",
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),
  },
  {
    key: "tipe_penyelesaian",
    label: "Tipe Penyelesaian",
    width: "180px", 
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),  
  },
  {
    key: "keterangan",
    label: "Keterangan",
    render: (val) => (
      <span className="text-slate-500 text-xs">{String(val) || "—"}</span>
    ),
  }
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function OrderFulfillmentPage() {
  return (
    <AppShell title="Purchase Order" subtitle="Kelola pesanan pembelian">
      <DataTable<OrderFulfillment>
        title="Daftar Purchase Order"
        columns={COLUMNS}
        data={[]}
        addLabel="Tambah PO"
        onAdd={() => {
          // TODO: buka modal tambah purchase order
        }}
        keyField="id"
      />
    </AppShell>
  );
}