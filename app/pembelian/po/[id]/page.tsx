"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  ArrowLeft,
  Printer,
  Download,
  Building2,
  Package,
  Calendar,
  Hash,
  FileText,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import {
  getPurchaseOrderPrintDetail,
  type PurchaseOrderPrintDetail,
} from "@/lib/services/purchase-order-print.service";
import { generatePurchaseOrderPdf } from "@/lib/pdf/purchaseOrderPdf";

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

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<PurchaseOrderPrintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"items" | "order">("items");
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getPurchaseOrderPrintDetail(Number(id));
      setData(result);
    } catch (err) {
      console.error("Gagal memuat detail Purchase Order:", err);
      setError("Gagal memuat data Purchase Order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Downloads the SAME official template used for "Kirim Email" and the
  // print page — keeps every PO PDF visually identical everywhere.
  const handleDownloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { blob, fileName } = await generatePurchaseOrderPdf(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify.success("PDF berhasil diunduh");
    } catch (err) {
      console.error("[PDF Export Error – PurchaseOrder]", err);
      notify.error(
        "Gagal mengekspor PDF",
        err instanceof Error ? err.message : "Silakan coba lagi"
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const header = data?.header;
  const items = data?.details ?? [];
  const status = header?.status ?? "Draft";
  const grandTotal = header?.total_amount ?? 0;
  const totalQty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const subtotal = items.reduce((s, i) => s + (i.subtotal ?? 0), 0);
  const taxAmount = header?.tax_amount ?? 0;

  return (
    <AppShell
      title="Detail Purchase Order"
      subtitle={header ? `#${header.po_number}` : "Memuat..."}
    >
      {/* Back + actions — no-print agar tidak ikut di PDF */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/pembelian/po")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/pembelian/po/${id}/print`, "_blank")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Printer size={13} /> Cetak
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         bg-navy-900 text-gold-400 hover:bg-navy-800 disabled:opacity-50
                         disabled:cursor-not-allowed transition-colors"
            >
              <Download size={13} /> {pdfLoading ? "Membuat PDF..." : "Download PDF"}
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
            onClick={() => router.push("/pembelian/po")}
            className="text-xs text-navy-700 underline"
          >
            Kembali ke daftar
          </button>
        </div>
      ) : data && header ? (
        <div id="print-area" className="space-y-4">
          {/* ── Header Banner ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-navy-900 font-mono tracking-tight">
                  {header.po_number}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal Order: {formatDate(header.order_date)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Purchase Order",
                value: formatRupiah(grandTotal),
                sub: `${items.length} item produk`,
                icon: TrendingUp,
                highlight: true,
              },
              {
                label: "Tanggal Diharapkan",
                value: formatDate(header.expected_date),
                sub: "Estimasi barang tiba",
                icon: Calendar,
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
                Informasi Purchase Order
              </h3>
              <InfoRow label="Nomor PO" value={header.po_number} icon={Hash} />
              <InfoRow label="Tanggal Order" value={formatDate(header.order_date)} icon={Calendar} />
              <InfoRow label="Tanggal Diharapkan" value={formatDate(header.expected_date)} icon={Calendar} />
              <InfoRow label="Supplier" value={data.supplier?.supplier_name} icon={Building2} />
              <InfoRow label="Nomor Faktur Pajak" value={header.nomor_faktur_pajak || "—"} icon={FileText} />
              {header.transaction_name && (
                <InfoRow label="Nama Transaksi" value={header.transaction_name} icon={FileText} />
              )}
            </div>

            {/* Right side */}
            <div className="col-span-2 space-y-4">
              <div className="no-print flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {[
                  { id: "items", label: "Detail Produk", icon: Package },
                  { id: "order", label: "Informasi Purchase Order", icon: FileText },
                ].map(({ id: tabId, label, icon: Icon }) => (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => setActiveTab(tabId as "items" | "order")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                      activeTab === tabId
                        ? "bg-navy-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                    )}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Detail Items Table */}
              {activeTab === "items" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                    <Package size={14} className="text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Detail Produk
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
                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="font-semibold text-slate-700">
                                    {item.productName || `Produk #${item.productId}`}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {item.uomCode || "—"}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                  {formatRupiah(item.price)}
                                </td>
                                <td className="px-5 py-3 text-right font-bold text-slate-800">
                                  {formatRupiah(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Ringkasan: Subtotal → Pajak → Total */}
                      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40">
                        <div className="flex justify-end">
                          <div className="w-72 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Subtotal</span>
                              <span className="font-semibold text-slate-700">
                                {formatRupiah(subtotal)}
                              </span>
                            </div>
                            {taxAmount > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">
                                  Pajak{header.tax_percentage ? ` (${header.tax_percentage}%)` : ""}
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {formatRupiah(taxAmount)}
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
              )}

              {/* Informasi Purchase Order */}
              {activeTab === "order" && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <FileText size={14} className="text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Informasi Purchase Order
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 px-5 py-2">
                    {[
                      { label: "Subtotal", value: formatRupiah(subtotal) },
                      {
                        label: `Pajak${header.tax_percentage ? ` (${header.tax_percentage}%)` : ""}`,
                        value: formatRupiah(taxAmount),
                      },
                      { label: "Total", value: formatRupiah(grandTotal), strong: true },
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
                    {header.transaction_detail && (
                      <div className="py-3 text-sm">
                        <span className="text-slate-500 block mb-1">Detail Transaksi</span>
                        <span className="font-semibold text-slate-700">
                          {header.transaction_detail}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Supplier card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                  <Building2 size={14} className="text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Supplier
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 px-5 py-2">
                  <InfoRow label="Nama Supplier" value={data.supplier?.supplier_name} icon={Building2} />
                  <InfoRow label="Kode Supplier" value={data.supplier?.supplier_code} icon={Hash} />
                  <InfoRow label="Telepon" value={data.supplier?.no_telp_bisnis} />
                  <InfoRow label="Email" value={data.supplier?.email} />
                  <InfoRow label="Alamat" value={data.supplier?.alamat} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
