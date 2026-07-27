"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout";
import { StatusBadge } from "@/components/ui";
import {
  salesReturnService,
  type SalesReturnFullDetail,
} from "@/lib/services/sales-return.service";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export default function RetourPenjualanDetailPage() {
  const router = useRouter();
  const id = useParams()?.id as string;
  const [data, setData] = useState<SalesReturnFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    salesReturnService
      .getDetailById(id)
      .then(setData)
      .catch(() => setError("Gagal memuat detail retur penjualan."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell title="Detail Retur Penjualan" subtitle="Rincian retur barang dari pelanggan">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/penjualan/retur")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={15} /> Kembali
        </button>
        {data && <StatusBadge status={data.status} />}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-400">Memuat detail...</div>
      ) : error || !data ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-600">{error || "Data tidak ditemukan."}</div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Info label="No Retur" value={data.noRetur} />
              <Info label="Tanggal Retur" value={formatDate(data.tanggal)} />
              <Info label="Pelanggan" value={data.pelanggan || "-"} />
              <Info label="No Delivery Order" value={data.noSuratJalan || "-"} />
              <Info label="No SO" value={data.noSo || "-"} />
              <Info label="Keterangan" value={data.keterangan || "-"} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-800">Detail Barang Diretur</h2>
            </div>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Barang</th>
                  <th className="px-4 py-3 text-left">Gudang</th>
                  <th className="px-4 py-3 text-left">Satuan</th>
                  <th className="px-4 py-3 text-right">Qty Retur</th>
                  <th className="px-4 py-3 text-left">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item, idx) => (
                  <tr key={`${item.productId}-${idx}`} className="text-sm text-slate-700">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-xs text-slate-400">{item.productCode || "-"}</p>
                    </td>
                    <td className="px-4 py-3">{item.warehouseName || "-"}</td>
                    <td className="px-4 py-3">{item.satuan || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{item.qty}</td>
                    <td className="px-4 py-3">{item.reason || "-"}</td>
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
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
