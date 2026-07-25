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

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface PORequest {
  id: string;
  nomor: string;
  tanggal: string;
  supplier: string;
  total: number;
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

// ─────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-navy-900 to-navy-600">
            <div>
              <h2 className="text-white font-semibold text-[15px]">Tolak Permohonan PO</h2>
              <p className="text-slate-400 text-xs mt-0.5">Berikan alasan penolakan</p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <XCircle size={16} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-800">Konfirmasi Penolakan</p>
                <p className="text-xs text-rose-700 mt-1">
                  Menolak PO <span className="font-bold">{po.nomor}</span> akan mengembalikan
                  statusnya ke Draft dan pembelian perlu mengajukan ulang.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                No PO
              </label>
              <input
                readOnly
                value={po.nomor}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Alasan Penolakan <span className="text-slate-400 normal-case font-normal">(opsional)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Anggaran melebihi batas, perlu revisi jumlah..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 rounded-lg disabled:opacity-60 transition-colors"
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              Tolak PO
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function TrackPOStatusPage() {
  const [poRequests, setPoRequests] = useState<PORequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PORequest | null>(null);

  const fetchPendingPOs = async () => {
    try {
      setLoading(true);
      const res = await getPendingApprovalPOs();
      const list = Array.isArray(res) ? res : res.data ?? [];
      const pending: PORequest[] = list.map((po: any) => ({
        id: po.purchase_order_id.toString(),
        nomor: po.po_number,
        tanggal: po.order_date,
        supplier: po.supplier?.supplier_name ?? "-",
        total: po.total_amount,
        transaction_name: po.transaction_name ?? "",
      }));
      setPoRequests(pending);
    } catch (error) {
      console.error(error);
      notify.error("Gagal memuat data permohonan PO");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPOs();
  }, []);

  const handleApprove = async (po: PORequest) => {
    setActionLoading(po.id);
    try {
      const result = await approvePurchaseOrder(Number(po.id));
      if (!result?.status) {
        throw new Error(result?.message ?? "Persetujuan gagal");
      }
      notify.success("PO berhasil disetujui", `${po.nomor} telah disetujui`);
      await fetchPendingPOs();
    } catch (err: any) {
      notify.error("Gagal menyetujui PO", err?.message ?? "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await rejectPurchaseOrderApproval(Number(rejectTarget.id), reason);
      notify.success("PO ditolak", `${rejectTarget.nomor} dikembalikan ke Draft`);
      setRejectTarget(null);
      await fetchPendingPOs();
    } catch (err: any) {
      notify.error("Gagal menolak PO", err?.message ?? "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  const COLUMNS: Column<PORequest>[] = [
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
      title="Track PO Status"
      subtitle="Setujui atau tolak permohonan persetujuan Purchase Order"
    >
      {/* Pending Approval info banner */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <ShieldCheck size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Permohonan Menunggu Persetujuan</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Daftar di bawah menampilkan Purchase Order yang diajukan oleh tim Pembelian dan menunggu
            persetujuan Anda. Setelah disetujui, PO dapat dilanjutkan ke Purchase Down Payment.
          </p>
        </div>
      </div>

      <DataTable<PORequest>
        title="Permohonan Persetujuan PO"
        columns={COLUMNS}
        data={poRequests}
        keyField="id"
        dateField="tanggal"
        nameField="supplier"
        addLabel=""
        renderActions={(row) => (
          <div className="flex gap-1.5 justify-center">
            <Button
              variant="secondary"
              size="sm"
              disabled={actionLoading === row.id}
              onClick={() => handleApprove(row)}
            >
              {actionLoading === row.id ? (
                <Loader2 size={12} className="animate-spin mr-1" />
              ) : (
                <ShieldCheck size={12} className="mr-1 text-indigo-600" />
              )}
              <span className="text-indigo-600 font-semibold">Setujui</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={actionLoading === row.id}
              onClick={() => setRejectTarget(row)}
            >
              <XCircle size={12} className="mr-1" />
              Tolak
            </Button>
          </div>
        )}
      />

      {rejectTarget && (
        <RejectModal
          po={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          isLoading={actionLoading === rejectTarget.id}
        />
      )}
    </AppShell>
  );
}
