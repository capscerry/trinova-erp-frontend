"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { AppShell } from "@/components/layout";
import {
  pengirimanPenjualanService,
  type PengirimanPenjualanFullDetail,
} from "@/lib/services/pengiriman-penjualan.service";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export default function PengirimanDetailPage() {
  const router = useRouter();
  const id = useParams()?.id as string;
  const [data, setData] = useState<PengirimanPenjualanFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    pengirimanPenjualanService
      .getFullDetailById(id)
      .then(setData)
      .catch(() => setError("Gagal memuat detail pengiriman."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell title="Detail Pengiriman Pesanan" subtitle="Rincian surat jalan pelanggan">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button onClick={() => router.push("/penjualan/pengiriman-penjualan")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <ArrowLeft size={15} /> Kembali
        </button>
        {data && (
          <button onClick={() => window.open(`/penjualan/pengiriman-penjualan/${id}/print`, "_blank")} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-gold-400 hover:bg-navy-700">
            <Printer size={15} /> Print PDF
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-400">Memuat detail...</div>
      ) : error || !data ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-600">{error || "Data tidak ditemukan."}</div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Info label="No Surat Jalan" value={data.noSuratJalan} />
              <Info label="Tanggal Kirim" value={formatDate(data.tanggalKirim)} />
              <Info label="Pelanggan" value={data.pelanggan || "-"} />
              <Info label="No SO" value={data.noSo || "-"} />
              <Info label="No PO" value={data.noPO || "-"} />
              <Info label="Tipe Pengiriman" value={data.shippingType || "-"} />
              <Info label="Alamat" value={data.alamatPengiriman || "-"} />
              <Info label="Keterangan" value={data.keterangan || "-"} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-800">Detail Barang Dikirim</h2>
            </div>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Barang</th>
                  <th className="px-4 py-3 text-left">Satuan</th>
                  <th className="px-4 py-3 text-right">Qty Pesan</th>
                  <th className="px-4 py-3 text-right">Qty Kirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={`${item.productId}-${item.productCode}`} className="text-sm text-slate-700">
                    <td className="px-4 py-3"><p className="font-semibold">{item.productName}</p><p className="text-xs text-slate-400">{item.productCode || "-"}</p></td>
                    <td className="px-4 py-3">{item.satuan || "-"}</td>
                    <td className="px-4 py-3 text-right">{item.qtyDipesan}</td>
                    <td className="px-4 py-3 text-right font-semibold">{item.qtyDikirim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>;
}
