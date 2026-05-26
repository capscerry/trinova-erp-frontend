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
  { key: "no", label: "No", width: "60px" },
  { key: "noFaktur", label: "No Faktur", width: "140px" },
  { key: "tanggal", label: "Tanggal", width: "120px" },
  { key: "pelanggan", label: "Pelanggan", width: "180px" },
  { key: "noPesanan", label: "No SO", width: "140px" },
  {
    key: "totalHargaPesanan",
    label: "Total SO",
    width: "160px",
    render: (value: unknown) =>
      Number(value || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
  },
  {
    key: "uangMuka",
    label: "Uang Muka",
    width: "160px",
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
    width: "120px",
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
  const [savedId, setSavedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [isLoading, setIsLoading] = useState(false);

 const fetchData = async () => {
  try {
    setIsLoading(true);

    const result = await uangMukaService.getAll();

    setData(
      result.map((item, index) => ({
        no: index + 1,

        id: index + 1,

        noFaktur: item.noFaktur,

        tanggal: new Date(item.tanggal).toLocaleDateString("id-ID"),

        pelanggan: `Customer ID ${item.customerId}`,

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
    const totalHargaPesanan = Number(
      searchParams.get("totalHargaPesanan") ?? 0
    );
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

    setSavedId(null);
    setModalOpen(true);
  }, [searchParams]);

  const showMessage = (
    msg: string,
    type: "success" | "error" = "success"
  ) => {
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
    setSavedId(null);
    setModalOpen(true);
  };

  const handleEdit = (row: UangMuka) => {
    setEditData({
      id: row.id ?? 0,
      pelanggan: row.pelanggan ?? "",
      noFaktur: row.noFaktur ?? "",
      noFakturMode: "manual",
      tanggal: row.tanggal ?? today,
      uangMuka: row.uangMuka ?? 0,
      noPO: row.noPO ?? "",
      kenaPajak: row.kenaPajak ?? false,
      totalTermasukPajak: row.totalTermasukPajak ?? true,
      syaratPembayaran: row.syaratPembayaran ?? "",
      alamat: row.alamat ?? "",
      keterangan: row.keterangan ?? "",
      fakturType: row.fakturType ?? "Faktur Penjualan",
      noPesanan: row.noPesanan ?? "",
      totalHargaPesanan: row.totalHargaPesanan ?? 0,
    });

    setSavedId(row.id);
    setModalOpen(true);
  };

  const handleSubmit = async (formData: UangMukaFormData) => {
    try {
      setIsLoading(true);

      showMessage(
        formData.id
          ? "Uang muka berhasil diperbarui"
          : "Uang muka berhasil ditambahkan",
        "success"
      );

      const newId = formData.id || Date.now();
      setSavedId(newId);

      setData((prev) => {
        if (formData.id) {
          return prev.map((item) =>
            item.id === formData.id
              ? {
                  ...item,
                  ...formData,
                  isActive: item.isActive,
                }
              : item
          );
        }

        return [
          ...prev,
          {
            no: prev.length + 1,
            id: newId,
            noFaktur: formData.noFaktur ?? "",
            tanggal: formData.tanggal ?? today,
            pelanggan: formData.pelanggan ?? "",
            uangMuka: formData.uangMuka ?? 0,
            kenaPajak: formData.kenaPajak ?? false,
            totalTermasukPajak: formData.totalTermasukPajak ?? true,
            noPO: formData.noPO ?? "",
            syaratPembayaran: formData.syaratPembayaran ?? "",
            alamat: formData.alamat ?? "",
            keterangan: formData.keterangan ?? "",
            fakturType: formData.fakturType ?? "Faktur Penjualan",
            noPesanan: formData.noPesanan ?? "",
            totalHargaPesanan: formData.totalHargaPesanan ?? 0,
            isActive: true,
          },
        ];
      });
    } catch {
      showMessage("Gagal menyimpan uang muka", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProses = (formData: UangMukaFormData) => {
    setModalOpen(false);

    router.push(
      `/penjualan/penerimaan-penjualan/baru?fromUangMuka=${formData.id}` +
        `&pelanggan=${encodeURIComponent(formData.pelanggan ?? "")}` +
        `&nominal=${formData.uangMuka ?? 0}` +
        `&noPesanan=${encodeURIComponent(formData.noPesanan ?? "")}` +
        `&totalHargaPesanan=${formData.totalHargaPesanan ?? 0}`
    );
  };

  const handleToggleStatus = async (row: UangMuka) => {
    try {
      setIsLoading(true);

      setData((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, isActive: !item.isActive } : item
        )
      );

      showMessage("Status berhasil diperbarui", "success");
    } catch {
      showMessage("Gagal mengubah status", "error");
    } finally {
      setIsLoading(false);
    }
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
        keyField="no"
        addLabel="Tambah Uang Muka"
        onAdd={handleTambah}
        isLoading={isLoading}
        renderActions={(row) => (
          <div className="flex items-center gap-1.5 justify-center">
            <button
              onClick={() => handleEdit(row)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold
                         bg-amber-50 text-amber-700 hover:bg-amber-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Edit
            </button>

            <button
              onClick={() =>
                handleProses({
                  id: row.id ?? 0,
                  pelanggan: row.pelanggan ?? "",
                  noFaktur: row.noFaktur ?? "",
                  noFakturMode: "manual",
                  tanggal: row.tanggal ?? today,
                  uangMuka: row.uangMuka ?? 0,
                  noPO: row.noPO ?? "",
                  kenaPajak: row.kenaPajak ?? false,
                  totalTermasukPajak: row.totalTermasukPajak ?? true,
                  syaratPembayaran: row.syaratPembayaran ?? "",
                  alamat: row.alamat ?? "",
                  keterangan: row.keterangan ?? "",
                  fakturType: row.fakturType ?? "Faktur Penjualan",
                  noPesanan: row.noPesanan ?? "",
                  totalHargaPesanan: row.totalHargaPesanan ?? 0,
                })
              }
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold
                         bg-blue-50 text-blue-700 hover:bg-blue-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Proses
            </button>

            <button
              onClick={() => handleToggleStatus(row)}
              disabled={isLoading}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         ${
                           row.isActive
                             ? "bg-green-50 text-green-700 hover:bg-green-100"
                             : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                         }`}
            >
              {row.isActive ? "Aktif" : "Nonaktif"}
            </button>
          </div>
        )}
      />

      <UangMukaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onProses={handleProses}
        initialData={editData}
        isSaved={savedId !== null}
      />
    </AppShell>
  );
}