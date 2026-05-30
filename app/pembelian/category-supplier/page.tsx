"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";

import {
  DataTable,
  type Column,
} from "@/components/ui/DataTable";

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

  // ─── FETCH ────────────────────────────────

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

  // ─── SUBMIT ──────────────────────────────

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

  // ─── DELETE ──────────────────────────────

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

  // ─── EDIT ────────────────────────────────

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
      title="Category Supplier"
      subtitle="Master category supplier"
    >

      <DataTable<SupplierCategory>

        title="Daftar Category Supplier"

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

          <div className="flex gap-2">

            <button
              onClick={() =>
                handleEdit(row)
              }
              className="
                px-3 py-1
                border
                rounded-md
                text-xs
              "
            >
              Edit
            </button>

            <button
              onClick={() =>
                handleDelete(
              className="
                px-3 py-1
                bg-red-500
                text-white
                rounded-md
                text-xs
              "
            >
              Hapus
            </button>
          </div>
        )}
      />

      {/* ─── MODAL ───────────────────────── */}

      {openModal && (

        <div
          className="
            fixed inset-0
            bg-black/40
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
              shadow-xl
              overflow-hidden
            "
          >

            <div
              className="
                bg-gradient-to-r
                from-[#081F3F]
                to-[#0E2F5A]
                px-6 py-5
              "
            >

              <h2
                className="
                  text-2xl
                  font-bold
                  text-white
                "
              >
                {
                  isEdit
                    ? "Edit Category"
                    : "Tambah Category"
                }
              </h2>

            </div>

            <div className="p-6 space-y-5">

              <div>

                <label
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                    block mb-2
                  "
                >
                  Nama Category
                </label>

                <input
                  type="text"

                  value={
                    formData.nama_category
                  }

                  onChange={(e) =>
                    setFormData({
                      ...formData,

                      nama_category:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-4 py-3
                    outline-none
                  "
                />

              </div>

              <div>

                <label
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                    block mb-2
                  "
                >
                  Status
                </label>

                <select
                  value={
                    formData.status
                  }

                  onChange={(e) =>
                    setFormData({
                      ...formData,

                      status:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-4 py-3
                    outline-none
                  "
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                </select>

              </div>

            </div>

            <div
              className="
                border-t
                px-6 py-4
                flex justify-end
                gap-3
              "
            >

              <button
                onClick={() =>
                  setOpenModal(false)
                }

                className="
                  px-5 py-2
                  border
                  rounded-xl
                "
              >
                Batal
              </button>

              <button
                onClick={handleSubmit}

                className="
                  px-5 py-2
                  bg-[#081F3F]
                  text-white
                  rounded-xl
                "
              >
                Simpan
              </button>

            </div>

          </div>

        </div>
      )}

    </AppShell>
  );
}