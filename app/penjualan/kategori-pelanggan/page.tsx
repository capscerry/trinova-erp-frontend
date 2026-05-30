"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import { KategoriCustomerModal, type KategoriFormData } from "@/components/modules/penjualan/CategoryCustomerModal";
import type { Column } from "@/components/ui";

import {
  categoryCustomerService,
  type KategoriCustomer,
} from "@/lib/services/category-customer.service";

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS: Column<KategoriCustomer>[] = [
  { key: "no",   label: "No",            width: "100px" },
  { key: "nama", label: "Nama Kategori", width: "200px" },
  {
    key: "isActive",
    label: "Status",
    width: "150px",
    render: (_value: unknown, row: KategoriCustomer) => (
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

export default function KategoriCustomerPage() {
  const [data, setData]           = useState<KategoriCustomer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState<KategoriFormData | undefined>();
  const [message, setMessage]     = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch ────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await categoryCustomerService.getAll(); // ✅
      setData(result);
    } catch (error) {
      showMessage("Gagal memuat data kategori", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Helper toast ─────────────────────────────────────
  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  // ── Handlers ─────────────────────────────────────────
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
        ? await categoryCustomerService.update(formData.id, payload) // ✅ update
        : await categoryCustomerService.create(payload);             // ✅ create

      showMessage(msg, "success");
      setModalOpen(false);
      await fetchData();
    } catch (error) {
      showMessage("Gagal menyimpan kategori", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (row: KategoriCustomer) => {
    try {
      setIsLoading(true);
      const newStatus = !row.isActive;
      const msg = await categoryCustomerService.toggleStatus(row.id, { // ✅
        isActive: newStatus,
      });
      showMessage(msg, "success");
      await fetchData();
    } catch (error) {
      showMessage("Gagal mengubah status kategori", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────
  return (
    <AppShell title="Kategori Customer" subtitle="Master data kategori pelanggan">
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
        title="Daftar Kategori Customer"
        columns={COLUMNS}
        data={data}
        keyField="no"
        addLabel="Tambah Kategori"
        onAdd={handleTambah}
        loading={isLoading}
        renderActions={(row) => (
          <div className="flex items-center gap-1.5 justify-center">
            <button
              onClick={() => handleEdit(row)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-amber-50 text-amber-700 hover:bg-amber-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => handleToggleStatus(row)}
              disabled={isLoading}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         ${row.isActive
                           ? "bg-green-50 text-green-700 hover:bg-green-100"
                           : "bg-gray-50  text-gray-700  hover:bg-gray-100"
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
