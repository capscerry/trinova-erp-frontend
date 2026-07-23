"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

import SupplierFormModal from "@/components/modules/pembelian/SupplierFormModal";

import { useEffect, useState } from "react";

import {
  getSuppliers,
  getNextSupplierCode,
  migrateSupplierCodes,
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
  status: string;
}

interface SupplierCategory {
  category_supplier: string;
  nama_category: string;
  is_active?: boolean;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const active = status === "Active";
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
    key: "status",
    label: "STATUS",
    render: (value) => <StatusBadge status={value as string} />,
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
      status: "Active",
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
              item.supplier_code || "",

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

            status:
              item.status || "Active",
          })
        );

      // Sort newest first (highest supplier_id first)
      setSuppliers(
        mappedData.sort(
          (a: Supplier, b: Supplier) =>
            Number(b.id) - Number(a.id)
        )
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

        const raw: any[] =
          res.data || res || [];

        // Normalise to the shape the modal expects:
        // { category_supplier: string, nama_category: string, is_active: boolean }
        const mapped = raw.map(
          (item: any) => ({
            category_supplier:
              String(
                item.category_supplier ??
                item.category_id ??
                ""
              ),
            nama_category:
              item.nama_category ??
              item.category_name ??
              "",
            is_active:
              item.is_active === undefined ? true : Boolean(item.is_active),
          })
        );

        setCategories(mapped);

      } catch (err) {

        console.error(err);
      }
    };

  useEffect(() => {

    // Run once on mount: normalise any legacy codes in the DB, then load
    migrateSupplierCodes().catch(console.error);

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

              status: formData.status,
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

              status: formData.status,
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
          status: "Active",
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

        status:
          row.status || "Active",
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

        nameField="nama"

        onAdd={async () => {

          setIsEdit(false);

          const nextCode =
            await getNextSupplierCode().catch(
              () => ""
            );

          setFormData({
            supplier_code: nextCode,
            supplier_name: "",
            no_telp_bisnis: "",
            email: "",
            alamat: "",
            category_supplier: "",
            status: "Active",
          });

          setCatalogFile(null);

          setOpenModal(true);
        }}

        keyField="id"

        renderActions={(row) => (

          <div className="flex gap-1.5 justify-center">

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDetail(row)}
            >
              Detail
            </Button>

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
              onClick={() => handleDelete(row.id)}
            >
              Hapus
            </Button>

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
                bg-linear-to-r
                from-navy-900
                to-navy-600
              "
            >

              <div>

                <h2 className="text-white font-semibold text-[15px]">
                  Detail Supplier
                </h2>

                <p className="text-slate-400 text-xs mt-0.5">
                  Informasi lengkap supplier
                </p>

              </div>

              <button
                onClick={() => setOpenDetail(false)}
                className="
                  w-8 h-8
                  rounded-lg
                  flex items-center justify-center
                  text-slate-400
                  hover:text-white hover:bg-white/10
                  transition-colors
                "
              >
                ✕
              </button>

            </div>

            {/* Body */}

            <div className="p-6 space-y-4">

              {[
                { label: "Kode Supplier", value: detailData.kode },
                { label: "Nama Supplier", value: detailData.nama },
                { label: "Telepon",       value: detailData.telepon },
                { label: "Email",         value: detailData.email },
                { label: "Alamat",        value: detailData.alamat },
              ].map(({ label, value }) => (

                <div key={label} className="border border-slate-200 rounded-xl p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {label}
                  </p>

                  <p className="text-sm font-semibold text-slate-700">
                    {value || "—"}
                  </p>

                </div>

              ))}

            </div>

            {/* Footer */}

            <div
              className="
                border-t border-slate-100
                px-6 py-4
                flex justify-end
                bg-slate-50/60
              "
            >

              <Button
                variant="ghost"
                onClick={() => setOpenDetail(false)}
              >
                Tutup
              </Button>

            </div>

          </div>

        </div>
      )}

    </AppShell>
  );
}