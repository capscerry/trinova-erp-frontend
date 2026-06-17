"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import {
  UangMukaModal,
  type UangMukaFormData,
} from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import type { Column } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { uangMukaService } from "@/lib/services/penjualan.service";
import { Eye } from "lucide-react";

export interface UangMuka {
  no: number;
  id: number;
  noFaktur: string;
  tanggal: string;
  pelanggan: string;
  uangMuka: number;
  kenaPajak: boolean;
  totalTermasukPajak: boolean;
  noPO: string;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
  fakturType: string;
  noPesanan: string;
  totalHargaPesanan: number;
  isActive: boolean;
}

const today = new Date().toLocaleDateString("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const COLUMNS: Column<UangMuka>[] = [
  { key: "noFaktur", label: "No Faktur", width: "160px" },
  { key: "tanggal", label: "Tanggal", width: "120px" },
  { key: "pelanggan", label: "Pelanggan" },
  { key: "noPesanan", label: "No SO", width: "140px" },
  {
    key: "uangMuka",
    label: "Uang Muka",
    width: "150px",
    render: (value: unknown) =>
      Number(value || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
  },
  {
    key: "isActive",
    label: "Status",
    width: "100px",
    render: (_: unknown, row: UangMuka) => (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          row.isActive
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {row.isActive ? "Aktif" : "Tidak Aktif"}
      </span>
    ),
  },
];

export default function UangMukaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<UangMuka[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<UangMukaFormData | undefined>();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await uangMukaService.getAll();
      setData(
        result.map((item, index) => ({
          no: index + 1,
          id: item.id ?? index + 1,
          noFaktur: item.noFaktur,
          tanggal: new Date(item.tanggal).toLocaleDateString("id-ID"),
          pelanggan: item.customerName ?? "",
          uangMuka: item.nominalUangMuka,
          kenaPajak: false,
          totalTermasukPajak: false,
          noPO: item.noPO ?? "",
          syaratPembayaran: item.syaratPembayaran ?? "",
          alamat: item.alamat ?? "",
          keterangan: item.keterangan ?? "",
          fakturType: "Faktur Penjualan",
          noPesanan: item.nomorSo ?? "",
          totalHargaPesanan: item.totalAmount ?? 0,
          isActive: true,
        }))
      );
    } catch (error) {
      console.error(error);
      showMessage("Gagal memuat data uang muka", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fromSalesOrder = searchParams.get("fromSalesOrder");
    if (!fromSalesOrder) return;

    const pelanggan = searchParams.get("pelanggan") ?? "";
    const noPesanan = searchParams.get("noPesanan") ?? "";
    const totalHargaPesanan = Number(searchParams.get("totalHargaPesanan") ?? 0);
    const alamat = searchParams.get("alamat") ?? "";
    const keterangan = searchParams.get("keterangan") ?? "";

    setEditData({
      id: 0,
      pelanggan,
      noFaktur: "",
      noFakturMode: "auto",
      tanggal: today,
      uangMuka: 0,
      noPO: "",
      kenaPajak: false,
      totalTermasukPajak: true,
      syaratPembayaran: "",
      alamat,
      keterangan,
      fakturType: "Faktur Penjualan",
      noPesanan,
      totalHargaPesanan,
    });

    setModalOpen(true);
  }, [searchParams]);

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const handleTambah = () => {
    setEditData(undefined);
    setModalOpen(true);
  };

  const handleDetail = (row: UangMuka) => {
    router.push(`/penjualan/uang-muka/${row.id}`);
  };

  // onSubmit dipanggil modal SETELAH create API berhasil. Modal sendiri
  // TIDAK menutup dirinya — hanya menampilkan status "tersimpan" dan
  // mengaktifkan tombol "Proses ke Penerimaan". Di sini kita cukup
  // menampilkan pesan sukses; data tabel akan di-refresh saat modal
  // benar-benar ditutup lewat handleModalClose di bawah.
  const handleSubmit = (formData: UangMukaFormData) => {
    showMessage(
      formData.id ? "Uang muka berhasil diperbarui" : "Uang muka berhasil ditambahkan",
      "success"
    );
  };

  // Dipanggil setiap kali modal ditutup — baik lewat tombol X, "Batal",
  // "Tutup", maupun klik backdrop. Selalu refetch dari server supaya
  // data yang baru disimpan (atau diubah dari tab lain) pasti muncul.
  const handleModalClose = () => {
    setModalOpen(false);
    fetchData();
  };

  return (
    <AppShell title="Uang Muka" subtitle="Manajemen uang muka penjualan">
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${
            messageType === "error"
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-green-100 text-green-700 border border-green-300"
          }`}
        >
          {message}
        </div>
      )}

      <DataTable
        title="Daftar Uang Muka"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Tambah Uang Muka"
        onAdd={handleTambah}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
        renderActions={(row) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleDetail(row)}
              disabled={isLoading}
              title="Lihat Detail"
              className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Eye size={15} />
            </button>
          </div>
        )}
      />

      <UangMukaModal
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        initialData={editData}
      />
    </AppShell>
  );
}