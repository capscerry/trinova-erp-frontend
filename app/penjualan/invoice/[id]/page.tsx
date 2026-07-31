"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Edit, Mail, Printer } from "lucide-react";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  FakturPenjualanModal,
  type FakturPenjualanFormData,
} from "@/components/modules/penjualan/faktur_penjualan/FakturPenjualanModal";
import { SendInvoiceEmailModal } from "@/components/modules/penjualan/SendInvoiceEmailModal";
import {
  salesInvoiceService,
  type SalesInvoiceFullDetail,
} from "@/lib/services/sales-invoice.service";
import { generateInvoicePdf } from "@/lib/pdf/invoicePdf";
import { notify } from "@/lib/notify";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-xl border border-slate-100 bg-white" />
      <div className="h-64 animate-pulse rounded-xl border border-slate-100 bg-white" />
    </div>
  );
}

export default function SalesInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<SalesInvoiceFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    salesInvoiceService
      .getFullDetailById(id)
      .then(setData)
      .catch((err) => {
        console.error("Gagal memuat detail faktur:", err);
        setError("Gagal memuat detail faktur penjualan.");
      })
      .finally(() => setLoading(false));
  };

  const grossTotal = useMemo(
    () => data?.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0) ?? 0,
    [data]
  );

  const handleRecordPayment = () => {
    if (!data) return;

    const params = new URLSearchParams({
      customerId: String(data.customerId),
      pelanggan: data.customerName ?? "",
      nilaiPembayaran: String(data.remainingAmount || data.grandTotal || 0),
      salesInvoiceId: String(data.id),
    });

    if (data.salesOrderId) {
      params.set("salesOrderId", String(data.salesOrderId));
    }

    router.push(`/penjualan/penerimaan-penjualan?${params.toString()}`);
  };

  const editInitialData: Partial<FakturPenjualanFormData> | undefined = data
    ? {
        id: data.id,
        customerId: data.customerId,
        pelanggan: data.customerName,
        noFaktur: data.invoiceNumber,
        noFakturMode: "manual",
        tanggal: data.invoiceDate?.slice(0, 10) ?? "",
        jatuhTempo: data.dueDate?.slice(0, 10) ?? "",
        salesOrderId: data.salesOrderId,
        noSo: data.salesOrderNumber,
        deliveryOrderId: data.deliveryOrderId,
        noPengiriman: data.deliveryOrderNumber,
        noPO: "",
        alamat: "",
        keterangan: data.notes,
        kenaPajak: Number(data.taxTotal || 0) > 0,
        uangMuka: data.downPaymentAmount,
        biayaKirim: data.shippingCost,
        items: data.items.map((item) => ({
          id: String(item.id),
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName || item.description,
          uomId: item.uomId,
          satuan: item.uomName,
          qty: item.quantity,
          harga: item.price,
          diskon: item.discount,
        })),
      }
    : undefined;

  const handleEditSubmit = async () => {
    setEditModalOpen(false);
    notify.success("Sales Invoice berhasil diperbarui");
    await fetchData();
  };

  const handleSendEmail = async (message: string) => {
    if (!data) throw new Error("Data faktur belum siap.");

    try {
      // 1. Render halaman Print di luar layar → tangkap jadi file PDF
      //    (byte-for-byte sama dengan yang tampil di /print).
      const pdf = await generateInvoicePdf(data);

      // 2. Kirim ke backend sebagai lampiran base64.
      const msg = await salesInvoiceService.sendEmail(id, message, {
        base64: pdf.base64,
        fileName: pdf.fileName,
      });

      setEmailModalOpen(false);
      notify.success("Email faktur terkirim", msg);
    } catch (err) {
      // Dilempar ulang supaya modal tetap terbuka dan menampilkan error-nya
      // sendiri — baik kegagalan generate PDF maupun kegagalan kirim email.
      throw err;
    }
  };

  return (
    <AppShell title="Detail Faktur Penjualan" subtitle="Rincian tagihan pelanggan">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/penjualan/invoice")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft size={15} />
          Kembali
        </button>
        {data && (
          <div className="flex items-center gap-2">
            {data.remainingAmount > 0 && (
              <button
                type="button"
                onClick={handleRecordPayment}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <CreditCard size={15} />
                Record Payment
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <Edit size={15} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setEmailModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-100"
            >
              <Mail size={15} />
              Kirim Email
            </button>
            <button
              type="button"
              onClick={() => window.open(`/penjualan/invoice/${id}/print`, "_blank")}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-gold-400 transition-colors hover:bg-navy-700"
            >
              <Printer size={15} />
              Print PDF
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error || !data ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-600">
          {error || "Data faktur tidak ditemukan."}
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Info label="No Faktur" value={data.invoiceNumber} />
              <Info label="Tanggal" value={formatDate(data.invoiceDate)} />
              <Info label="Jatuh Tempo" value={formatDate(data.dueDate)} />
              <Info label="Status" value={<StatusBadge status={data.status} />} />
              <Info label="Pelanggan" value={data.customerName || "-"} />
              <Info label="Sales Order" value={data.salesOrderNumber || "-"} />
              <Info label="Pengiriman" value={data.deliveryOrderNumber || "-"} />
              <Info label="Sisa Tagihan" value={formatRupiah(data.remainingAmount)} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-800">Detail Barang</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 text-left">Barang</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-left">Satuan</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-right">Diskon</th>
                    <th className="px-4 py-3 text-right">PPN</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item) => (
                    <tr key={item.id} className="text-sm text-slate-700">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{item.productName || item.description}</p>
                        <p className="text-xs text-slate-400">{item.productCode || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3">{item.uomName || "-"}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(item.price)}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(item.discount)}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(item.tax)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Catatan</p>
              <p className="mt-2 text-sm text-slate-600">{data.notes || "-"}</p>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
              <Summary label="Total Barang" value={formatRupiah(grossTotal)} />
              <Summary label="Diskon" value={formatRupiah(data.discountTotal)} />
              <Summary label="PPN" value={formatRupiah(data.taxTotal)} />
              <Summary label="Uang Muka" value={formatRupiah(data.downPaymentAmount)} />
              <Summary label="Biaya Kirim" value={formatRupiah(data.shippingCost)} />
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-navy-900">
                <span>Total Faktur</span>
                <span>{formatRupiah(data.grandTotal)}</span>
              </div>
            </div>
          </section>
        </div>
      )}

      <FakturPenjualanModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        initialData={editInitialData}
      />

      {data && (
        <SendInvoiceEmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          onSend={handleSendEmail}
          invoiceNumber={data.invoiceNumber}
          customerName={data.customerName}
          customerEmail={data.customerEmail}
        />
      )}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}
