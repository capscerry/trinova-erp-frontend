"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import { KategoriPenjualanModal, type KategoriPenjualanFormData } from "@/components/modules/penjualan/CategorySalesModal";
import type { Column } from "@/components/ui";

// ─── Type ─────────────────────────────────────────────────────────────────────
interface KategoriPenjualan {
  id: number;
  keterangan: string;
  nama: string;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const INITIAL_DATA: KategoriPenjualan[] = [
  { id: 1, nama: "Umum",     keterangan: "" },
  { id: 2, nama: "Retail",   keterangan: "Penjualan langsung ke konsumen akhir" },
  { id: 3, nama: "Grosir",   keterangan: "Penjualan dalam jumlah besar" },
  { id: 4, nama: "Ekspor",   keterangan: "Penjualan ke luar negeri" },
  { id: 5, nama: "Online",   keterangan: "Penjualan melalui platform digital" },
];

// ─── Columns ──────────────────────────────────────────────────────────────────
const COLUMNS: Column<KategoriPenjualan>[] = [
  {
    key: "nama",
    label: "Nama Kategori",
    width: "220px",
  },
  {
    key: "keterangan",
    label: "Keterangan",
    render: (val) => (
      <span className="text-slate-500 text-xs">
        {String(val) || <span className="italic text-slate-300">—</span>}
      </span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KategoriPenjualanPage() {
  const [data, setData]           = useState<KategoriPenjualan[]>(INITIAL_DATA);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<KategoriPenjualan | null>(null);

  // ── Handlers ────────────────────────────────────────
  const handleTambah = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleEdit = (row: KategoriPenjualan) => {
    setEditTarget(row);
    setModalOpen(true);
  };

  const handleHapus = (row: KategoriPenjualan) => {
    // TODO: ganti dengan konfirmasi dialog
    setData((prev) => prev.filter((k) => k.id !== row.id));
  };

  const handleSubmit = (formData: KategoriPenjualanFormData) => {
    if (editTarget) {
      // Mode edit
      setData((prev) =>
        prev.map((k) => (k.id === editTarget.id ? { ...k, ...formData } : k))
      );
    } else {
      // Mode tambah — generate id baru
      const newId = Math.max(0, ...data.map((k) => k.id)) + 1;
      setData((prev) => [...prev, { id: newId, ...formData }]);
    }
    // TODO: ganti dengan call API ke backend
  };

  return (
    <AppShell title="Kategori Penjualan" subtitle="Master data kategori penjualan">

      <DataTable
        title="Daftar Kategori Penjualan"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Tambah Kategori"
        onAdd={handleTambah}
        renderActions={(row) => (
          <div className="flex items-center gap-1.5 justify-center">
            
              <button
                onClick={() => handleEdit(row)}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                          bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Edit
              </button>

              {/* Hapus */}
              <button
                onClick={() => handleHapus(row)}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                          bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
              >
                Hapus
              </button>
            </div>
        )}
      />

      <KategoriPenjualanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editTarget ?? undefined}
      />

    </AppShell>
  );
}