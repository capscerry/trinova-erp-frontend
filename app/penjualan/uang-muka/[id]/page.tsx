"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import {
  ArrowLeft,
  Printer,
  Edit,
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
import {
  UangMukaModal,
  type UangMukaFormData,
} from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import { notify } from "@/lib/notify";

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

function calculateIncludedTax(amount: number) {
  if (amount <= 0) return 0;
  return Math.round(amount - amount / 1.11);
}

function getDownPaymentTaxView(data: UangMuka) {
  const nominal = Number(data.nominalUangMuka ?? 0);
  const storedTotal = Number(data.totalAmount ?? nominal);
  const storedTax = Number(data.taxAmount ?? 0);
  const isTaxable = Boolean(data.isTaxable);
  const isIncluded =
    Boolean(data.isTaxIncluded) ||
    (isTaxable && storedTax === 0 && storedTotal === nominal);
  const taxAmount = isTaxable
    ? storedTax > 0
      ? storedTax
      : isIncluded
        ? calculateIncludedTax(storedTotal)
        : 0
    : 0;
  const taxableBase = isIncluded ? storedTotal - taxAmount : nominal;
  const total = isIncluded ? storedTotal : nominal + taxAmount;

  return {
    nominal,
    total,
    taxableBase,
    taxAmount,
    isTaxable,
    isIncluded,
    note: isIncluded
      ? "Nominal uang muka sudah termasuk PPN 11%"
      : isTaxable
        ? "Nominal uang muka belum termasuk PPN"
        : "Uang muka tidak dikenakan PPN",
  };
}

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const taxSummary = data
    ? getDownPaymentTaxView(data)
    : {
        nominal: 0,
        total: 0,
        taxableBase: 0,
        taxAmount: 0,
        isTaxable: false,
        isIncluded: false,
        note: "",
      };

  const loadData = async () => {
    if (!id) return;
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const editInitialData: UangMukaFormData | undefined = data
    ? {
        id: data.id,
        customerId: data.customerId,
        pelanggan: data.customerName ?? "",
        noFaktur: data.noFaktur,
        noFakturMode: "manual",
        tanggal: data.tanggal?.slice(0, 10) ?? "",
        uangMuka: Number(data.nominalUangMuka ?? 0),
        noPO: data.noPO ?? "",
        kenaPajak: Boolean(data.isTaxable),
        totalTermasukPajak: Boolean(data.isTaxIncluded),
        syaratPembayaran: data.syaratPembayaran ?? "",
        alamat: data.alamat ?? "",
        keterangan: data.keterangan ?? "",
        fakturType: "Faktur Penjualan",
        noPesanan: data.nomorSo ?? "",
        totalHargaPesanan: Number(data.totalAmount ?? data.nominalUangMuka ?? 0),
      }
    : undefined;

  const handleEditSubmit = async () => {
    setEditModalOpen(false);
    notify.success("Sales Down Payment berhasil diperbarui");
    await loadData();
  };

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
            <button
              onClick={() => setEditModalOpen(true)}
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
                value: formatRupiah(taxSummary.nominal),
                sub: taxSummary.isIncluded
                  ? "Nominal dibayar, include PPN"
                  : "Nominal yang dibayar",
                icon: CreditCard,
                highlight: true,
              },
              {
                label: "Total Tagihan",
                value: formatRupiah(taxSummary.total),
                sub: taxSummary.note,
                icon: TrendingUp,
              },
              {
                label: "Pajak (PPN)",
                value: formatRupiah(taxSummary.taxAmount),
                sub: taxSummary.isTaxable ? "PPN 11%" : "Tidak kena pajak",
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
                      label: taxSummary.isIncluded
                        ? "Nominal Uang Muka Dibayar"
                        : "Nominal Uang Muka",
                      value: formatRupiah(taxSummary.nominal),
                      bold: false,
                    },
                    {
                      label: "DPP Uang Muka",
                      value: formatRupiah(taxSummary.taxableBase),
                      bold: false,
                    },
                    {
                      label: taxSummary.isIncluded
                        ? "PPN 11% Termasuk"
                        : "PPN 11%",
                      value: formatRupiah(taxSummary.taxAmount),
                      bold: false,
                    },
                    {
                      label: taxSummary.isIncluded
                        ? "Total Dibayar"
                        : "Total Tagihan",
                      value: formatRupiah(taxSummary.total),
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

                <div
                  className={cn(
                    "mx-5 mb-4 rounded-xl border px-4 py-3",
                    taxSummary.isIncluded
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      taxSummary.isIncluded ? "text-emerald-700" : "text-slate-600"
                    )}
                  >
                    {taxSummary.note}
                  </p>
                  {taxSummary.isIncluded && (
                    <p className="mt-1 text-[11px] text-emerald-600">
                      Breakdown: DPP {formatRupiah(taxSummary.taxableBase)} + PPN 11%{" "}
                      {formatRupiah(taxSummary.taxAmount)} ={" "}
                      {formatRupiah(taxSummary.total)}
                    </p>
                  )}
                </div>

                {/* Flag pajak */}
                <div className="px-5 pb-4 flex items-center gap-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                      taxSummary.isTaxable
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <BadgePercent size={11} />
                    {taxSummary.isTaxable ? "Kena Pajak" : "Tidak Kena Pajak"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                      taxSummary.isIncluded
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {taxSummary.isIncluded ? "Harga Termasuk Pajak" : "Harga Belum Termasuk Pajak"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <UangMukaModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        initialData={editInitialData}
      />
    </AppShell>
  );
}
