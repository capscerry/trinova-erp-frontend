"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  ArrowLeft,
  Warehouse,
  Calendar,
  Hash,
  FileText,
  AlertCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPurchaseRequisitionById } from "@/lib/services/purchase-requisition.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PRDetailItem {
  pr_detail_id?: number;
  product_id?: number;
  product_name?: string;
  qty_requested?: number;
  remarks?: string;
}

interface PRData {
  pr_id: number;
  pr_number: string;
  pr_date: string;
  status?: string;
  remarks?: string;
  warehouse?: { warehouse_name?: string };
  details?: PRDetailItem[];
}

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
      <div className="h-64 bg-slate-100 rounded-xl" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchaseRequisitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getPurchaseRequisitionById(Number(id));
      setData(result);
    } catch (err) {
      console.error("Gagal memuat detail Purchase Requisition:", err);
      setError("Gagal memuat data Purchase Requisition");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const items = data?.details ?? [];
  const status = data?.status ?? "Requested";
  const totalQty = items.reduce((s, i) => s + Number(i.qty_requested ?? 0), 0);

  return (
    <AppShell
      title="Detail Purchase Requisition"
      subtitle={data ? `#${data.pr_number}` : "Memuat..."}
    >
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/persediaan/permintaan-pembelian")}
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
            onClick={() => router.push("/persediaan/permintaan-pembelian")}
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
                  {data.pr_number}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal PR: {formatDate(data.pr_date)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Jumlah Item Diminta",
                value: `${items.length} Produk`,
                sub: `${totalQty} unit total`,
                icon: Package,
                highlight: true,
              },
              {
                label: "Gudang",
                value: data.warehouse?.warehouse_name || "—",
                sub: "Lokasi permintaan",
                icon: Warehouse,
              },
              {
                label: "Tanggal PR",
                value: formatDate(data.pr_date),
                sub: "Tanggal diajukan",
                icon: Calendar,
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
                      "text-base font-bold",
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

          {/* ── Main Content ──────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Info Card */}
            <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                Informasi PR
              </h3>
              <InfoRow label="No. PR" value={data.pr_number} icon={Hash} />
              <InfoRow label="Tanggal PR" value={formatDate(data.pr_date)} icon={Calendar} />
              <InfoRow label="Gudang" value={data.warehouse?.warehouse_name} icon={Warehouse} />
              {data.remarks && (
                <InfoRow label="Catatan" value={data.remarks} icon={FileText} />
              )}
            </div>

            {/* Right side */}
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Item yang Diminta
                  </h3>
                </div>

                {items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[45%]">
                            Produk
                          </th>
                          <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-[20%]">
                            Qty Diminta
                          </th>
                          <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[35%]">
                            Catatan
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <tr key={item.pr_detail_id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-semibold text-slate-700">
                                {item.product_name || `Produk #${item.product_id}`}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                              {item.qty_requested}
                            </td>
                            <td className="px-5 py-3 text-slate-500">
                              {item.remarks || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada item produk
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
