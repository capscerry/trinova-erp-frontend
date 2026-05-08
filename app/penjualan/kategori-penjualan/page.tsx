"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import { KategoriPenjualanModal, type KategoriPenjualanFormData } from "@/components/modules/penjualan/CategorySalesModal";
import type { Column } from "@/components/ui";
import axios from "axios";

// ─── Type ─────────────────────────────────────────────────────────────────────
interface KategoriPenjualan {
  no: string;
  id: number;
  nama: string;
  keterangan: string;
}

type SalesCategoryResponse = {
  id: number;
  namaKategori: string;
  keterangan: string;
};

// ─── Columns ──────────────────────────────────────────────────────────────────
const COLUMNS: Column<KategoriPenjualan>[] = [
  {
    key: "no",
    label: "No",
    width: "140px",
  },
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
  const [data, setData]           = useState<KategoriPenjualan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState<KategoriPenjualanFormData | undefined>();
  const [message, setMessage]     = useState("");

  const fetchSalesCategory = async () => {
    try {
      const response = await axios.get("https://localhost:7283/api/sales-category");
      const result = response.data.data;

      const mapped = result.map((item: SalesCategoryResponse, index: number) => ({
        no: (index + 1).toString(),
        id: item.id,
        nama: item.namaKategori,
        keterangan: item.keterangan ?? "",
      }));

      setData(mapped);
    } catch (error) {
      console.error("Error fetching sales category data:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSalesCategory();
  }, []);

  // ── Handlers ────────────────────────────────────────
  const handleTambah = () => {
    setEditData(undefined);
    setModalOpen(true);
  };

  const handleEdit = (row: KategoriPenjualan) => {
    setEditData({
      id: row.id,
      nama: row.nama,
      keterangan: row.keterangan,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (formData: KategoriPenjualanFormData) => {
    try {
      if (formData.id) {
        const response = await axios.put(`https://localhost:7283/api/sales-category/${formData.id}`, {
          NamaKategori: formData.nama,
          Keterangan: formData.keterangan,
        });
        if (response != null) {
          setMessage(response.data.message);
        }
      } else {
        const response = await axios.post("https://localhost:7283/api/sales-category", {
          NamaKategori: formData.nama,
          Keterangan: formData.keterangan,
        });
        if (response != null) {
          setMessage(response.data);
        }
      }
      await fetchSalesCategory();
    } catch (error) {
      console.error("Gagal menambahkan kategori:", error);
    }
  };

  return (
    <AppShell title="Kategori Penjualan" subtitle="Master data kategori penjualan">
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${
            message.toLowerCase().includes("failed")
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-green-100 text-green-700 border border-green-300"
          }`}
        >
          {message}
        </div>
      )}

      <DataTable
        title="Daftar Kategori Penjualan"
        columns={COLUMNS}
        data={data}
        keyField="no"
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
        initialData={editData}
      />

    </AppShell>
  );
}