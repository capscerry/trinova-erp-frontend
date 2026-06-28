"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import { KategoriPenjualanModal, type KategoriPenjualanFormData } from "@/components/modules/penjualan/CategorySalesModal";
import type { Column } from "@/components/ui";
import {
  categorySalesService,
  type KategoriPenjualan,
} from "@/lib/services/category-sales.service";

const COLUMNS: Column<KategoriPenjualan>[] = [
  { key: "no", label: "No", width: "100px" },
  { key: "nama", label: "Nama Kategori", width: "220px" },
  {
    key: "keterangan",
    label: "Keterangan",
    render: (val) => (
      <span className="text-xs text-slate-500">
        {String(val) || <span className="italic text-slate-300">-</span>}
      </span>
    ),
  },
  {
    key: "isActive",
    label: "Status",
    width: "150px",
    render: (_value: unknown, row: KategoriPenjualan) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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

export default function KategoriPenjualanPage() {
  const [data, setData] = useState<KategoriPenjualan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<KategoriPenjualanFormData | undefined>();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = useCallback((msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  const fetchSalesCategory = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await categorySalesService.getAll();
      setData(result);
    } catch {
      showMessage("Gagal memuat kategori penjualan", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchSalesCategory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchSalesCategory]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

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
      setIsLoading(true);
      const payload = {
        NamaKategori: formData.nama,
        Keterangan: formData.keterangan,
      };

      const msg = formData.id
        ? await categorySalesService.update(formData.id, payload)
        : await categorySalesService.create(payload);

      showMessage(msg, "success");
      setModalOpen(false);
      await fetchSalesCategory();
    } catch {
      showMessage("Gagal menyimpan kategori penjualan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (row: KategoriPenjualan) => {
    try {
      setIsLoading(true);
      const msg = await categorySalesService.toggleStatus(row.id, {
        isActive: !row.isActive,
      });

      showMessage(msg, "success");
      await fetchSalesCategory();
    } catch {
      showMessage("Gagal mengubah status kategori penjualan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell title="Kategori Penjualan" subtitle="Master data kategori penjualan">
      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${
            messageType === "error"
              ? "border border-red-300 bg-red-100 text-red-700"
              : "border border-green-300 bg-green-100 text-green-700"
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
        loading={isLoading}
        renderActions={(row) => (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => handleEdit(row)}
              disabled={isLoading}
              className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit
            </button>
            <button
              onClick={() => handleToggleStatus(row)}
              disabled={isLoading}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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

      <KategoriPenjualanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editData}
      />
    </AppShell>
  );
}
