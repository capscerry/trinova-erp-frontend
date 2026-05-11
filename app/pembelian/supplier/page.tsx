"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ─── Type ──────────────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  kode: string;
  nama: string;
  telepon: string;
  email: string;
  alamat: string;
}

// ─── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<Supplier>[] = [
  { key: "kode", label: "Kode Supplier", width: "140px" },
  { key: "nama", label: "Nama Supplier" },
  { key: "telepon", label: "Telepon", width: "140px" },
  { key: "email", label: "Email", width: "200px" },
  { key: "alamat", label: "Alamat" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SupplierPage() {

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openModal, setOpenModal] = useState(false);

  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const [openDetail, setOpenDetail] = useState(false);
  const [detailData, setDetailData] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    supplier_code: "",
    supplier_name: "",
    no_telp_bisnis: "",
    email: "",
    alamat: "",
  });

  // ─── Fetch Supplier ─────────────────────────────────────────────────────────
  const fetchSuppliers = async () => {
    try {

      const res = await api.get("/Supplier");

      const mappedData = res.data.map((item: any) => ({
        id: item.supplier_id.toString(),
        kode: item.supplier_code,
        nama: item.supplier_name,
        telepon: item.no_telp_bisnis,
        email: item.email,
        alamat: item.alamat,
      }));

      setSuppliers(mappedData);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {

    // ─── Validation ─────────────────────────────────────────────
    if (
      !formData.supplier_code ||
      !formData.supplier_name ||
      !formData.no_telp_bisnis ||
      !formData.email ||
      !formData.alamat
    ) {
      alert("Semua field wajib diisi");
      return;
    }

    // email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      alert("Format email tidak valid");
      return;
    }

    // phone validation
    if (formData.no_telp_bisnis.length < 10) {
      alert("Nomor telepon minimal 10 digit");
      return;
    }

    try {

      if (isEdit) {

        await api.put(`/Supplier/${selectedId}`, {
          supplier_code: formData.supplier_code,
          supplier_name: formData.supplier_name,
          no_telp_bisnis: formData.no_telp_bisnis,
          email: formData.email,
          alamat: formData.alamat,
          category_supplier: 1,
          status: "Active",
        });

        alert("Supplier berhasil diupdate");

      } else {

        await api.post("/Supplier", {
          supplier_code: formData.supplier_code,
          supplier_name: formData.supplier_name,
          no_telp_bisnis: formData.no_telp_bisnis,
          email: formData.email,
          alamat: formData.alamat,
          category_supplier: 1,
          status: "Active",
        });

        alert("Supplier berhasil ditambahkan");
      }

      fetchSuppliers();

      setFormData({
        supplier_code: "",
        supplier_name: "",
        no_telp_bisnis: "",
        email: "",
        alamat: "",
      });

      setIsEdit(false);
      setSelectedId("");

      setOpenModal(false);

    } catch (error) {
      console.error(error);

      alert("Gagal simpan supplier");
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {

    const confirmDelete = confirm(
      "Yakin ingin menghapus supplier ini?"
    );

    if (!confirmDelete) return;

    try {

      await api.delete(`/Supplier/${id}`);

      alert("Supplier berhasil dihapus");

      fetchSuppliers();

    } catch (error) {
      console.error(error);

      alert("Gagal hapus supplier");
    }
  };

  // ─── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (row: Supplier) => {

    setIsEdit(true);

    setSelectedId(row.id);

    setFormData({
      supplier_code: row.kode,
      supplier_name: row.nama,
      no_telp_bisnis: row.telepon,
      email: row.email,
      alamat: row.alamat,
    });

    setOpenModal(true);
  };

  // ─── Detail ─────────────────────────────────────────────────────────────────
  const handleDetail = (row: Supplier) => {

    setDetailData(row);

    setOpenDetail(true);
  };

  return (
    <AppShell title="Data Supplier" subtitle="Master data supplier">

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
          });

          setOpenModal(true);
        }}
        keyField="id"
        renderActions={(row) => (
          <div className="flex gap-1.5 justify-center">

            <button
              onClick={() => handleDetail(row)}
              className="px-2 py-1 border rounded text-xs"
            >
              Detail
            </button>

            <button
              onClick={() => handleEdit(row)}
              className="px-2 py-1 border rounded text-xs"
            >
              Edit
            </button>

            <button
              onClick={() => handleDelete(row.id)}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              Hapus
            </button>
          </div>
        )}
      />

      {/* ─── Create / Edit Modal ───────────────────────────────────────────── */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[500px]">

            <h2 className="text-xl font-bold mb-4">
              {isEdit ? "Edit Supplier" : "Tambah Supplier"}
            </h2>

            <input
              type="text"
              placeholder="Kode Supplier"
              value={formData.supplier_code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supplier_code: e.target.value,
                })
              }
              className="w-full border p-2 rounded mb-3"
            />

            <input
              type="text"
              placeholder="Nama Supplier"
              value={formData.supplier_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supplier_name: e.target.value,
                })
              }
              className="w-full border p-2 rounded mb-3"
            />

            <input
              type="text"
              placeholder="Telepon"
              value={formData.no_telp_bisnis}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  no_telp_bisnis: e.target.value,
                })
              }
              className="w-full border p-2 rounded mb-3"
            />

            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value,
                })
              }
              className="w-full border p-2 rounded mb-3"
            />

            <textarea
              placeholder="Alamat"
              value={formData.alamat}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  alamat: e.target.value,
                })
              }
              className="w-full border p-2 rounded mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 border rounded"
              >
                Batal
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {isEdit ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─────────────────────────────────────────────────── */}
      {openDetail && detailData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[500px]">

            <h2 className="text-xl font-bold mb-4">
              Detail Supplier
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold">Kode Supplier:</span>
                <p>{detailData.kode}</p>
              </div>

              <div>
                <span className="font-semibold">Nama Supplier:</span>
                <p>{detailData.nama}</p>
              </div>

              <div>
                <span className="font-semibold">Telepon:</span>
                <p>{detailData.telepon}</p>
              </div>

              <div>
                <span className="font-semibold">Email:</span>
                <p>{detailData.email}</p>
              </div>

              <div>
                <span className="font-semibold">Alamat:</span>
                <p>{detailData.alamat}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setOpenDetail(false)}
                className="px-4 py-2 border rounded"
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