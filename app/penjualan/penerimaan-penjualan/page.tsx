"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { PenerimaanModal } from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanModal";
import {
  type PenerimaanFormData,
  type PenerimaanRow,
  DUMMY_PENERIMAAN_LIST,
} from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanPenjualanType";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);

const formatDate = (d?: string | null) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const COLUMNS: Column<PenerimaanRow>[] = [
  { key: "noBukti", label: "No Bukti", width: "16%" },
  {
    key: "tanggalBayar",
    label: "Tanggal Bayar",
    width: "14%",
    render: (_v, row) => formatDate(row.tanggalBayar),
  },
  { key: "pelanggan", label: "Terima dari", width: "26%" },
  { key: "bank", label: "Bank", width: "26%" },
  {
    key: "nilaiPembayaran",
    label: "Nilai Pembayaran",
    width: "18%",
    render: (_v, row) => formatRupiah(row.nilaiPembayaran),
  },
];

export default function PenerimaanPenjualanPage() {
  const router = useRouter();

  // Sementara pakai dummy data — nanti diganti fetch dari API
  const [data, setData] = useState<PenerimaanRow[]>(DUMMY_PENERIMAAN_LIST);
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<Partial<PenerimaanFormData> | undefined>(undefined);

  const handleTambah = () => {
    setInitialFormData(undefined);
    setModalOpen(true);
  };

  const handleDetail = (row: PenerimaanRow) => {
    // TODO: arahkan ke halaman detail saat sudah dibuat
    console.log("Lihat detail:", row);
  };

  const handleModalSubmit = (formData: PenerimaanFormData) => {
    // Sementara: tambahkan langsung ke state lokal (belum hit API)
    setData((prev) => [
      {
        id: prev.length + 1,
        noBukti: formData.noBukti,
        tanggalBayar: formData.tanggalBayar,
        pelanggan: formData.pelanggan,
        bank: formData.bank,
        nilaiPembayaran: formData.nilaiPembayaran,
      },
      ...prev,
    ]);
    setModalOpen(false);
    setMessage("Penerimaan penjualan berhasil disimpan (sementara, belum ke backend)");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <AppShell title="Penerimaan Penjualan" subtitle="Kelola pembayaran yang diterima dari pelanggan">
      {message && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-semibold bg-green-100 text-green-700 border border-green-300">
          {message}
        </div>
      )}

      <DataTable
        title="Daftar Penerimaan Penjualan"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Tambah Penerimaan"
        onAdd={handleTambah}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
        renderActions={(row) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleDetail(row)}
              title="Lihat Detail"
              className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors"
            >
              <Eye size={15} />
            </button>
          </div>
        )}
      />

      <PenerimaanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={initialFormData}
      />
    </AppShell>
  );
}