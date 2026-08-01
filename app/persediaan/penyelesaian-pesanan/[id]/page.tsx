"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  ArrowLeft,
  Package,
  Calendar,
  Hash,
  AlertCircle,
  Warehouse,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderFulfillmentById } from "@/lib/services/order-fulfillment.service";
import type { OrderFulfillment } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
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

export default function OrderFulfillmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<OrderFulfillment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getOrderFulfillmentById(Number(id));
      if (!result) {
        setError("Order Fulfillment tidak ditemukan");
        return;
      }
      setData(result);
    } catch (err) {
      console.error("Gagal memuat detail Order Fulfillment:", err);
      setError("Gagal memuat data Order Fulfillment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = data?.status ?? "Processing";

  return (
    <AppShell
      title="Detail Order Fulfillment"
      subtitle={data ? `#${data.reference_number || data.movement_id}` : "Memuat..."}
    >
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/persediaan/penyelesaian-pesanan")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <AlertCircle size={36} className="text-red-300" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => router.push("/persediaan/penyelesaian-pesanan")}
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
                  {data.reference_number || `Movement #${data.movement_id}`}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal: {formatDate(data.movement_date)}
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
                value: data.product_name || `Produk #${data.product_id}`,
                sub: `${data.quantity} unit`,
                icon: Package,
                highlight: true,
              },
              {
                label: "Jenis Pergerakan",
                value: data.movement_type,
                sub: "Movement Type",
                icon: Boxes,
              },
              {
                label: "Gudang Sumber",
                value: data.warehouse_name || "—",
                sub: "Source Warehouse",
                icon: Warehouse,
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
              Informasi Pergerakan
            </h3>
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <InfoRow label="No. Referensi" value={data.reference_number} icon={Hash} />
                <InfoRow label="Tanggal" value={formatDate(data.movement_date)} icon={Calendar} />
                <InfoRow label="Produk" value={data.product_name || `Produk #${data.product_id}`} icon={Package} />
                <InfoRow label="Qty" value={String(data.quantity)} icon={Boxes} />
              </div>
              <div>
                <InfoRow label="Gudang Sumber" value={data.warehouse_name} icon={Warehouse} />
                <InfoRow label="Diproses Pada" value={formatDate(data.processed_at)} icon={Calendar} />
                <InfoRow label="Selesai Pada" value={formatDate(data.completed_at)} icon={Calendar} />
                <InfoRow label="Dibatalkan Pada" value={formatDate(data.canceled_at)} icon={Calendar} />
              </div>
            </div>
            {data.notes && (
              <div className="mt-2 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Catatan
                </p>
                <p className="text-sm text-slate-600">{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
