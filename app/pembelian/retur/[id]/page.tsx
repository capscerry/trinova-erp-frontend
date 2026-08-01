"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  ArrowLeft,
  Printer,
  Building2,
  Calendar,
  Hash,
  FileText,
  AlertCircle,
  TrendingUp,
  Package,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPurchaseReturnById,
  getReturnDetails,
} from "@/lib/services/purchase-return.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReturnItem {
  product_id: number;
  product_name?: string;
  quantity?: number;
  qty_return?: number;
  unit_price?: number;
  subtotal?: number;
}

interface ReturnData {
  purchase_return_id: number;
  purchase_return_number: string;
  return_date: string;
  supplier_name?: string;
  goods_receipt_id?: number;
  purchase_order_number?: string;
  settlement_option?: string;
  status?: string;
  total_amount: number;
  closing_condition?: string;
  notes?: string;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);

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

export default function PurchaseReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<ReturnData | null>(null);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getPurchaseReturnById(Number(id));
      if (!result) {
        setError("Purchase Return tidak ditemukan");
        return;
      }
      setData(result);

      try {
        const detailRes = await getReturnDetails(Number(id));
        const list = detailRes?.data ?? detailRes ?? [];
        setItems(Array.isArray(list) ? list : []);
      } catch (detailErr) {
        console.error("Gagal memuat item Purchase Return:", detailErr);
        setItems([]);
      }
    } catch (err) {
      console.error("Gagal memuat detail Purchase Return:", err);
      setError("Gagal memuat data Purchase Return");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = data?.status ?? "Awaiting Replacement";
  const grandTotal = data?.total_amount ?? 0;
  const itemsTotal = items.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
  const totalQty = items.reduce((s, i) => s + Number(i.qty_return ?? i.quantity ?? 0), 0);

  return (
    <AppShell
      title="Detail Purchase Return"
      subtitle={data ? `#${data.purchase_return_number}` : "Memuat..."}
    >
      {/* Back + actions — no-print agar tidak ikut di PDF */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/pembelian/retur")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/pembelian/retur/${id}/print`, "_blank")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         bg-navy-900 text-gold-400 hover:bg-navy-800 transition-colors"
            >
              <Printer size={13} /> Cetak / PDF
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <AlertCircle size={36} className="text-red-300" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => router.push("/pembelian/retur")}
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
                  {data.purchase_return_number}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal Retur: {formatDate(data.return_date)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Nilai Retur",
                value: formatRupiah(grandTotal || itemsTotal),
                sub: `${items.length} item produk`,
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: "Opsi Penyelesaian",
                value: data.settlement_option || "—",
                sub: "Settlement",
                icon: RotateCcw,
              },
              {
                label: "Jumlah Item",
                value: `${items.length} Produk`,
                sub: `${totalQty} unit diretur`,
                icon: Package,
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
                Informasi Retur
              </h3>
              <InfoRow label="No. Retur" value={data.purchase_return_number} icon={Hash} />
              <InfoRow label="Tanggal Retur" value={formatDate(data.return_date)} icon={Calendar} />
              <InfoRow label="Nomor PO" value={data.purchase_order_number || "—"} icon={FileText} />
              <InfoRow label="Supplier" value={data.supplier_name} icon={Building2} />
              {data.goods_receipt_id && (
                <InfoRow label="Referensi GR" value={`#${data.goods_receipt_id}`} icon={Package} />
              )}
              <InfoRow label="Nomor Faktur Pajak" value={data.nomor_faktur_pajak || "—"} icon={FileText} />
            </div>

            {/* Right side */}
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Produk yang Diretur
                  </h3>
                </div>

                {items.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[36%]">
                              Produk
                            </th>
                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-[14%]">
                              Qty Retur
                            </th>
                            <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[25%]">
                              Harga Satuan
                            </th>
                            <th className="px-5 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[25%]">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, idx) => (
                            <tr key={`${item.product_id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-slate-700">
                                  {item.product_name || `Produk #${item.product_id}`}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                                {item.qty_return ?? item.quantity ?? 0}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {item.unit_price != null ? formatRupiah(item.unit_price) : "—"}
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800">
                                {item.subtotal != null ? formatRupiah(item.subtotal) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40">
                      <div className="flex justify-end">
                        <div className="w-72 space-y-1.5">
                          <div className="flex justify-between pt-2 border-t border-slate-200">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                              Total Retur
                            </span>
                            <span className="text-base font-bold text-navy-900">
                              {formatRupiah(grandTotal || itemsTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada item produk
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                  <RotateCcw size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Kondisi Penyelesaian
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 px-5 py-2">
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-slate-500">Opsi Penyelesaian</span>
                    <span className="font-semibold text-slate-700">
                      {data.settlement_option || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-slate-500">Status</span>
                    <StatusBadge status={status} />
                  </div>
                  {(data.closing_condition || data.notes) && (
                    <div className="py-3 text-sm">
                      <span className="text-slate-500 block mb-1">Keterangan</span>
                      <span className="font-semibold text-slate-700">
                        {data.closing_condition || data.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
