"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import {
  ArrowLeft,
  Printer,
  Edit,
  Mail,
  Package,
  Calendar,
  Hash,
  User,
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import {
  salesQuotationService,
  type SalesQuotationDetail,
  type SalesQuotationFormData,
  type QuotationItem,
} from "@/lib/services/penjualan.service";
import { SalesQuotationModal } from "@/components/modules/penjualan/SalesQuotationModal";
import { SendQuotationEmailModal } from "@/components/modules/penjualan/SendQuotationEmailModal";
import { generateQuotationPdf } from "@/lib/pdf/quotationPdf";

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

export default function SalesQuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<SalesQuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const result = await salesQuotationService.getFullDetailById(id);
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data Penawaran Penjualan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const handleSendEmail = async (message: string) => {
    if (!data) throw new Error("Data penawaran belum siap.");

    try {
      // 1. Render halaman Cetak/PDF di luar layar → tangkap jadi file PDF
      //    (byte-for-byte sama dengan yang tampil di /print).
      const pdf = await generateQuotationPdf(data);

      // 2. Kirim ke backend sebagai lampiran base64.
      const msg = await salesQuotationService.sendEmail(id, message, {
        base64: pdf.base64,
        fileName: pdf.fileName,
      });

      setEmailModalOpen(false);
      setBanner({ type: "success", msg });
      // Backend sekarang menandai quotation Draft -> Sent begitu email
      // terkirim -- refresh supaya badge status di halaman ini ikut update
      // tanpa perlu reload manual.
      fetchData();
    } catch (err) {
      // Dilempar ulang supaya modal (yang menampilkan error di dalam dirinya
      // sendiri) tetap terbuka dan menunjukkan pesan kegagalan ke user —
      // baik kegagalan saat generate PDF maupun saat kirim email.
      throw err;
    }
  };

  // Konversi SalesQuotationDetail (hasil GET) → SalesQuotationFormData
  // (bentuk yang dipakai modal create/edit). productId/uomId per item
  // SUDAH tersedia dari API (lihat SalesQuotationDetail.items), jadi
  // disertakan di sini supaya tidak hilang saat submit ulang.
  const toFormData = (detail: SalesQuotationDetail): SalesQuotationFormData => ({
    id: detail.id,
    nomor: detail.nomor,
    tanggal: detail.tanggal?.split("T")[0] ?? detail.tanggal,
    customerId: detail.customerId,
    dipesanOleh: detail.pelanggan,
    address: detail.alamat ?? "",
    keterangan: detail.keterangan ?? "",
    kenaPajak: detail.kenaPajak,
    items: (detail.items ?? []).map((it): QuotationItem => ({
      id: crypto.randomUUID(),
      productId: it.productId,
      uomId: it.uomId,
      produk: it.productName,
      deskripsi: "",
      qty: it.qty,
      satuan: it.satuan,
      harga: it.harga,
      diskon: it.discountPercent,
      subtotal: it.totalHarga,
    })),
  });

  const handleEditSubmit = async (formData: SalesQuotationFormData) => {
    // Formula sama dengan saat create (lihat app/penjualan/quotation/page.tsx):
    //   subtotal      = Σ (harga × qty)            — sebelum diskon & pajak
    //   discountTotal = Σ (harga × qty × diskon%)
    //   taxableBase   = subtotal − discountTotal
    //   taxTotal      = taxableBase × 11% (jika kenaPajak)
    //   subtotal yang dikirim = taxableBase + taxTotal (= grand total final)
    const grossAmount = formData.items.reduce((s, i) => s + i.harga * i.qty, 0);
    const discountTotal = formData.items.reduce(
      (s, i) => s + i.harga * i.qty * (i.diskon / 100),
      0
    );
    const taxableBase = grossAmount - discountTotal;
    const taxTotal = formData.kenaPajak ? taxableBase * 0.11 : 0;
    const subtotal = taxableBase + taxTotal;

    const payload = {
      // Menyertakan id → backend akan UPDATE record ini (upsert),
      // bukan membuat quotation baru.
      id: formData.id,
      customerId: formData.customerId ?? 0,
      quotationNumber: formData.nomor,
      quotationDate: formData.tanggal,
      address: formData.address || "",
      notes: formData.keterangan || "",
      isTaxAble: formData.kenaPajak,
      isTaxIncluded: formData.kenaPajak,
      subtotal,
      discountTotal,
      taxTotal,
      details: formData.items.map((item) => {
        const lineGross = item.harga * item.qty;
        const discountAmount = lineGross * (item.diskon / 100);
        return {
          productId: item.productId ?? 0,
          quantity: item.qty,
          uomId: item.uomId ?? 0,
          price: item.harga,
          discountPercent: item.diskon,
          discountAmount,
        };
      }),
    };

    try {
      await salesQuotationService.create(payload);
      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Gagal menyimpan perubahan:", err);
      notify.error("Gagal menyimpan perubahan Penawaran Penjualan");
    }
  };

  // ── Breakdown untuk tampilan ──────────────────────────
  // Semua nilai (subtotal final, discountTotal, taxTotal) datang LANGSUNG
  // dari API — tidak ada kalkulasi pajak/diskon manual di frontend.
  //   grossAmount = subtotal final + discountTotal − taxTotal
  //               = nilai SEBELUM diskon & pajak (titik awal breakdown)
  const grandTotal = data?.subtotal ?? 0;
  const grossAmount = data ? data.subtotal + data.discountTotal - data.taxTotal : 0;
  const totalQty = data?.items?.reduce((s, i) => s + i.qty, 0) ?? 0;

  return (
    <AppShell
      title="Detail Penawaran Penjualan"
      subtitle={data ? `#${data.nomor}` : "Memuat..."}
    >
      {/* Back + actions — no-print agar tidak ikut di PDF */}
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/penjualan/quotation")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500
                     hover:text-navy-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Daftar
        </button>

        {data && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/penjualan/quotation/${id}/print`, "_blank")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Printer size={13} /> Cetak / PDF
            </button>
            <button
              onClick={() => setEmailModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         bg-navy-50 text-navy-700 border border-navy-200 hover:bg-navy-100 transition-colors"
            >
              <Mail size={13} /> Kirim Email
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

      {/* Banner sukses/gagal kirim email — auto-dismiss 4 detik */}
      {banner && (
        <div
          className={cn(
            "no-print fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold",
            banner.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-red-600 text-white shadow-red-600/30"
          )}
        >
          {banner.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {banner.msg}
        </div>
      )}

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <AlertCircle size={36} className="text-red-300" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => router.push("/penjualan/quotation")}
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
                  {data.nomor}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tanggal Penawaran: {formatDate(data.tanggal)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Total Penawaran",
                value: formatRupiah(grandTotal),
                sub: `${data.items?.length ?? 0} item produk`,
                icon: TrendingUp,
                highlight: true,
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
                Informasi Penawaran
              </h3>
              <InfoRow label="Nomor SQ"      value={data.nomor}              icon={Hash} />
              <InfoRow label="Tanggal"       value={formatDate(data.tanggal)} icon={Calendar} />
              <InfoRow label="Pelanggan"     value={data.pelanggan}           icon={User} />
              {data.keterangan && (
                <InfoRow label="Keterangan"  value={data.keterangan}          icon={FileText} />
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
                            <th className="px-5 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[28%]">
                              Produk
                            </th>
                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400 w-[10%]">
                              Qty
                            </th>
                            <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[10%]">
                              Satuan
                            </th>
                            <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[16%]">
                              Harga Satuan
                            </th>
                            <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[12%]">
                              Diskon
                            </th>
                            <th className="px-5 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[24%]">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-slate-700">
                                  {item.productName}
                                </p>
                                {item.productCode && (
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {item.productCode}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                                {item.qty}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {item.satuan}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {formatRupiah(item.harga)}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-400">
                                {item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800">
                                {formatRupiah(item.totalHarga)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Ringkasan: Subtotal → Diskon → Pajak → Total */}
                    {/* Semua nilai (subtotal, discountTotal, taxTotal) berasal
                        langsung dari API — tidak ada kalkulasi 11% manual. */}
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
                          {data.kenaPajak && (
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

      {/* Modal Edit — Nomor & Customer dibuat readonly di dalam modal */}
      {data && (
        <SalesQuotationModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditSubmit}
          initialData={toFormData(data)}
        />
      )}

      {data && (
        <SendQuotationEmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          onSend={handleSendEmail}
          quotationNumber={data.nomor}
          customerName={data.pelanggan}
          customerEmail={data.pelangganEmail}
        />
      )}
    </AppShell>
  );
}