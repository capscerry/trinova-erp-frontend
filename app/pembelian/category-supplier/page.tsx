"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";

import {
  DataTable,
  type Column,
} from "@/components/ui/DataTable";

import { Button } from "@/components/ui/Button";

import {
  getSupplierCategory,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
} from "@/lib/services";

interface SupplierCategory {
  category_id: number;

  category_name: string;
}

const COLUMNS:
  Column<SupplierCategory>[] = [

  {
    key: "category_id",
    label: "ID",
  },

  {
    key: "category_name",
    label: "NAMA CATEGORY",
  },
];

export default function
  SupplierCategoryPage() {

  const [data, setData] =
    useState<SupplierCategory[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [isEdit, setIsEdit] =
    useState(false);

  const [selectedId, setSelectedId] =
    useState("");

  const [formData, setFormData] =
    useState({
      nama_category: "",

      status: "Active",
    });

  // â”€â”€â”€ FETCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchData = async () => {

    try {

      const res =
        await getSupplierCategory();

      setData(
        res.data || []
      );

    } catch (err) {

      console.error(err);
    }
  };

  useEffect(() => {

    fetchData();

  }, []);

  // â”€â”€â”€ SUBMIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSubmit =
    async () => {

      try {

        if (isEdit) {

          await updateSupplierCategory(
            selectedId,
            formData
          );

          alert(
            "Category berhasil diupdate"
          );

        } else {

          await createSupplierCategory(
            formData
          );

          alert(
            "Category berhasil ditambahkan"
          );
        }

        fetchData();

        setOpenModal(false);

        setFormData({
          nama_category: "",

          status: "Active",
        });

      } catch (err) {

        console.error(err);

        alert(
          "Gagal simpan category"
        );
      }
    };

  // â”€â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleDelete =
    async (id: string) => {

      const confirmDelete =
        confirm(
          "Yakin hapus category?"
        );

      if (!confirmDelete)
        return;

      try {

        await deleteSupplierCategory(
          id
        );

        fetchData();

      } catch (err) {

        console.error(err);

        alert(
          "Gagal hapus category"
        );
      }
    };

  // â”€â”€â”€ EDIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleEdit =
    (row: SupplierCategory) => {

      setIsEdit(true);

      setSelectedId(
        row.category_id.toString()
      );

      setFormData({
        nama_category:
          row.category_name,

        status: "Active",
      });

      setOpenModal(true);
    };

  return (

    <AppShell
      title="Supplier Category"
      subtitle="Master Supplier Catgory"
    >

      <DataTable<SupplierCategory>

        title="Daftar Supplier Category"

        columns={COLUMNS}

        data={data}

        keyField="category_id"

        addLabel="Tambah Category"

        onAdd={() => {

          setIsEdit(false);

          setFormData({
            nama_category: "",

            status: "Active",
          });

          setOpenModal(true);
        }}

        renderActions={(row) => (

          <div className="flex gap-1.5 justify-center">

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row)}
            >
              Edit
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                handleDelete(
                  row.category_id.toString()
                )
              }
            >
              Hapus
            </Button>
          </div>
        )}
      />

      {/* â”€â”€â”€ MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

      {openModal && (

        <div
          className="
            fixed inset-0
            bg-black/50
            backdrop-blur-[2px]
            flex items-center
            justify-center
            z-50
          "
        >

          <div
            className="
              bg-white
              rounded-2xl
              w-full
              max-w-lg
              shadow-2xl
              border
              border-slate-200
              overflow-hidden
            "
          >

            {/* Header */}

            <div
              className="
                flex items-center
                justify-between
                px-6 py-4
                bg-gradient-to-r
                from-navy-900
                to-navy-600
              "
            >

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
                className="
                  w-8 h-8
                  rounded-lg
                  flex items-center justify-center
                  text-slate-400
                  hover:text-white hover:bg-white/10
                  transition-colors
                "
              >
                âœ•
              </button>

            </div>

            {/* Body */}

            <div className="p-6 space-y-4">

              <div>

                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Nama Category
                </label>

                <input
                  type="text"
                  value={formData.nama_category}
                  onChange={(e) =>
                    setFormData({ ...formData, nama_category: e.target.value })
                  }
                  placeholder="Masukkan nama category..."
                  className="
                    w-full
                    border border-slate-200
                    rounded-xl
                    px-4 py-2.5
                    text-sm
                    text-slate-700
                    outline-none
                    focus:ring-2 focus:ring-navy-900/20
                    focus:border-navy-900
                    transition
                  "
                />

              </div>

              <div>

                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Status
                </label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="
                    w-full
                    border border-slate-200
                    rounded-xl
                    px-4 py-2.5
                    text-sm
                    text-slate-700
                    outline-none
                    focus:ring-2 focus:ring-navy-900/20
                    focus:border-navy-900
                    transition
                    bg-white
                  "
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

              </div>

            </div>

            {/* Footer */}

            <div
              className="
                border-t border-slate-100
                px-6 py-4
                flex justify-end gap-2
                bg-slate-50/60
              "
            >

              <Button
                variant="ghost"
                onClick={() => setOpenModal(false)}
              >
                Batal
              </Button>

              <Button
                variant="primary"
                onClick={handleSubmit}
              >
                {isEdit ? "Simpan Perubahan" : "Tambah Category"}
              </Button>

            </div>

          </div>

        </div>
      )}

    </AppShell>
  );
}
