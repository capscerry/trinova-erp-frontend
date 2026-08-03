"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Package,
  Calendar,
  Hash,
  AlertCircle,
  Warehouse,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import {
  getTransferById,
  processTransfer,
  completeTransfer,
  cancelTransfer,
} from "@/lib/services/stock-transfer.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransferData {
  reference_number?: string;
  status?: string;
  product_name?: string;
  quantity?: number;
  source_warehouse_name?: string;
  destination_warehouse_name?: string;
  created_at?: string;
  processed_at?: string;
  completed_at?: string;
  canceled_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (v?: string | null) => {
  if (!v) return "—";
  const date = new Date(v);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={13} className="text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-700 break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-slate-100 rounded-xl" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StockTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"process" | "complete" | "cancel" | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getTransferById(Number(id));
      setData(result);
    } catch (err) {
      console.error("Gagal memuat detail Stock Transfer:", err);
      setError("Gagal memuat data Stock Transfer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = data?.status ?? "CREATED";

  const handleProcess = async () => {
    if (!data) return;
    setActionLoading("process");
    try {
      await processTransfer(Number(id));
      notify.success("Transfer berhasil diproses");
      await fetchData();
    } catch (err) {
      console.error(err);
      notify.error("Gagal memproses transfer");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!data) return;
    setActionLoading("complete");
    try {
      await completeTransfer(Number(id));
      notify.success("Transfer berhasil diselesaikan");
      await fetchData();
    } catch (err) {
      console.error(err);
      notify.error("Gagal menyelesaikan transfer");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!data) return;
    setActionLoading("cancel");
    try {
      await cancelTransfer(Number(id));
      notify.success("Transfer berhasil dibatalkan");
      await fetchData();
    } catch (err) {
      console.error(err);
      notify.error("Gagal membatalkan transfer");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppShell
      title="Detail Stock Transfer"
      subtitle={data ? `#${data.reference_number || id}` : "Memuat..."}
    >
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/persediaan/transfer-barang")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && status === "CREATED" && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={actionLoading !== null}
              onClick={handleCancel}
            >
              {actionLoading === "cancel" ? "Membatalkan..." : "Batalkan"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoading !== null}
              onClick={handleProcess}
            >
              {actionLoading === "process" ? "Memproses..." : "Proses Transfer"}
            </Button>
          </div>
        )}

        {data && status === "PROCESSED" && (
          <Button
            type="button"
            size="sm"
            disabled={actionLoading !== null}
            onClick={handleComplete}
          >
            {actionLoading === "complete" ? "Menyelesaikan..." : "Selesaikan Transfer"}
          </Button>
        )}
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <AlertCircle size={36} className="text-red-300" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => router.push("/persediaan/transfer-barang")}
            className="text-xs text-navy-700 underline"
          >
            Kembali ke daftar
          </button>
        </div>
      ) : data ? (
        <div id="print-area" className="space-y-4">
          {/* ── Header Banner ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-navy-900 font-mono tracking-tight">
                  {data.reference_number || `Transfer #${id}`}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dibuat: {formatDateTime(data.created_at)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Produk",
                value: data.product_name || "—",
                sub: `${data.quantity ?? 0} unit`,
                icon: Package,
                highlight: true,
              },
              {
                label: "Dari Gudang",
                value: data.source_warehouse_name || "—",
                sub: "Source Warehouse",
                icon: Warehouse,
              },
              {
                label: "Ke Gudang",
                value: data.destination_warehouse_name || "—",
                sub: "Destination Warehouse",
                icon: ArrowRightLeft,
              },
            ].map(({ label, value, sub, icon: Icon, highlight }) => (
              <div
                key={label}
                className={cn(
                  "rounded-xl border p-4 flex items-start gap-3",
                  highlight
                    ? "bg-navy-900 border-navy-800"
                    : "bg-white border-slate-200 shadow-sm"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    highlight ? "bg-white/10" : "bg-slate-50"
                  )}
                >
                  <Icon
                    size={15}
                    className={highlight ? "text-gold-400" : "text-slate-400"}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                    {label}
                  </p>
                  <p
                    className={cn(
                      "text-base font-bold break-words",
                      highlight ? "text-gold-400" : "text-navy-900"
                    )}
                  >
                    {value}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5",
                      highlight ? "text-slate-500" : "text-slate-400"
                    )}
                  >
                    {sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Info Card ──────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Informasi Transfer
            </h3>
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <InfoRow label="No. Referensi" value={data.reference_number} icon={Hash} />
                <InfoRow label="Produk" value={data.product_name} icon={Package} />
                <InfoRow label="Quantity" value={String(data.quantity ?? 0)} icon={Package} />
              </div>
              <div>
                <InfoRow label="Dari Gudang" value={data.source_warehouse_name} icon={Warehouse} />
                <InfoRow label="Ke Gudang" value={data.destination_warehouse_name} icon={Warehouse} />
                <InfoRow label="Dibuat" value={formatDateTime(data.created_at)} icon={Calendar} />
              </div>
            </div>
            <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-3 gap-4">
              <InfoRow label="Diproses" value={formatDateTime(data.processed_at)} icon={Calendar} />
              <InfoRow label="Selesai" value={formatDateTime(data.completed_at)} icon={Calendar} />
              <InfoRow label="Dibatalkan" value={formatDateTime(data.canceled_at)} icon={Calendar} />
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
