"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import { UangMukaModal, type UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import type { Column } from "@/components/ui";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  isActive: boolean;
}

// ─── Columns ──────────────────────────────────────────────────────────────────
const COLUMNS: Column<UangMuka>[] = [
  { key: "no",         label: "No",          width: "60px"  },
  { key: "noFaktur",   label: "No Faktur",   width: "140px" },
  { key: "tanggal",    label: "Tanggal",     width: "120px" },
  { key: "pelanggan",  label: "Pelanggan",   width: "180px" },
  {
    key: "uangMuka",
    label: "Uang Muka",
    width: "160px",
    render: (value: unknown) =>
      Number(value).toLocaleString("id-ID", {
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UangMukaPage() {
  const router = useRouter();

  const [data, setData]           = useState<UangMuka[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState<UangMukaFormData | undefined>();
  const [savedId, setSavedId]     = useState<number | null>(null);
  const [message, setMessage]     = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch ────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // TODO: ganti dengan service call sesungguhnya
      // const result = await uangMukaService.getAll();
      // setData(result);

      // dummy data untuk demo
      setData([
        {
          no: 1,
          id: 1,
          noFaktur: "UM-2026-001",
          tanggal: "19/05/2026",
          pelanggan: "PT Maju Bersama",
          uangMuka: 5000000,
          kenaPajak: true,
          totalTermasukPajak: true,
          noPO: "PO-001",
          syaratPembayaran: "Net 30",
          alamat: "Jl. Sudirman No. 1, Jakarta",
          keterangan: "",
          fakturType: "Faktur Penjualan",
          isActive: true,
        },
        {
          no: 2,
          id: 2,
          noFaktur: "UM-2026-002",
          tanggal: "18/05/2026",
          pelanggan: "CV Sentosa Abadi",
          uangMuka: 2500000,
          kenaPajak: false,
          totalTermasukPajak: false,
          noPO: "",
          syaratPembayaran: "",
          alamat: "",
          keterangan: "Uang muka project A",
          fakturType: "Faktur Penjualan",
          isActive: false,
        },
      ]);
    } catch {
      showMessage("Gagal memuat data uang muka", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Toast ────────────────────────────────────────────
  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Handlers ─────────────────────────────────────────
  const handleTambah = () => {
    setEditData(undefined);
    setSavedId(null);
    setModalOpen(true);
  };

  const handleEdit = (row: UangMuka) => {
    setEditData({
      id: row.id,
      pelanggan: row.pelanggan,
      noFaktur: row.noFaktur,
      tanggal: row.tanggal,
      uangMuka: row.uangMuka,
      noPO: row.noPO,
      kenaPajak: row.kenaPajak,
      totalTermasukPajak: row.totalTermasukPajak,
      syaratPembayaran: row.syaratPembayaran,
      alamat: row.alamat,
      keterangan: row.keterangan,
      fakturType: row.fakturType,
    });
    setSavedId(row.id);
    setModalOpen(true);
  };

  const handleSubmit = async (formData: UangMukaFormData) => {
    try {
      setIsLoading(true);
      // TODO: ganti dengan service call
      // const msg = formData.id
      //   ? await uangMukaService.update(formData.id, formData)
      //   : await uangMukaService.create(formData);

      showMessage(
        formData.id ? "Uang muka berhasil diperbarui" : "Uang muka berhasil ditambahkan",
        "success"
      );
      setSavedId(formData.id || Date.now()); // simpan id supaya Proses aktif
      await fetchData();
    } catch {
      showMessage("Gagal menyimpan uang muka", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /** Navigasi ke halaman Penerimaan Penjualan dengan data uang muka */
  const handleProses = (formData: UangMukaFormData) => {
    setModalOpen(false);
    // Kirim state via query param atau router state
    router.push(
      `/penjualan/penerimaan-penjualan/baru?fromUangMuka=${formData.id}&pelanggan=${encodeURIComponent(formData.pelanggan)}&nominal=${formData.uangMuka}`
    );
  };

  const handleToggleStatus = async (row: UangMuka) => {
    try {
      setIsLoading(true);
      // TODO: await uangMukaService.toggleStatus(row.id, { isActive: !row.isActive });
      showMessage("Status berhasil diperbarui", "success");
      await fetchData();
    } catch {
      showMessage("Gagal mengubah status", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────
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
                  id: row.id,
                  pelanggan: row.pelanggan,
                  noFaktur: row.noFaktur,
                  tanggal: row.tanggal,
                  uangMuka: row.uangMuka,
                  noPO: row.noPO,
                  kenaPajak: row.kenaPajak,
                  totalTermasukPajak: row.totalTermasukPajak,
                  syaratPembayaran: row.syaratPembayaran,
                  alamat: row.alamat,
                  keterangan: row.keterangan,
                  fakturType: row.fakturType,
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
                         ${row.isActive
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