"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { notify } from "@/lib/notify";
import {
  ShieldCheck,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPendingApprovalPOs,
  approvePurchaseOrder,
  rejectPurchaseOrderApproval,
} from "@/lib/services/po.service";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PORequest {
  id: string;
  nomor: string;
  tanggal: string;
  supplier: string;
  total: number;
  transaction_name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

// ─────────────────────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({
  po,
  onConfirm,
  onCancel,
  isLoading,
}: {
  po: PORequest;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-700 to-rose-500">
            <div>
              <h2 className="text-white font-semibold text-[15px]">
                Tolak Purchase Order
              </h2>
              <p className="text-rose-200 text-xs mt-0.5">
                {po.nomor}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-200 hover:text-white hover:bg-white/10"
            >
              <XCircle size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-700">
                  PO ini akan dikembalikan ke status Draft
                </p>
                <p className="text-xs text-rose-600 mt-0.5">
                  Staff purchasing akan menerima notifikasi dan dapat merevisi PO sebelum mengajukan kembali.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Alasan Penolakan
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan (opsional)..."
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 size={13} className="animate-spin" />}
              Tolak PO
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE COLUMNS
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS: Column<PORequest>[] = [
  {
    key: "nomor",
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
    key: "tanggal",
    label: "Order Date",
    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap text-xs">
        {formatDate(String(val))}
      </span>
    ),
  },
  {
    key: "total",
    label: "Total",
    render: (val) => (
      <span className="font-semibold text-slate-700 tabular-nums">
        Rp {formatRupiah(Number(val))}
      </span>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TrackPOStatusPage() {
  const [pendingPOs, setPendingPOs] = useState<PORequest[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);

  // Per-row action loading states
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [rejectingPO, setRejectingPO]   = useState<PORequest | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // ─── Load pending POs ────────────────────────────────────────────────────

  const loadPendingPOs = async () => {
    setLoadingPage(true);
    try {
      const res  = await getPendingApprovalPOs();
      const list = Array.isArray(res) ? res : res.data ?? [];
      const mapped: PORequest[] = list.map((item: any) => ({
        id:               String(item.purchase_order_id),
        nomor:            item.po_number ?? "",
        tanggal:          item.order_date ?? "",
        supplier:
          item.supplier?.supplier_name ??
          item.supplier_name ??
          `Supplier ${item.supplier_id ?? ""}`,
        total:            Number(item.total_amount ?? 0),
        transaction_name: item.transaction_name ?? "",
      }));
      setPendingPOs(mapped);
    } catch (err) {
      console.error(err);
      notify.error("Gagal memuat daftar PO yang menunggu persetujuan.");
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => { loadPendingPOs(); }, []);

  // ─── Approve handler ─────────────────────────────────────────────────────

  const handleApprove = async (row: PORequest) => {
    setApprovingId(row.id);
    try {
      const result = await approvePurchaseOrder(Number(row.id));
      if (result?.status === false) {
        throw new Error(result?.message ?? "Persetujuan gagal");
      }
      notify.success(`PO ${row.nomor} berhasil disetujui.`);
      await loadPendingPOs();
    } catch (err: any) {
      console.error(err);
      notify.error(
        "Gagal menyetujui PO",
        err?.message ?? "Periksa ketersediaan stok pada PO ini."
      );
    } finally {
      setApprovingId(null);
    }
  };

  // ─── Reject handler ──────────────────────────────────────────────────────

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingPO) return;
    setRejectLoading(true);
    try {
      await rejectPurchaseOrderApproval(Number(rejectingPO.id), reason);
      notify.success(`PO ${rejectingPO.nomor} dikembalikan ke Draft.`);
      setRejectingPO(null);
      await loadPendingPOs();
    } catch (err: any) {
      console.error(err);
      notify.error("Gagal menolak PO", err?.message);
    } finally {
      setRejectLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppShell
      title="Track PO Status"
      subtitle="Tinjau dan setujui Purchase Order yang menunggu persetujuan"
    >
      {/* Legend / info strip */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldCheck size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800">
          <p className="font-semibold">PO menunggu persetujuan Procurement Manager</p>
          <p className="mt-0.5 text-amber-700 leading-relaxed">
            Setujui PO untuk melanjutkan alur pengadaan (GR → Invoice → Payment),
            atau tolak untuk mengembalikan ke Draft agar dapat direvisi oleh staff.
          </p>
        </div>
      </div>

      {loadingPage ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <DataTable<PORequest>
          title="PO Menunggu Persetujuan"
          columns={COLUMNS}
          data={pendingPOs}
          keyField="id"
          dateField="tanggal"
          nameField="supplier"
          renderActions={(row) => {
            const isApproving = approvingId === row.id;
            return (
              <div className="flex gap-1.5 justify-center">
                {/* Approve */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(row)}
                  disabled={isApproving || rejectLoading}
                  className={cn(
                    "flex items-center gap-1.5",
                    isApproving && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isApproving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={12} />
                  )}
                  {isApproving ? "Memproses..." : "Setujui"}
                </Button>

                {/* Reject */}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRejectingPO(row)}
                  disabled={isApproving || rejectLoading}
                >
                  <XCircle size={12} className="mr-1" />
                  Tolak
                </Button>
              </div>
            );
          }}
        />
      )}

      {/* Empty state */}
      {!loadingPage && pendingPOs.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <ShieldCheck size={28} className="text-emerald-500" />
          </div>
          <p className="text-slate-700 font-semibold">Tidak ada PO yang menunggu persetujuan</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Semua Purchase Order sudah diproses. PO baru yang diajukan staff akan muncul di sini.
          </p>
        </div>
      )}

      {/* Reject modal */}
      {rejectingPO && (
        <RejectModal
          po={rejectingPO}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingPO(null)}
          isLoading={rejectLoading}
        />
      )}
    </AppShell>
  );
}
