"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import {
  ArrowLeft,
  Printer,
  CreditCard,
  MapPin,
  Calendar,
  Hash,
  User,
  FileText,
  AlertCircle,
  TrendingUp,
  Receipt,
  BadgePercent,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uangMukaService,
  type UangMuka,
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
      <div className="grid grid-cols-3 gap-4">
        <div className="h-64 bg-slate-100 rounded-xl" />
        <div className="col-span-2 h-64 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UangMukaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<UangMuka | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const result = await uangMukaService.getById(id);
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data Uang Muka");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <AppShell
      title="Detail Uang Muka"
      subtitle={data ? `#${data.noFaktur}` : "Memuat..."}
    >
      {/* Back + Actions */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/penjualan/uang-muka")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                window.open(`/penjualan/uang-muka/${id}/print`, "_blank")
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Printer size={13} /> Cetak
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
            onClick={() => router.push("/penjualan/uang-muka")}
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
                  {data.noFaktur}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal: {formatDate(data.tanggal)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                  Faktur Uang Muka
                </span>
              </div>
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Uang Muka",
                value: formatRupiah(data.nominalUangMuka ?? 0),
                sub: "Nominal yang dibayar",
                icon: CreditCard,
                highlight: true,
              },
              {
                label: "Total Tagihan",
                value: formatRupiah(data.totalAmount ?? 0),
                sub: "Termasuk pajak",
                icon: TrendingUp,
              },
              {
                label: "Pajak (PPN)",
                value: formatRupiah(data.taxAmount ?? 0),
                sub: data.isTaxable ? "Kena pajak" : "Tidak kena pajak",
                icon: BadgePercent,
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
                Informasi Faktur
              </h3>
              <InfoRow label="No Faktur"        value={data.noFaktur}                  icon={Hash} />
              <InfoRow label="Tanggal"          value={formatDate(data.tanggal)}        icon={Calendar} />
              <InfoRow label="Pelanggan"        value={data.customerName}              icon={User} />
              <InfoRow label="No PO"            value={data.noPO || "—"}               icon={FileText} />
              <InfoRow label="No Sales Order"   value={data.nomorSo || "—"}            icon={Receipt} />
              <InfoRow label="Syarat Pembayaran" value={data.syaratPembayaran || "—"}  icon={Landmark} />
              <InfoRow label="Alamat"           value={data.alamat || "—"}             icon={MapPin} />
              {data.keterangan && (
                <InfoRow label="Keterangan"     value={data.keterangan}               icon={FileText} />
              )}
            </div>

            {/* Ringkasan Pembayaran */}
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <CreditCard size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Ringkasan Pembayaran
                  </h3>
                </div>

                <div className="p-5 space-y-0">
                  {[
                    {
                      label: "Nominal Uang Muka",
                      value: formatRupiah(data.nominalUangMuka ?? 0),
                      bold: false,
                    },
                    {
                      label: "Pajak (PPN)",
                      value: formatRupiah(data.taxAmount ?? 0),
                      bold: false,
                    },
                    {
                      label: "Total Tagihan",
                      value: formatRupiah(data.totalAmount ?? 0),
                      bold: true,
                    },
                  ].map(({ label, value, bold }) => (
                    <div
                      key={label}
                      className={cn(
                        "flex justify-between items-center py-3 border-b border-slate-100 last:border-0",
                        bold && "border-t-2 border-t-slate-200 mt-1"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm text-slate-600",
                          bold && "font-bold text-slate-800"
                        )}
                      >
                        {label}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold text-slate-800",
                          bold && "text-base font-bold text-navy-900"
                        )}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Flag pajak */}
                <div className="px-5 pb-4 flex items-center gap-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                      data.isTaxable
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <BadgePercent size={11} />
                    {data.isTaxable ? "Kena Pajak" : "Tidak Kena Pajak"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                      data.isTaxIncluded
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {data.isTaxIncluded ? "Harga Termasuk Pajak" : "Harga Belum Termasuk Pajak"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}