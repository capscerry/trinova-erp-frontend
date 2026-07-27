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
  const [isLoading, setIsLoading] = useState(false);

  const [confirmStatus, setConfirmStatus] = useState<{
    open: boolean;
    id: number;
    nama: string;
    currentStatus: boolean;
  } | null>(null);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await categoryCustomerService.getAll();
      setData(result);
    } catch {
      showToast("Gagal memuat data kategori", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

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

      showToast(msg, "success");
      setModalOpen(false);
      await fetchData();
    } catch {
      showToast("Gagal menyimpan kategori", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!confirmStatus) return;

    try {
      setIsLoading(true);
      const msg = await categoryCustomerService.toggleStatus(confirmStatus.id, {
        isActive: !confirmStatus.currentStatus,
      });
      showToast(msg, "success");
      setConfirmStatus(null);
      await fetchData();
    } catch {
      showToast("Gagal mengubah status kategori", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell title="Kategori Customer" subtitle="Master data kategori pelanggan">
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
                         bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit
            </button>

            <button
              onClick={() =>
                setConfirmStatus({
                  open: true,
                  id: row.id,
                  nama: row.nama,
                  currentStatus: row.isActive,
                })
              }
              disabled={isLoading}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                row.isActive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {row.isActive ? "Deactivate" : "Activate"}
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

      {confirmStatus?.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div
              className={`px-6 py-5 text-white ${
                confirmStatus.currentStatus ? "bg-red-600" : "bg-emerald-600"
              }`}
            >
              <h3 className="text-lg font-bold font-serif">
                {confirmStatus.currentStatus
                  ? "Deactivate Category?"
                  : "Activate Category?"}
              </h3>
              <p className="mt-1 text-sm opacity-90 font-serif">
                {confirmStatus.currentStatus
                  ? "Kategori akan dinonaktifkan."
                  : "Kategori akan diaktifkan kembali."}
              </p>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 font-serif">
                Apakah kamu yakin ingin{" "}
                <span className="font-bold text-slate-900">
                  {confirmStatus.currentStatus ? "menonaktifkan" : "mengaktifkan"}
                </span>{" "}
                kategori{" "}
                <span className="font-bold text-slate-900">
                  {confirmStatus.nama}
                </span>
                ?
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmStatus(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 font-serif"
              >
                Batal
              </button>
              <button
                onClick={confirmToggleStatus}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold text-white font-serif ${
                  confirmStatus.currentStatus
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmStatus.currentStatus ? "Ya, Deactivate" : "Ya, Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg font-serif text-sm font-semibold
          ${
            toast.type === "success"
              ? "bg-navy-900 text-gold-400 shadow-navy-900/30"
              : "bg-red-600 text-white shadow-red-600/30"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </AppShell>
  );
}