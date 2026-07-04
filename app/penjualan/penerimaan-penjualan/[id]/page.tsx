"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Printer } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PenerimaanModal } from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanModal";
import type { PenerimaanFormData } from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanPenjualanType";
import {
  penerimaanPenjualanService,
  type PenerimaanPenjualan,
} from "@/lib/services/penjualan.service";
import { notify } from "@/lib/notify";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export default function PenerimaanDetailPage() {
  const router = useRouter();
  const id = useParams()?.id as string;
  const [data, setData] = useState<PenerimaanPenjualan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    penerimaanPenjualanService
      .getById(id)
      .then(setData)
      .catch(() => setError("Gagal memuat detail penerimaan."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const editInitialData: Partial<PenerimaanFormData> | undefined = data
    ? {
        id: data.id,
        customerId: data.customerId,
        pelanggan: data.pelanggan,
        bankId: data.bankId,
        bank: data.bank,
        nilaiPembayaran: data.nilaiPembayaran,
        tanggalBayar: data.tanggalBayar?.slice(0, 10) ?? "",
        noBukti: data.noBukti,
        noBuktiMode: "manual",
        uangMukaId: data.uangMukaId,
        salesOrderId: data.salesOrderId,
        salesInvoiceId: data.salesInvoiceId,
      }
    : undefined;

  const handleEditSubmit = async () => {
    setEditModalOpen(false);
    notify.success("Sales Receipt berhasil diperbarui");
    await loadData();
  };

  return (
    <AppShell title="Detail Penerimaan Penjualan" subtitle="Rincian pembayaran pelanggan">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button onClick={() => router.push("/penjualan/penerimaan-penjualan")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <ArrowLeft size={15} /> Kembali
        </button>
        {data && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
              <Edit size={15} /> Edit
            </button>
            <button onClick={() => window.open(`/penjualan/penerimaan-penjualan/${id}/print`, "_blank")} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-gold-400 hover:bg-navy-700">
              <Printer size={15} /> Print PDF
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-400">Memuat detail...</div>
      ) : error || !data ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-600">{error || "Data tidak ditemukan."}</div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Info label="No Bukti" value={data.noBukti} />
            <Info label="Tanggal Bayar" value={formatDate(data.tanggalBayar)} />
            <Info label="Pelanggan" value={data.pelanggan || "-"} />
            <Info label="Bank" value={data.bank || "-"} />
            <Info label="Nilai Pembayaran" value={formatRupiah(data.nilaiPembayaran)} />
            <Info
              label="Referensi SO"
              value={data.salesOrderNumber || (data.salesOrderId ? String(data.salesOrderId) : "-")}
            />
            <Info
              label="Referensi Uang Muka"
              value={data.uangMukaNumber || (data.uangMukaId ? String(data.uangMukaId) : "-")}
            />
          </div>
        </section>
      )}

      <PenerimaanModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        initialData={editInitialData}
      />
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>;
}
