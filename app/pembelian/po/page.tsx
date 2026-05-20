"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useEffect, useState } from "react";

import {
  getPurchaseOrders,
} from "@/lib/services";

// ─── Type ──────────────────────────────────────────────────────────────────────
type POStatus =
  | "Waiting to be processed"
  | "Processed"
  | "Partially processed"
  | "Cancelled";

interface PurchaseOrder {
  id: string;
  nomor: string;
  tanggal: string;
  supplier: string;
  informasi: string;
  status: POStatus;
  total: number;
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

  Processed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  "Partially processed":
    "bg-blue-50 text-blue-700 border border-blue-200",

  Cancelled:
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function POStatusBadge({
  status,
}: {
  status: POStatus;
}) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<PurchaseOrder>[] = [
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
    key: "supplier",
    label: "Supplier",
    width: "200px",

    render: (val) => (
      <span className="font-medium text-slate-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "informasi",
    label: "Information",

    render: (val) => (
      <span className="text-slate-500 text-xs">
        {String(val) || "—"}
      </span>
    ),
  },

  {
    key: "status",
    label: "Status",
    width: "180px",

    render: (val) => (
      <POStatusBadge status={val as POStatus} />
    ),
  },

  {
    key: "total",
    label: "Total",
    width: "150px",

    render: (val) => (
      <span className="font-semibold text-slate-700 tabular-nums">
        {formatRupiah(Number(val))}
      </span>
    ),
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {

  const [purchaseOrders, setPurchaseOrders] = useState<
    PurchaseOrder[]
  >([]);

  // ─── Fetch Purchase Order ────────────────────────────────────────────────
  const fetchPurchaseOrders = async () => {
    try {

      const res = await getPurchaseOrders();

      const poList = Array.isArray(res)
        ? res
        : res.data;

      const mappedData = poList.map((item: any) => ({
        id: item.purchase_order_id.toString(),
        nomor: item.po_number,
        tanggal: item.order_date,
        supplier:
          item.supplier?.supplier_name || "-",
        informasi: item.status || "-",
        status: item.status as POStatus,
        total: item.total_amount,
      }));

      setPurchaseOrders(mappedData);

    } catch (error) {

      console.error(error);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return (
    <AppShell
      title="Purchase Order"
      subtitle="Kelola pesanan pembelian"
    >

      <DataTable<PurchaseOrder>
        title="Daftar Purchase Order"
        columns={COLUMNS}
        data={purchaseOrders}
        addLabel="Tambah PO"
        onAdd={() => {
          // TODO: buka modal tambah purchase order
        }}
        keyField="id"
      />

    </AppShell>
  );
}