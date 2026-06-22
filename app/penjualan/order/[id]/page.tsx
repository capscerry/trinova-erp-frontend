"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { printAsPdf } from "@/lib/userPrintPdf";
import { AppShell } from "@/components/layout";
import {
  ArrowLeft,
  Printer,
  Edit,
  Truck,
  CreditCard,
  ReceiptText,
  Package,
  MapPin,
  Calendar,
  Hash,
  User,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    SalesOrderDetail,
  salesOrderService,
  type SalesOrder,
  type SalesOrderDetailItem,
} from "@/lib/services/penjualan.service";

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
      <div className="h-48 bg-slate-100 rounded-xl" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const result = await salesOrderService.getById(id);
        console.log("Loaded Sales Order Detail:", result);
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data Sales Order");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Semua nilai (total final, discountTotal, taxTotal) datang LANGSUNG dari
  // API — tidak ada kalkulasi pajak/diskon manual di frontend.
  //   grossAmount = total final + discountTotal − taxTotal
  //               = nilai SEBELUM diskon & pajak (titik awal breakdown)
  const grandTotal = data?.total ?? 0;
  const grossAmount = data
    ? data.total + data.discountTotal - data.taxTotal
    : 0;
  const totalQty   = data?.items?.reduce((s, i) => s + i.productQty, 0) ?? 0;

  return (
    <AppShell
      title="Detail Sales Order"
      subtitle={data ? `#${data.nomor}` : "Memuat..."}
    >
      {/* Back + actions — no-print agar tidak ikut di PDF */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/penjualan/order")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            {/* ↓ sambungkan ke printAsPdf */}
            <button
              onClick={() => window.open(`/penjualan/order/${id}/print`, "_blank")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Printer size={13} /> Cetak
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <Edit size={13} /> Edit
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
            onClick={() => router.push("/penjualan/order")}
            className="text-xs text-navy-700 underline"
          >
            Kembali ke daftar
          </button>
        </div>
      ) : data ? (
        // ↓ tambahkan id="print-area" di sini
        <div id="print-area" className="space-y-4">

          {/* ── Header Banner ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-navy-900 font-mono tracking-tight">
                  {data.nomor}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal Order: {formatDate(data.tanggal)}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 italic">
                Status belum tersedia dari API
              </div>
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Pesanan",
                value: formatRupiah(grandTotal),
                sub: `${data.items?.length ?? 0} item produk`,
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: "Tanggal Kirim",
                value: formatDate(data.tanggalKirim),
                sub: "Estimasi pengiriman",
                icon: Truck,
              },
              {
                label: "Jumlah Item",
                value: `${data.items?.length ?? 0} Produk`,
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
                Informasi Pesanan
              </h3>
              <InfoRow label="Nomor SO"      value={data.nomor}                    icon={Hash} />
              <InfoRow label="Tanggal Order" value={formatDate(data.tanggal)}      icon={Calendar} />
              <InfoRow label="Tanggal Kirim" value={formatDate(data.tanggalKirim)} icon={Truck} />
              <InfoRow label="Nomor PO"      value={data.poNumber || "—"}          icon={FileText} />
              <InfoRow label="Pelanggan"     value={data.pelanggan}                icon={User} />
              <InfoRow label="Alamat"        value={data.alamat}                   icon={MapPin} />
              {data.keterangan && (
                <InfoRow label="Keterangan"  value={data.keterangan}               icon={FileText} />
              )}
            </div>

            {/* Right side */}
            <div className="col-span-2 space-y-4">

              {/* Detail Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Detail Produk
                  </h3>
                </div>

                {data.items?.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[35%]">
                              Produk
                            </th>
                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-[12%]">
                              Qty
                            </th>
                            <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[22%]">
                              Harga Satuan
                            </th>
                            <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[16%]">
                              Diskon
                            </th>
                            <th className="px-5 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[15%]">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.items.map((item: SalesOrderDetailItem, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-slate-700">
                                  {item.productName}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                                {item.productQty}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {formatRupiah(item.productPrice)}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-400">
                                {item.productDiscount > 0
                                  ? `${item.productDiscount}%`
                                  : "—"}
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800">
                                {formatRupiah(item.totalPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Ringkasan: Subtotal → Diskon → Pajak → Total */}
                    {/* Semua nilai berasal langsung dari API — tidak ada
                        kalkulasi pajak/diskon manual di frontend. */}
                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40">
                      <div className="flex justify-end">
                        <div className="w-72 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="font-semibold text-slate-700">
                              {formatRupiah(grossAmount)}
                            </span>
                          </div>
                          {data.discountTotal > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Diskon</span>
                              <span className="font-semibold text-red-500">
                                -{formatRupiah(data.discountTotal)}
                              </span>
                            </div>
                          )}
                          {data.taxTotal > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">PPN</span>
                              <span className="font-semibold text-slate-700">
                                {formatRupiah(data.taxTotal)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-slate-200">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                              Total
                            </span>
                            <span className="text-base font-bold text-navy-900">
                              {formatRupiah(grandTotal)}
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

            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}