"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import {
  PengirimanModal,
  type PengirimanFormData,
} from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";
import type { Column } from "@/components/ui";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Pengiriman {
  no: number;
  id: number;
  noSuratJalan: string;
  tanggal: string;
  pelanggan: string;
  noSO: string;
  ekspedisi: string;
  kotaTujuan: string;
  totalItem: number;
  isActive: boolean;
}

// ─── Columns ──────────────────────────────────────────────────────────────────
const COLUMNS: Column<Pengiriman>[] = [
  { key: "no",           label: "No",             width: "60px"  },
  { key: "noSuratJalan", label: "No Surat Jalan", width: "160px" },
  { key: "tanggal",      label: "Tanggal",        width: "120px" },
  { key: "pelanggan",    label: "Pelanggan",      width: "180px" },
  { key: "noSO",         label: "No. SO",         width: "140px" },
  { key: "ekspedisi",    label: "Ekspedisi",      width: "140px" },
  { key: "kotaTujuan",   label: "Kota Tujuan",    width: "140px" },
  {
    key: "totalItem",
    label: "Total Item",
    width: "100px",
    render: (value: unknown) => (
      <span className="font-semibold text-slate-700">
        {Number(value).toLocaleString("id-ID")}
      </span>
    ),
  },
  {
    key: "isActive",
    label: "Status",
    width: "120px",
    render: (_: unknown, row: Pengiriman) => (
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

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const DUMMY_DATA: Pengiriman[] = [
  {
    no: 1,
    id: 1,
    noSuratJalan: "SJ-2026-001",
    tanggal: "19/05/2026",
    pelanggan: "PT Maju Bersama",
    noSO: "SO-2026-010",
    ekspedisi: "JNE Reguler",
    kotaTujuan: "Surabaya",
    totalItem: 5,
    isActive: true,
  },
  {
    no: 2,
    id: 2,
    noSuratJalan: "SJ-2026-002",
    tanggal: "18/05/2026",
    pelanggan: "CV Sentosa Abadi",
    noSO: "SO-2026-009",
    ekspedisi: "TIKI",
    kotaTujuan: "Bandung",
    totalItem: 3,
    isActive: true,
  },
  {
    no: 3,
    id: 3,
    noSuratJalan: "SJ-2026-003",
    tanggal: "17/05/2026",
    pelanggan: "PT Jaya Abadi",
    noSO: "SO-2026-008",
    ekspedisi: "Sicepat",
    kotaTujuan: "Medan",
    totalItem: 8,
    isActive: false,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PengirimanPage() {
  const router = useRouter();

  const [data, setData]           = useState<Pengiriman[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState<PengirimanFormData | undefined>();
  const [savedId, setSavedId]     = useState<number | null>(null);
  const [message, setMessage]     = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // TODO: ganti dengan service call sesungguhnya
      // const result = await pengirimanService.getAll();
      // setData(result);
      setData(DUMMY_DATA);
    } catch {
      showMessage("Gagal memuat data pengiriman", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Toast ────────────────────────────────────────────────────────────────
  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTambah = () => {
    setEditData(undefined);
    setSavedId(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Pengiriman) => {
    setEditData({
      id: row.id,
      pelanggan: row.pelanggan,
      noSuratJalan: row.noSuratJalan,
      tanggal: row.tanggal,
      noSO: row.noSO,
      noPO: "",
      ekspedisi: row.ekspedisi,
      noResi: "",
      alamatPengiriman: "",
      kotaTujuan: row.kotaTujuan,
      keterangan: "",
      fakturType: "Faktur Penjualan",
      items: [],
    });
    setSavedId(row.id);
    setModalOpen(true);
  };

  const handleSubmit = async (formData: PengirimanFormData) => {
    try {
      setIsLoading(true);
      // TODO: ganti dengan service call
      // const msg = formData.id
      //   ? await pengirimanService.update(formData.id, formData)
      //   : await pengirimanService.create(formData);

      showMessage(
        formData.id
          ? "Pengiriman berhasil diperbarui"
          : "Pengiriman berhasil ditambahkan",
        "success"
      );
      setSavedId(formData.id || Date.now());
      await fetchData();
    } catch {
      showMessage("Gagal menyimpan pengiriman", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /** Navigasi ke halaman Faktur Penjualan dengan data pengiriman */
  const handleProses = (formData: PengirimanFormData) => {
    setModalOpen(false);
    router.push(
      `/penjualan/faktur/baru?fromPengiriman=${formData.id}&pelanggan=${encodeURIComponent(formData.pelanggan)}&noSJ=${encodeURIComponent(formData.noSuratJalan)}`
    );
  };

  const handleToggleStatus = async (row: Pengiriman) => {
    try {
      setIsLoading(true);
      // TODO: await pengirimanService.toggleStatus(row.id, { isActive: !row.isActive });
      showMessage("Status berhasil diperbarui", "success");
      await fetchData();
    } catch {
      showMessage("Gagal mengubah status", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Pengiriman Penjualan" subtitle="Manajemen surat jalan & pengiriman barang">
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
        title="Daftar Pengiriman Penjualan"
        columns={COLUMNS}
        data={data}
        keyField="no"
        addLabel="Tambah Pengiriman"
        onAdd={handleTambah}
        loading={isLoading}
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
                  noSuratJalan: row.noSuratJalan,
                  tanggal: row.tanggal,
                  noSO: row.noSO,
                  noPO: "",
                  ekspedisi: row.ekspedisi,
                  noResi: "",
                  alamatPengiriman: "",
                  kotaTujuan: row.kotaTujuan,
                  keterangan: "",
                  fakturType: "Faktur Penjualan",
                  items: [],
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

      <PengirimanModal
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