"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { notify } from "@/lib/notify";
import { ClipboardList } from "lucide-react";
import { getApprovedPOs } from "@/lib/services/po.service";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type POApprovalStatus =
  | "Approved"
  | "Waiting to be processed"
  | "Processed"
  | "Partially processed"
  | "Completed";

interface ApprovedPO {
  id: string;
  po_number: string;
  order_date: string;
  expected_date: string | null;
  supplier: string;
  total_amount: number;
  status: POApprovalStatus;
  transaction_name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Approved:                  "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "Waiting to be processed": "bg-amber-50 text-amber-700 border border-amber-200",
  Processed:                 "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Partially processed":     "bg-blue-50 text-blue-700 border border-blue-200",
  Completed:                 "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? "bg-slate-100 text-slate-700 border border-slate-200";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE COLUMNS
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS: Column<ApprovedPO>[] = [
  {
    key: "po_number",
    label: "PO Number",
    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },
  {
    key: "transaction_name",
    label: "Transaction Name",
    render: (val) => (
      <span className="text-slate-600 text-xs">{String(val || "—")}</span>
    ),
  },
  {
    key: "supplier",
    label: "Supplier",
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),
  },
  {
    key: "order_date",
    label: "Order Date",
    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap text-xs">
        {formatDate(String(val))}
      </span>
    ),
  },
  {
    key: "expected_date",
    label: "Expected Date",
    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap text-xs">
        {formatDate(val as string | null)}
      </span>
    ),
  },
  {
    key: "total_amount",
    label: "Total",
    render: (val) => (
      <span className="font-semibold text-slate-700 tabular-nums">
        Rp {formatRupiah(Number(val))}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (val) => <StatusBadge status={String(val)} />,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function POApprovalListPage() {
  const [pos, setPOs] = useState<ApprovedPO[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPOs = async () => {
    setLoading(true);
    try {
      const res = await getApprovedPOs();
      const list = Array.isArray(res) ? res : res.data ?? [];
      const mapped: ApprovedPO[] = list.map((item: any) => ({
        id: String(item.purchase_order_id),
        po_number: item.po_number ?? "",
        order_date: item.order_date ?? "",
        expected_date: item.expected_date ?? null,
        supplier:
          item.supplier?.supplier_name ??
          item.supplier_name ??
          `Supplier ${item.supplier_id ?? ""}`,
        total_amount: Number(item.total_amount ?? 0),
        status: (item.status ?? "Approved") as POApprovalStatus,
        transaction_name: item.transaction_name ?? "",
      }));
      setPOs(mapped);
    } catch (err) {
      console.error(err);
      notify.error("Gagal memuat daftar PO yang disetujui.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOs();
  }, []);

  return (
    <AppShell
      title="Approved Purchase Orders"
      subtitle="Daftar Purchase Order yang telah disetujui dan sedang dalam proses"
    >
      {/* Page header with icon */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
          <ClipboardList size={18} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm text-slate-500 leading-tight">
            Menampilkan semua PO berstatus Approved, Waiting to be processed,
            Partially processed, dan Completed.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <DataTable<ApprovedPO>
          title="Approved Purchase Orders"
          columns={COLUMNS}
          data={pos}
          keyField="id"
          dateField="order_date"
          nameField="supplier"
          statusOptions={[
            "Approved",
            "Waiting to be processed",
            "Processed",
            "Partially processed",
            "Completed",
          ]}
        />
      )}
    </AppShell>
  );
}
