"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  ArrowLeft,
  Printer,
  Building2,
  Package,
  Calendar,
  Hash,
  FileText,
  AlertCircle,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGoodsReceiptById } from "@/lib/services/gr.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GRItem {
  goods_receipt_detail_id?: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  uom_code?: string;
  price?: number;
  subtotal?: number;
}

interface GRData {
  goods_receipt_id: number;
  receipt_number: string;
  receipt_date: string;
  purchase_order_id?: number;
  po_number?: string;
  supplier_name?: string;
  received_by?: string;
  status?: string;
  total_amount?: number;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
  items?: GRItem[];
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

export default function GoodsReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<GRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getGoodsReceiptById(Number(id));
      setData(result);
    } catch (err) {
      console.error("Gagal memuat detail Goods Receipt:", err);
      setError("Gagal memuat data Goods Receipt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const items = data?.items ?? [];
  const status = data?.status ?? "Received";
  const grandTotal = data?.total_amount ?? 0;
  const totalQty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const itemsTotal = items.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);

  return (
    <AppShell
      title="Detail Goods Receipt"
      subtitle={data ? `#${data.receipt_number}` : "Memuat..."}
    >
      {/* Back + actions — no-print agar tidak ikut di PDF */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/pembelian/gr")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/pembelian/gr/${id}/print`, "_blank")}
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
            onClick={() => router.push("/pembelian/gr")}
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
                  {data.receipt_number}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal Terima: {formatDate(data.receipt_date)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Penerimaan",
                value: formatRupiah(grandTotal || itemsTotal),
                sub: `${items.length} item produk`,
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: "Nomor PO Terkait",
                value: data.po_number || "—",
                sub: "Purchase Order sumber",
                icon: FileText,
              },
              {
                label: "Jumlah Item",
                value: `${items.length} Produk`,
                sub: `${totalQty} unit total`,
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
                Informasi Goods Receipt
              </h3>
              <InfoRow label="No. Receipt" value={data.receipt_number} icon={Hash} />
              <InfoRow label="Tanggal Terima" value={formatDate(data.receipt_date)} icon={Calendar} />
              <InfoRow label="Nomor PO" value={data.po_number || "—"} icon={FileText} />
              <InfoRow label="Supplier" value={data.supplier_name} icon={Building2} />
              <InfoRow label="Diterima Oleh" value={data.received_by} icon={User} />
              <InfoRow label="Nomor Faktur Pajak" value={data.nomor_faktur_pajak || "—"} icon={FileText} />
              {data.transaction_name && (
                <InfoRow label="Nama Transaksi" value={data.transaction_name} icon={FileText} />
              )}
            </div>

            {/* Right side */}
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Detail Produk Diterima
                  </h3>
                </div>

                {items.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[32%]">
                              Produk
                            </th>
                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-[13%]">
                              Qty
                            </th>
                            <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[13%]">
                              Satuan
                            </th>
                            <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[21%]">
                              Harga Satuan
                            </th>
                            <th className="px-5 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[21%]">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, idx) => (
                            <tr key={item.goods_receipt_detail_id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-slate-700">
                                  {item.product_name || `Produk #${item.product_id}`}
                                </p>
                                {item.product_code && (
                                  <p className="text-[10px] text-slate-400">{item.product_code}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {item.uom_code || "—"}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {item.price != null ? formatRupiah(item.price) : "—"}
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
                              Total Nilai GR
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

              {(data.transaction_detail || data.transaction_name) && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <FileText size={14} className="text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Catatan Transaksi
                    </h3>
                  </div>
                  <div className="px-5 py-4 text-sm text-slate-600">
                    {data.transaction_detail || data.transaction_name}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
