"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";

import SupplierFormModal from "@/components/modules/pembelian/SupplierFormModal";

import { useEffect, useState } from "react";

import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  importSupplierCatalog,

  getSupplierCategory,
} from "@/lib/services";

// ─── Type ──────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  kode: string;
  nama: string;
  telepon: string;
  email: string;
  alamat: string;

  category_supplier: string;
}

interface SupplierCategory {
  category_supplier: string;

  nama_category: string;
}

// ─── Columns ───────────────────────────────────────────────────────────────────

const COLUMNS: Column<Supplier>[] = [
  {
    key: "kode",
    label: "KODE SUPPLIER",
  },

  {
    key: "nama",
    label: "NAMA SUPPLIER",
  },

  {
    key: "telepon",
    label: "TELEPON",
  },

  {
    key: "email",
    label: "EMAIL",
  },

  {
    key: "alamat",
    label: "ALAMAT",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SupplierPage() {

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [categories, setCategories] =
    useState<SupplierCategory[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [isEdit, setIsEdit] =
    useState(false);

  const [selectedId, setSelectedId] =
    useState("");

  const [openDetail, setOpenDetail] =
    useState(false);

  const [detailData, setDetailData] =
    useState<Supplier | null>(null);

  const [catalogFile,
    setCatalogFile] =
      useState<File | null>(
        null
      );

  const [formData, setFormData] =
    useState({
      supplier_code: "",
      supplier_name: "",
      no_telp_bisnis: "",
      email: "",
      alamat: "",

      category_supplier: "",
    });

  // ─── Fetch Supplier ─────────────────────────────────────────────────────────

  const fetchSuppliers = async () => {

    try {

      const res =
        await getSuppliers();

      const supplierList =
        Array.isArray(res)
          ? res
          : res.data;

      const mappedData =
        supplierList.map(
          (item: any) => ({
            id:
              item.supplier_id
                .toString(),

            kode:
              item.supplier_code,

            nama:
              item.supplier_name,

            telepon:
              item.no_telp_bisnis
              || "-",

            email:
              item.email,

            alamat:
              item.alamat,

            category_supplier:
              item.category_supplier
                ?.toString() || "",
          })
        );

      setSuppliers(
        mappedData
      );

    } catch (err) {

      console.error(err);
    }
  };

  // ─── Fetch Categories ───────────────────────────────────────────────────────

  const fetchCategories =
    async () => {

      try {

        const res =
          await getSupplierCategory();

        setCategories(
          res.data || []
        );

      } catch (err) {

        console.error(err);
      }
    };

  useEffect(() => {

    fetchSuppliers();

    fetchCategories();

  }, []);

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit =
    async () => {

      try {

        if (isEdit) {

          await updateSupplier(
            selectedId,
            {
              supplier_code:
                formData.supplier_code,

              supplier_name:
                formData.supplier_name,

              no_telp_bisnis:
                formData.no_telp_bisnis,

              email:
                formData.email,

              alamat:
                formData.alamat,

              category_supplier:
                Number(
                  formData.category_supplier
                ),

              status: "Active",
            }
          );

          alert(
            "Supplier berhasil diupdate"
          );

        } else {

          const response =
            await createSupplier({
              supplier_code:
                formData.supplier_code,

              supplier_name:
                formData.supplier_name,

              no_telp_bisnis:
                formData.no_telp_bisnis,

              email:
                formData.email,

              alamat:
                formData.alamat,

              category_supplier:
                Number(
                  formData.category_supplier
                ),

              status: "Active",
            });

          const supplierId =
            response.data.supplier_id;

          // ─── Import Catalog ─────────────────

          if (catalogFile) {

            await importSupplierCatalog(
              supplierId,
              catalogFile
            );
          }

          alert(
            "Supplier berhasil ditambahkan"
          );
        }

        fetchSuppliers();

        setFormData({
          supplier_code: "",
          supplier_name: "",
          no_telp_bisnis: "",
          email: "",
          alamat: "",

          category_supplier: "",
        });

        setCatalogFile(null);

        setIsEdit(false);

        setSelectedId("");

        setOpenModal(false);

      } catch (err: any) {

        console.error(err);

        alert(
          err.message ||
          "Gagal simpan supplier"
        );
      }
    };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete =
    async (id: string) => {

      const confirmDelete =
        confirm(
          "Yakin ingin menghapus supplier ini?"
        );

      if (!confirmDelete)
        return;

      try {

        await deleteSupplier(id);

        alert(
          "Supplier berhasil dihapus"
        );

        fetchSuppliers();

      } catch (error) {

        console.error(error);

        alert(
          "Gagal hapus supplier"
        );
      }
    };

  // ─── Edit ───────────────────────────────────────────────────────────────────

  const handleEdit =
    (row: Supplier) => {

      setIsEdit(true);

      setSelectedId(
        row.id
      );

      setFormData({
        supplier_code:
          row.kode,

        supplier_name:
          row.nama,

        no_telp_bisnis:
          row.telepon,

        email:
          row.email,

        alamat:
          row.alamat,

        category_supplier:
          row.category_supplier,
      });

      setOpenModal(true);
    };

  // ─── Detail ─────────────────────────────────────────────────────────────────

  const handleDetail =
    (row: Supplier) => {

      setDetailData(row);

      setOpenDetail(true);
    };

  return (

    <AppShell
      title="Data Supplier"
      subtitle="Master data supplier"
    >

      <DataTable<Supplier>

        title="Daftar Supplier"

        columns={COLUMNS}

        data={suppliers}

        addLabel="Tambah Supplier"

        onAdd={() => {

          setIsEdit(false);

          setFormData({
            supplier_code: "",
            supplier_name: "",
            no_telp_bisnis: "",
            email: "",
            alamat: "",

            category_supplier: "",
          });

          setCatalogFile(null);

          setOpenModal(true);
        }}

        keyField="id"

        renderActions={(row) => (

          <div className="flex gap-2">

            <button
              onClick={() =>
                handleDetail(row)
              }
              className="
                px-3 py-1
                border
                rounded-md
                text-xs
              "
            >
              Detail
            </button>

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
                  row.id
                )
              }
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

      {/* ─── Modal Form ───────────────────────────────────── */}

      <SupplierFormModal

        open={openModal}

        isEdit={isEdit}

        formData={formData}

        setFormData={setFormData}

        categories={categories}

        onClose={() =>
          setOpenModal(false)
        }

        onSave={handleSubmit}

        setCatalogFile={
          setCatalogFile
        }
      />

      {/* ─── Detail Modal ─────────────────────────────────── */}

      {openDetail &&
        detailData && (

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
                Detail Supplier
              </h2>

            </div>

            <div className="p-6 space-y-5">

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                  Kode Supplier
                </p>

                <p className="font-semibold">
                  {detailData.kode}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                  Nama Supplier
                </p>

                <p className="font-semibold">
                  {detailData.nama}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                  Telepon
                </p>

                <p className="font-semibold">
                  {detailData.telepon}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                  Email
                </p>

                <p className="font-semibold">
                  {detailData.email}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                  Alamat
                </p>

                <p className="font-semibold">
                  {detailData.alamat}
                </p>
              </div>

            </div>

            <div
              className="
                border-t
                px-6 py-4
                flex justify-end
              "
            >

              <button
                onClick={() =>
                  setOpenDetail(false)
                }
                className="
                  px-5 py-2
                  border
                  rounded-xl
                  hover:bg-gray-50
                  transition
                "
              >
                Tutup
              </button>

            </div>

          </div>

        </div>
      )}

    </AppShell>
  );
}