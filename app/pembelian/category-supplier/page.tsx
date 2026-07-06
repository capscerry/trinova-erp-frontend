"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

import {
  getSupplierCategory,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
} from "@/lib/services";

import { useAuth } from "@/lib/AuthContext";

interface SupplierCategory {
  category_id: number;
  category_code: string;
  category_name: string;
  created_by?: string;
  created_date?: string;
  update_by?: string;
  update_date?: string;
}

const COLUMNS: Column<SupplierCategory>[] = [
  { key: "category_code", label: "KODE CATEGORY" },
  { key: "category_name", label: "NAMA CATEGORY" },
];

export default function SupplierCategoryPage() {
  const { user } = useAuth();

  const [data, setData] = useState<SupplierCategory[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [formData, setFormData] = useState({ category_name: "" });
  const [previewCode, setPreviewCode] = useState<string | null>(null);

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

  // ─── OPEN ADD MODAL ───────────────────────────────────────────────────────
  // Fetch the next code so the user can see it before saving.

  const handleOpenAdd = async () => {
    setIsEdit(false);
    setFormData({ category_name: "" });
    setPreviewCode(null);
    setOpenModal(true);

    try {
      const res = await import("@/lib/services").then((m) =>
        m.getNextSupplierCategoryCode()
      );
      setPreviewCode(res);
    } catch {
      // Non-critical — the backend will still assign a code on insert.
    }
  };

  // ─── SUBMIT ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.category_name.trim()) {
      alert("Nama category tidak boleh kosong");
      return;
    }

    try {
      if (isEdit) {
        await updateSupplierCategory(selectedId, {
          category_name: formData.category_name,
          update_by: user?.username ?? user?.email ?? "system",
        });
        alert("Category berhasil diupdate");
      } else {
        await createSupplierCategory({
          category_name: formData.category_name,
          created_by: user?.username ?? user?.email ?? "system",
        });
        alert("Category berhasil ditambahkan");
      }

      fetchData();
      setOpenModal(false);
      setFormData({ category_name: "" });
      setPreviewCode(null);
    } catch (err) {
      console.error(err);
      alert("Gagal simpan category");
    }
  };

  // ─── DELETE ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus category ini?")) return;

    try {
      await deleteSupplierCategory(id);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Gagal hapus category");
    }
  };

  // ─── EDIT ─────────────────────────────────────────────────────────────────

  const handleEdit = (row: SupplierCategory) => {
    setIsEdit(true);
    setSelectedId(row.category_id.toString());
    setFormData({ category_name: row.category_name });
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
                  {isEdit
                    ? "Perbarui data category supplier"
                    : "Tambah category supplier baru"}
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

              {/* Kode Category — read-only */}
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

              {/* Nama Category */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Nama Category
                </label>
                <input
                  type="text"
                  value={formData.category_name}
                  onChange={(e) =>
                    setFormData({ category_name: e.target.value })
                  }
                  placeholder="Masukkan nama category..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition"
                />
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
