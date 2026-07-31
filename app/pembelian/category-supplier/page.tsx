"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notify } from "@/lib/notify";

import {
  getSupplierCategory,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  getNextSupplierCategoryCode,
} from "@/lib/services";

import { useAuth } from "@/lib/AuthContext";

interface SupplierCategory {
  category_id: number;
  category_code: string;
  category_name: string;
  is_active: boolean;
  created_by?: string;
  created_date?: string;
  update_by?: string;
  update_date?: string;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-500 border border-slate-200"}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const COLUMNS: Column<SupplierCategory>[] = [
  { key: "category_code", label: "KODE CATEGORY" },
  { key: "category_name", label: "NAMA CATEGORY" },
  {
    key: "is_active",
    label: "STATUS",
    render: (value) => <StatusBadge active={value as boolean} />,
  },
];

export default function SupplierCategoryPage() {
  const { user } = useAuth();

  const [data, setData] = useState<SupplierCategory[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [formData, setFormData] = useState({ category_name: "", is_active: true });
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  // ─── Delete confirmation ───────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: "",
    name: "",
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── FETCH ────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      const res = await getSupplierCategory();
      setData(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── OPEN ADD ─────────────────────────────────────────────────────────────

  const handleOpenAdd = async () => {
    setIsEdit(false);
    setFormData({ category_name: "", is_active: true });
    setPreviewCode(null);
    setOpenModal(true);

    try {
      const code = await getNextSupplierCategoryCode();
      setPreviewCode(code);
    } catch {
      // non-critical — backend assigns code on insert
    }
  };

  // ─── SUBMIT ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.category_name.trim()) {
      notify.warning("Nama category tidak boleh kosong");
      return;
    }

    try {
      if (isEdit) {
        await updateSupplierCategory(selectedId, {
          category_name: formData.category_name,
          is_active: formData.is_active,
          update_by: user?.username ?? user?.email ?? "system",
        });
        notify.success("Category berhasil diupdate");
      } else {
        await createSupplierCategory({
          category_name: formData.category_name,
          is_active: formData.is_active,
          created_by: user?.username ?? user?.email ?? "system",
        });
        notify.success("Category berhasil ditambahkan");
      }

      fetchData();
      setOpenModal(false);
      setFormData({ category_name: "", is_active: true });
      setPreviewCode(null);
    } catch (err) {
      console.error(err);
      notify.error("Gagal simpan category");
    }
  };

  // ─── DELETE ───────────────────────────────────────────────────────────────

  const handleDelete = (id: string) => {
    const row = data.find((r) => r.category_id.toString() === id);
    setConfirmDelete({ open: true, id, name: row?.category_name ?? id });
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteSupplierCategory(confirmDelete.id);
      fetchData();
      notify.success("Category berhasil dihapus");
    } catch (err: any) {
      console.error(err);
      notify.error("Gagal hapus category", err?.message);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, id: "", name: "" });
    }
  };

  // ─── EDIT ─────────────────────────────────────────────────────────────────

  const handleEdit = (row: SupplierCategory) => {
    setIsEdit(true);
    setSelectedId(row.category_id.toString());
    setFormData({ category_name: row.category_name, is_active: row.is_active });
    setPreviewCode(row.category_code);
    setOpenModal(true);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <AppShell title="Category Supplier" subtitle="Master category supplier">
      <DataTable<SupplierCategory>
        title="Daftar Category Supplier"
        columns={COLUMNS}
        data={data}
        keyField="category_id"
        addLabel="Tambah Category"
        onAdd={handleOpenAdd}
        renderActions={(row) => (
          <div className="flex gap-1.5 justify-center">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(row.category_id.toString())}
            >
              Hapus
            </Button>
          </div>
        )}
      />

      {/* ─── CONFIRM DELETE ─────────────────────────────────────────────────── */}

      <ConfirmDialog
        open={confirmDelete.open}
        title="Hapus Category"
        message={`Yakin ingin menghapus category "${confirmDelete.name}"?`}
        detail="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        loading={deleteLoading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ open: false, id: "", name: "" })}
      />

      {/* ─── MODAL ──────────────────────────────────────────────────────────── */}

      {openModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600">
              <div>
                <h2 className="text-white font-semibold text-[15px]">
                  {isEdit ? "Edit Category" : "Tambah Category"}
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  {isEdit ? "Perbarui data category supplier" : "Tambah category supplier baru"}
                </p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">

              {/* Kode — read-only */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Kode Category
                </label>
                <input
                  type="text"
                  readOnly
                  value={previewCode ?? "Generating…"}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 bg-slate-50 outline-none cursor-not-allowed font-mono"
                />
              </div>

              {/* Nama */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Nama Category
                </label>
                <input
                  type="text"
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  placeholder="Masukkan nama category..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition"
                />
              </div>

              {/* Status toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Status
                </label>
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: true })}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      formData.is_active
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: false })}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-slate-200 ${
                      !formData.is_active
                        ? "bg-slate-500 text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-2 bg-slate-50/60">
              <Button variant="ghost" onClick={() => setOpenModal(false)}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {isEdit ? "Simpan Perubahan" : "Tambah Category"}
              </Button>
            </div>

          </div>
        </div>
      )}
    </AppShell>
  );
}
