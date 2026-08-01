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
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPurchaseDownPaymentById } from "@/lib/services/purchase-down-payment.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DPData {
  purchase_down_payment_id?: number;
  dp_number: string;
  po_number: string;
  supplier_name?: string;
  payment_date: string;
  payment_type?: string;
  amount: number;
  po_total?: number;
  status?: string;
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

const fmtDP = (raw: string | number) => {
  const str = String(raw ?? "");
  const digits = str.replace(/^DP-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `DP-${digits.padStart(10, "0")}`;
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

export default function PurchaseDownPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<DPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getPurchaseDownPaymentById(Number(id));
      setData(result);
    } catch (err) {
      console.error("Gagal memuat detail Purchase Down Payment:", err);
      setError("Gagal memuat data Down Payment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = data?.status ?? "Recorded";
  const amount = Number(data?.amount ?? 0);
  const poTotal = Number(data?.po_total ?? 0);
  const outstanding = Math.max(0, poTotal - amount);

  return (
    <AppShell
      title="Detail Purchase Down Payment"
      subtitle={data ? `#${fmtDP(data.dp_number)}` : "Memuat..."}
    >
      {/* Back + actions — no-print agar tidak ikut di PDF */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/pembelian/pdp")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/pembelian/pdp/${id}/print`, "_blank")}
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
            onClick={() => router.push("/pembelian/pdp")}
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
                  {fmtDP(data.dp_number)}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal Bayar: {formatDate(data.payment_date)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Uang Muka Dibayar",
                value: formatRupiah(amount),
                sub: data.payment_type || "Down payment",
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: "Total Nilai PO",
                value: formatRupiah(poTotal),
                sub: data.po_number ? `PO ${data.po_number}` : "Purchase Order terkait",
                icon: FileText,
              },
              {
                label: "Sisa PO",
                value: formatRupiah(outstanding),
                sub: "Outstanding setelah DP",
                icon: Wallet,
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
                Informasi Down Payment
              </h3>
              <InfoRow label="No. DP" value={fmtDP(data.dp_number)} icon={Hash} />
              <InfoRow label="Tanggal Bayar" value={formatDate(data.payment_date)} icon={Calendar} />
              <InfoRow label="Nomor PO" value={data.po_number || "—"} icon={FileText} />
              <InfoRow label="Supplier" value={data.supplier_name} icon={Building2} />
              <InfoRow label="Metode Pembayaran" value={data.payment_type || "—"} icon={CreditCard} />
              <InfoRow label="Nomor Faktur Pajak" value={data.nomor_faktur_pajak || "—"} icon={FileText} />
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
                    ...(poTotal > 0 ? [{ label: "Total Nilai PO", value: formatRupiah(poTotal) }] : []),
                    { label: "Uang Muka Dibayar", value: formatRupiah(amount), strong: true },
                    ...(poTotal > 0 ? [{ label: "Sisa PO (Outstanding)", value: formatRupiah(outstanding) }] : []),
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

              {(data.notes || data.transaction_detail || data.transaction_name) && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <FileText size={14} className="text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Catatan
                    </h3>
                  </div>
                  <div className="px-5 py-4 text-sm text-slate-600">
                    {data.notes || data.transaction_detail || data.transaction_name}
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
