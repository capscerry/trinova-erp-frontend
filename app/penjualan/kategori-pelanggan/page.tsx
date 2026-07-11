"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable ,StatusBadge} from "@/components/ui";
import { KategoriCustomerModal, type KategoriFormData } from "@/components/modules/penjualan/CategoryCustomerModal";
import type { Column } from "@/components/ui";
import {
  categoryCustomerService,
  type KategoriCustomer,
} from "@/lib/services/category-customer.service";


const COLUMNS: Column<KategoriCustomer>[] = [
  { key: "no", label: "No", width: "100px" },
  { key: "nama", label: "Nama Kategori", width: "220px" },
  {
    key: "isActive",
    label: "Status",
    width: "150px",
    render: (_value: unknown, row: KategoriCustomer) => (
      <StatusBadge
        status={row.isActive ? "Active" : "Inactive"}
        variant={row.isActive ? "success" : "danger"}
      />
    ),
  },
];

export default function KategoriCustomerPage() {
  const [data, setData] = useState<KategoriCustomer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<KategoriFormData | undefined>();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = useCallback((msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await categoryCustomerService.getAll();
      setData(result);
    } catch {
      showMessage("Gagal memuat data kategori", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleTambah = () => {
    setEditData(undefined);
    setModalOpen(true);
  };

  const handleEdit = (row: KategoriCustomer) => {
    setEditData({ id: row.id, nama: row.nama });
    setModalOpen(true);
  };

  const handleSubmit = async (formData: KategoriFormData) => {
    try {
      setIsLoading(true);
      const payload = { NamaKategori: formData.nama };
      const msg = formData.id
        ? await categoryCustomerService.update(formData.id, payload)
        : await categoryCustomerService.create(payload);

      showMessage(msg, "success");
      setModalOpen(false);
      await fetchData();
    } catch {
      showMessage("Gagal menyimpan kategori", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (row: KategoriCustomer) => {
    try {
      setIsLoading(true);
      const msg = await categoryCustomerService.toggleStatus(row.id, {
        isActive: !row.isActive,
      });
      showMessage(msg, "success");
      await fetchData();
    } catch {
      showMessage("Gagal mengubah status kategori", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell title="Kategori Customer" subtitle="Master data kategori pelanggan">
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
        title="Daftar Kategori Customer"
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

      <KategoriCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editData}
      />
    </AppShell>
  );
}
