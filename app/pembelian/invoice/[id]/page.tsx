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
  Wallet,
  Package,
  ArrowDownCircle,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPurchaseInvoiceById } from "@/lib/services/purchase-invoice.service";
import { getPaymentsByInvoice } from "@/lib/services/purchase-payment.service";
import { getDownPaymentsByPurchaseOrder } from "@/lib/services/purchase-down-payment.service";
import { getGoodsReceiptById } from "@/lib/services/gr.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceData {
  purchase_invoice_id?: number;
  invoice_number: string;
  invoice_date: string;
  supplier_name?: string;
  goods_receipt_id?: number;
  total_amount: number;
  status?: string;
  dp_paid?: number;
  payment_paid?: number;
  outstanding_amount?: number;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
}

interface PaymentRow {
  purchase_payment_id?: number;
  payment_number?: string;
  payment_date?: string;
  amount?: number;
  payment_method?: string;
  status?: string;
}

interface DownPaymentRow {
  purchase_down_payment_id?: number;
  purchase_order_id?: number;
  dp_number?: string;
  payment_date?: string;
  payment_type?: string;
  amount?: number;
  status?: string;
}

const fmtPAY = (raw: string | number) => {
  const str = String(raw ?? "");
  const digits = str.replace(/^PAY-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `PAY-${digits.padStart(10, "0")}`;
};

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

const fmtINV = (raw: string | number) => {
  const str = String(raw ?? "");
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
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

export default function PurchaseInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Riwayat DP & Pembayaran -- dulu ditampilkan di modal detail lama
  // ("Riwayat Down Payment"/"Riwayat Pembayaran"), belum ada di halaman baru.
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [downPayments, setDownPayments] = useState<DownPaymentRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getPurchaseInvoiceById(Number(id));
      setData(result);

      setHistoryLoading(true);
      try {
        // Riwayat pembayaran untuk invoice ini
        const paymentList = await getPaymentsByInvoice(Number(id));
        setPayments(
          (Array.isArray(paymentList) ? paymentList : []).filter(
            (p: any) =>
              p.purchase_invoice_id == null ||
              Number(p.purchase_invoice_id) === Number(id)
          )
        );

        // Riwayat DP -- DP tercatat di level PO, jadi perlu resolve PO dari GR invoice ini
        if (result?.goods_receipt_id) {
          const gr = await getGoodsReceiptById(Number(result.goods_receipt_id));
          const poId = gr?.purchase_order_id;
          if (poId) {
            const dpRes = await getDownPaymentsByPurchaseOrder(Number(poId));
            const dpList = Array.isArray(dpRes) ? dpRes : dpRes?.data ?? [];
            // Backend belum benar-benar memfilter query param di atas -- filter ulang di sini.
            setDownPayments(
              dpList.filter((dp: any) => Number(dp.purchase_order_id) === Number(poId))
            );
          }
        }
      } catch (historyErr) {
        console.error("Gagal memuat riwayat pembayaran/DP:", historyErr);
      } finally {
        setHistoryLoading(false);
      }
    } catch (err) {
      console.error("Gagal memuat detail Purchase Invoice:", err);
      setError("Gagal memuat data Purchase Invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = data?.status ?? "Unpaid";
  const total = Number(data?.total_amount ?? 0);
  const dpPaid = Number(data?.dp_paid ?? 0);
  const paymentPaid = Number(data?.payment_paid ?? 0);
  const outstanding = Number(
    data?.outstanding_amount ?? Math.max(0, total - dpPaid - paymentPaid)
  );
  const totalPaid = dpPaid + paymentPaid;
  const ageDays = (() => {
    if (!data?.invoice_date) return null;
    try {
      return Math.floor((Date.now() - new Date(data.invoice_date).getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  })();
  const totalDPMade = downPayments.reduce((s, dp) => s + Number(dp.amount ?? 0), 0);

  return (
    <AppShell
      title="Detail Purchase Invoice"
      subtitle={data ? `#${fmtINV(data.invoice_number)}` : "Memuat..."}
    >
      {/* Back + actions — no-print agar tidak ikut di PDF */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/pembelian/invoice")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/pembelian/invoice/${id}/print`, "_blank")}
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
            onClick={() => router.push("/pembelian/invoice")}
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
                  {fmtINV(data.invoice_number)}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal Invoice: {formatDate(data.invoice_date)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Invoice",
                value: formatRupiah(total),
                sub: data.goods_receipt_id ? `Dari GR #${data.goods_receipt_id}` : "Invoice pembelian",
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: "Sudah Dibayar",
                value: formatRupiah(totalPaid),
                sub: "DP + Pembayaran",
                icon: Wallet,
              },
              {
                label: "Sisa Tagihan",
                value: formatRupiah(outstanding),
                sub: outstanding > 0 ? "Belum lunas" : "Lunas",
                icon: FileText,
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
                Informasi Invoice
              </h3>
              <InfoRow label="No. Invoice" value={fmtINV(data.invoice_number)} icon={Hash} />
              <InfoRow label="Tanggal Invoice" value={formatDate(data.invoice_date)} icon={Calendar} />
              <InfoRow label="Umur (Hari)" value={ageDays != null ? String(ageDays) : "—"} icon={Calendar} />
              <InfoRow label="Supplier" value={data.supplier_name} icon={Building2} />
              {data.goods_receipt_id && (
                <InfoRow label="Referensi GR" value={`#${data.goods_receipt_id}`} icon={Package} />
              )}
              <InfoRow label="Nomor Faktur Pajak" value={data.nomor_faktur_pajak || "—"} icon={FileText} />
              {data.transaction_name && (
                <InfoRow label="Nama Transaksi" value={data.transaction_name} icon={FileText} />
              )}
            </div>

            {/* Right side */}
            <div className="col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                  <Wallet size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Rincian Pembayaran
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 px-5 py-2">
                  {[
                    { label: "Total Invoice", value: formatRupiah(total), strong: true },
                    { label: "Down Payment Dibayar", value: formatRupiah(dpPaid) },
                    { label: "Pembayaran Tercatat", value: formatRupiah(paymentPaid) },
                    { label: "Sisa Tagihan (Outstanding)", value: formatRupiah(outstanding), strong: true },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <span className="text-slate-500">{item.label}</span>
                      <span
                        className={cn(
                          "font-semibold text-slate-700",
                          item.strong && "font-bold text-navy-900"
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-slate-500">Status</span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>

              {downPayments.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <ArrowDownCircle size={14} className="text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Riwayat Down Payment
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">No. DP</th>
                          <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Tanggal</th>
                          <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Tipe</th>
                          <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400">Jumlah</th>
                          <th className="px-5 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {downPayments.map((dp, idx) => (
                          <tr key={dp.purchase_down_payment_id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3 font-mono font-semibold text-navy-700">{dp.dp_number ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(dp.payment_date)}</td>
                            <td className="px-4 py-3 text-slate-600">{dp.payment_type ?? "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatRupiah(Number(dp.amount ?? 0))}</td>
                            <td className="px-5 py-3 text-center">
                              <StatusBadge status={dp.status ?? "-"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/60 border-t border-slate-100">
                          <td colSpan={3} className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Total DP</td>
                          <td className="px-4 py-2.5 text-right font-bold text-navy-900">{formatRupiah(totalDPMade)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                  <Receipt size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Riwayat Pembayaran
                  </h3>
                </div>
                {historyLoading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Memuat data pembayaran...</div>
                ) : payments.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Belum ada pembayaran tercatat</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">No. Pembayaran</th>
                          <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Tanggal</th>
                          <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Metode</th>
                          <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400">Jumlah</th>
                          <th className="px-5 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p, idx) => (
                          <tr key={p.purchase_payment_id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3 font-mono font-semibold text-navy-700">{fmtPAY(p.payment_number ?? "")}</td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                            <td className="px-4 py-3 text-slate-600">{p.payment_method ?? "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatRupiah(Number(p.amount ?? 0))}</td>
                            <td className="px-5 py-3 text-center">
                              <StatusBadge status={p.status ?? "-"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/60 border-t border-slate-100">
                          <td colSpan={3} className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Total Pembayaran</td>
                          <td className="px-4 py-2.5 text-right font-bold text-navy-900">{formatRupiah(paymentPaid)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
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
