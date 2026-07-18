"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { notify } from "@/lib/notify";
import { ClipboardList } from "lucide-react";
import { getApprovedPOs } from "@/lib/services/po.service";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type POApprovalStatus =
  | "Approved"
  | "Waiting to be processed"
  | "Processed"
  | "Partially processed"
  | "Completed";

interface ApprovedPO {
  id: string;
  nomor: string;
  tanggal: string;
  supplier: string;
  total: number;
  status: POApprovalStatus;
  transaction_name: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

const APPROVED_STATUSES: string[] = [
  "Approved",
  "Waiting to be processed",
  "Processed",
  "Partially processed",
  "Completed",
];

// ─────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Approved:
    "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "Waiting to be processed":
    "bg-amber-50 text-amber-700 border border-amber-200",
  Processed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Partially processed":
    "bg-blue-50 text-blue-700 border border-blue-200",
  Completed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function POApprovalListPage() {
  const [approvedPOs, setApprovedPOs] = useState<ApprovedPO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovedPOs = async () => {
    try {
      setLoading(true);
      const res = await getApprovedPOs();
      const list = Array.isArray(res) ? res : res.data ?? [];
      const mapped: ApprovedPO[] = list.map((po: any) => ({
        id: po.purchase_order_id.toString(),
        nomor: po.po_number,
        tanggal: po.order_date,
        supplier: po.supplier?.supplier_name ?? "-",
        total: po.total_amount,
        status: po.status as POApprovalStatus,
        transaction_name: po.transaction_name ?? "",
      }));
      setApprovedPOs(mapped);
    } catch (error) {
      console.error(error);
      notify.error("Gagal memuat daftar PO");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedPOs();
  }, []);

  const COLUMNS: Column<ApprovedPO>[] = [
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
      key: "transaction_name",
      label: "Transaction Name",
      width: "180px",
      render: (val) => (
        <span className="text-slate-600 text-xs">{String(val || "—")}</span>
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
        <span className="text-slate-700 text-sm">{String(val)}</span>
      ),
    },
    {
      key: "status",
      label: "Current Status",
      width: "200px",
      render: (val) => <StatusBadge status={String(val)} />,
    },
    {
      key: "total",
      label: "Total",
      width: "150px",
      render: (val) => (
        <span className="font-semibold text-slate-700 tabular-nums">
          Rp {formatRupiah(Number(val))}
        </span>
      ),
    },
  ];

  return (
    <AppShell
      title="PO Approval List"
      subtitle="Riwayat Purchase Order yang telah disetujui dan status prosesnya"
    >
      {/* Info banner */}
      <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-start gap-3">
        <ClipboardList size={16} className="text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">Riwayat PO Disetujui</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            Daftar seluruh Purchase Order yang telah Anda setujui beserta status prosesnya saat ini —
            mulai dari Approved hingga Completed.
          </p>
        </div>
      </div>

      <DataTable<ApprovedPO>
        title="Daftar PO yang Telah Disetujui"
        columns={COLUMNS}
        data={approvedPOs}
        keyField="id"
        dateField="tanggal"
        nameField="supplier"
        statusOptions={[
          "Approved",
          "Waiting to be processed",
          "Processed",
          "Partially processed",
          "Completed",
        ]}
        addLabel=""
      />
    </AppShell>
  );
}
