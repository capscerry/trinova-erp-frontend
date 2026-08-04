"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notify } from "@/lib/notify";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

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
  getSupplierProductsBySupplier,
  updateSupplierProduct,
  deleteSupplierProduct,

  getSupplierCategory,
} from "@/lib/services";

// --- Type ----------------------------------------------------------------------

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

interface SupplierCatalogItem {
  supplier_product_id: number;
  product_id: number;
  product_name: string;
  supplier_price: number;
  available_stock: number;
  lead_time_days: number;
  is_available: boolean;
  reserved_quantity: number;
  available_to_order: number;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);

// --- Status badge --------------------------------------------------------------

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

// --- Columns -------------------------------------------------------------------

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

// --- Page ----------------------------------------------------------------------

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

  // --- Supplier catalog (shown inside Detail Supplier) ---------------------
  const [catalogItems, setCatalogItems] = useState<SupplierCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null);
  const [catalogEditForm, setCatalogEditForm] = useState({
    supplier_price: "",
    available_stock: "",
    lead_time_days: "",
    is_available: true,
  });
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogDeleteConfirm, setCatalogDeleteConfirm] = useState<{
    open: boolean;
    id: number;
    name: string;
  }>({ open: false, id: 0, name: "" });
  const [catalogDeleteLoading, setCatalogDeleteLoading] = useState(false);

  const [catalogFile,
    setCatalogFile] =
      useState<File | null>(
        null
      );

  const [saving,setSaving] = useState(false);

  // --- Delete confirmation -------------------------------------------------
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // --- Fetch Supplier ---------------------------------------------------------

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

  // --- Fetch Categories -------------------------------------------------------

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

  // --- Submit -----------------------------------------------------------------

  const handleSubmit = async()=> {
    if(saving) return;
    setSaving(true);
    try{
      if(isEdit){
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

          // If a catalog file was attached during edit, re-import it.
          // The backend endpoint uses INSERT ... ON CONFLICT (supplier_id, product_id)
          // DO UPDATE so every row is an upsert — existing rows are overwritten,
          // new rows are inserted. Stock is REPLACED, not incremented.
          if (catalogFile) {

            await importSupplierCatalog(
              Number(selectedId),
              catalogFile
            );
          }

          notify.success("Supplier berhasil diupdate");

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

            const supplierId = response.data.supplier_id;
            if(catalogFile){
              await importSupplierCatalog(supplierId, catalogFile); 
            }
            notify.success("Supplier berhasil ditambahkan");
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
    }catch (err: any) {
      // console.error(err);
      notify.error("Gagal simpan supplier", err.message);
    }finally{
      setSaving(false);
    }

  }

  // const handleSubmit =
  //   async () => {

  //     try {

  //       if (isEdit) {

  //         await updateSupplier(
  //           selectedId,
  //           {
  //             supplier_code:
  //               formData.supplier_code,

  //             supplier_name:
  //               formData.supplier_name,

  //             no_telp_bisnis:
  //               formData.no_telp_bisnis,

  //             email:
  //               formData.email,

  //             alamat:
  //               formData.alamat,

  //             category_supplier:
  //               Number(
  //                 formData.category_supplier
  //               ),

  //             status: formData.status,
  //           }
  //         );

  //         notify.success("Supplier berhasil diupdate");

  //       } else {

  //         const response =
  //           await createSupplier({
  //             supplier_code:
  //               formData.supplier_code,

  //             supplier_name:
  //               formData.supplier_name,

  //             no_telp_bisnis:
  //               formData.no_telp_bisnis,

  //             email:
  //               formData.email,

  //             alamat:
  //               formData.alamat,

  //             category_supplier:
  //               Number(
  //                 formData.category_supplier
  //               ),

  //             status: formData.status,
  //           });

  //         const supplierId =
  //           response.data.supplier_id;

  //         // --- Import Catalog -----------------

  //         if (catalogFile) {

  //           await importSupplierCatalog(
  //             supplierId,
  //             catalogFile
  //           );
  //         }

  //         notify.success("Supplier berhasil ditambahkan");
  //       }

  //       fetchSuppliers();

  //       setFormData({
  //         supplier_code: "",
  //         supplier_name: "",
  //         no_telp_bisnis: "",
  //         email: "",
  //         alamat: "",
  //         category_supplier: "",
  //         status: "Active",
  //       });

  //       setCatalogFile(null);

  //       setIsEdit(false);

  //       setSelectedId("");

  //       setOpenModal(false);

  //     } catch (err: any) {

  //       console.error(err);

  //       notify.error("Gagal simpan supplier", err.message);
  //     }
  //   };

  // --- Delete -----------------------------------------------------------------

  const handleDelete = (id: string) => {
    const row = suppliers.find((s) => s.id === id);
    setConfirmDelete({ open: true, id, name: row?.nama ?? id });
  };

  const executeDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteSupplier(confirmDelete.id);
      notify.success("Supplier berhasil dihapus");
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      notify.error("Gagal hapus supplier");
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, id: "", name: "" });
    }
  };

  // --- Edit -------------------------------------------------------------------

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

      setCatalogFile(null);

      setOpenModal(true);
    };

  // --- Detail -----------------------------------------------------------------

  const fetchCatalog = async (supplierId: string) => {
    setCatalogLoading(true);
    try {
      const res = await getSupplierProductsBySupplier(Number(supplierId));
      const list: any[] = Array.isArray(res) ? res : res?.data ?? [];
      setCatalogItems(
        list.map((item: any) => {
          const availableStock = Number(item.available_stock ?? item.availableStock) || 0;
          const reservedQuantity =
            Number(item.reserved_quantity ?? item.reservedQuantity) || 0;
          const availableToOrder =
            item.available_to_order ?? item.availableToOrder;

          return {
            supplier_product_id: Number(item.supplier_product_id),
            product_id: Number(item.product_id),
            product_name: item.product_name || `Produk #${item.product_id}`,
            supplier_price: Number(item.supplier_price) || 0,
            available_stock: availableStock,
            lead_time_days: Number(item.lead_time_days) || 0,
            is_available: Boolean(item.is_available),
            reserved_quantity: reservedQuantity,
            available_to_order:
              availableToOrder != null
                ? Number(availableToOrder)
                : Math.max(availableStock - reservedQuantity, 0),
          };
        })
      );
    } catch (err) {
      console.error(err);
      notify.error("Gagal memuat katalog supplier");
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleDetail =
    (row: Supplier) => {

      setDetailData(row);

      setOpenDetail(true);

      setEditingCatalogId(null);

      fetchCatalog(row.id);
    };

  const startEditCatalogRow = (item: SupplierCatalogItem) => {
    setEditingCatalogId(item.supplier_product_id);
    setCatalogEditForm({
      supplier_price: String(item.supplier_price),
      available_stock: String(item.available_stock),
      lead_time_days: String(item.lead_time_days),
      is_available: item.is_available,
    });
  };

  const cancelEditCatalogRow = () => {
    setEditingCatalogId(null);
  };

  const saveCatalogRow = async (item: SupplierCatalogItem) => {
    if (catalogSaving) return;
    setCatalogSaving(true);
    try {
      await updateSupplierProduct(item.supplier_product_id, {
        supplier_price: Number(catalogEditForm.supplier_price) || 0,
        available_stock: Number(catalogEditForm.available_stock) || 0,
        lead_time_days: Number(catalogEditForm.lead_time_days) || 0,
        is_available: catalogEditForm.is_available,
      });
      notify.success("Item katalog berhasil diperbarui");
      setEditingCatalogId(null);
      if (detailData) await fetchCatalog(detailData.id);
    } catch (err: any) {
      console.error(err);
      notify.error("Gagal memperbarui item katalog", err.message);
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleDeleteCatalogRow = (item: SupplierCatalogItem) => {
    setCatalogDeleteConfirm({
      open: true,
      id: item.supplier_product_id,
      name: item.product_name,
    });
  };

  const executeCatalogDelete = async () => {
    setCatalogDeleteLoading(true);
    try {
      await deleteSupplierProduct(catalogDeleteConfirm.id);
      notify.success("Item katalog berhasil dihapus");
      if (detailData) await fetchCatalog(detailData.id);
    } catch (err) {
      console.error(err);
      notify.error("Gagal menghapus item katalog");
    } finally {
      setCatalogDeleteLoading(false);
      setCatalogDeleteConfirm({ open: false, id: 0, name: "" });
    }
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

      {/* --- Confirm Delete -------------------------------- */}

      <ConfirmDialog
        open={confirmDelete.open}
        title="Hapus Supplier"
        message={`Yakin ingin menghapus supplier "${confirmDelete.name}"?`}
        detail="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        loading={deleteLoading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ open: false, id: "", name: "" })}
      />

      {/* --- Confirm Delete Catalog Row ---------------------- */}

      <ConfirmDialog
        open={catalogDeleteConfirm.open}
        title="Hapus Item Katalog"
        message={`Yakin ingin menghapus "${catalogDeleteConfirm.name}" dari katalog supplier ini?`}
        detail="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        loading={catalogDeleteLoading}
        onConfirm={executeCatalogDelete}
        onCancel={() => setCatalogDeleteConfirm({ open: false, id: 0, name: "" })}
      />

      {/* --- Modal Form ------------------------------------- */}

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
        saving = {saving}

        setCatalogFile={
          setCatalogFile
        }
      />

      {/* --- Detail Modal ----------------------------------- */}

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
              max-w-3xl
              max-h-[85vh]
              shadow-2xl
              border
              border-slate-200
              overflow-hidden
              flex flex-col
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
                -
              </button>

            </div>

            {/* Body */}

            <div className="p-6 space-y-4 overflow-y-auto flex-1">

              <div className="grid grid-cols-2 gap-3">
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
                      {value || "-"}
                    </p>

                  </div>

                ))}
              </div>

              {/* Katalog Produk ------------------------------------------- */}

              <div className="border border-slate-200 rounded-xl overflow-hidden">

                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Katalog Produk
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perbaiki harga/stok yang salah atau hapus baris duplikat hasil upload.
                  </p>
                </div>

                {catalogLoading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-8">
                    <Loader2 size={16} className="animate-spin" />
                    Memuat katalog...
                  </div>
                ) : catalogItems.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-8">
                    Belum ada produk di katalog supplier ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                          <th className="px-4 py-2">Produk</th>
                          <th className="px-4 py-2">Harga</th>
                          <th className="px-4 py-2">Stok Supplier</th>
                          <th className="px-4 py-2">Reserved</th>
                          <th className="px-4 py-2">Tersedia Dipesan</th>
                          <th className="px-4 py-2">Lead Time</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {catalogItems.map((item) => {
                          const isEditing = editingCatalogId === item.supplier_product_id;
                          return (
                            <tr key={item.supplier_product_id}>
                              <td className="px-4 py-2 font-medium text-slate-700">
                                {item.product_name}
                              </td>

                              <td className="px-4 py-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={catalogEditForm.supplier_price}
                                    onChange={(e) =>
                                      setCatalogEditForm((f) => ({ ...f, supplier_price: e.target.value }))
                                    }
                                    className="w-24 border border-slate-300 rounded-md px-2 py-1 text-sm"
                                  />
                                ) : (
                                  formatRupiah(item.supplier_price)
                                )}
                              </td>

                              <td className="px-4 py-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={catalogEditForm.available_stock}
                                    onChange={(e) =>
                                      setCatalogEditForm((f) => ({ ...f, available_stock: e.target.value }))
                                    }
                                    className="w-20 border border-slate-300 rounded-md px-2 py-1 text-sm"
                                  />
                                ) : (
                                  item.available_stock
                                )}
                              </td>

                              <td className="px-4 py-2 text-amber-600">
                                {item.reserved_quantity > 0 ? item.reserved_quantity : "-"}
                              </td>

                              <td className="px-4 py-2 font-semibold text-emerald-700">
                                {item.available_to_order}
                              </td>

                              <td className="px-4 py-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={catalogEditForm.lead_time_days}
                                    onChange={(e) =>
                                      setCatalogEditForm((f) => ({ ...f, lead_time_days: e.target.value }))
                                    }
                                    className="w-20 border border-slate-300 rounded-md px-2 py-1 text-sm"
                                  />
                                ) : (
                                  `${item.lead_time_days} hari`
                                )}
                              </td>

                              <td className="px-4 py-2">
                                {isEditing ? (
                                  <select
                                    value={catalogEditForm.is_available ? "1" : "0"}
                                    onChange={(e) =>
                                      setCatalogEditForm((f) => ({ ...f, is_available: e.target.value === "1" }))
                                    }
                                    className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                                  >
                                    <option value="1">Available</option>
                                    <option value="0">Unavailable</option>
                                  </select>
                                ) : (
                                  <StatusBadge status={item.is_available ? "Active" : "Inactive"} />
                                )}
                              </td>

                              <td className="px-4 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => saveCatalogRow(item)}
                                        disabled={catalogSaving}
                                        title="Simpan"
                                        className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                      >
                                        {catalogSaving ? (
                                          <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                          <Check size={14} />
                                        )}
                                      </button>
                                      <button
                                        onClick={cancelEditCatalogRow}
                                        disabled={catalogSaving}
                                        title="Batal"
                                        className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => startEditCatalogRow(item)}
                                        title="Edit"
                                        className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCatalogRow(item)}
                                        title="Hapus"
                                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

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
