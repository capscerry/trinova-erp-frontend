"use client";

import { AppShell } from "@/components/layout";
import {
  CustomerFormData,
  CustomerModal,
} from "@/components/modules/penjualan/CustomerModal";
import { Column, DataTable, StatusBadge } from "@/components/ui";
import { useEffect, useState } from "react";

interface Customer {
  id: number;
  kode: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  status: boolean;
  category: string;
}

interface CustomerApi {
  customerId: number;
  customerCode: string;
  customerName: string;
  email: string;
  noTelpBisnis: string;
  alamat: string;
  isActive: boolean;
  categoryName?: string;
}

const COLUMNS: Column<Customer>[] = [
  {
    key: "kode",
    label: "Kode Customer",
    width: "140px",
  },
  {
    key: "nama",
    label: "Nama Customer",
  },
  {
    key: "category",
    label: "Kategori",
    render: (val) => (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
        {String(val)}
      </span>
    ),
  },
  {
    key: "email",
    label: "Email",
    render: (val) => (
      <span className="text-navy-600 font-sans">{String(val)}</span>
    ),
  },
  {
    key: "telepon",
    label: "No. Telepon",
    render: (val) => (
      <span className="font-sans text-slate-600">{String(val)}</span>
    ),
  },
  {
    key: "alamat",
    label: "Alamat",
    render: (val) => (
      <span className="text-slate-500 text-xs leading-relaxed">
        {String(val)}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "120px",
    render: (val) => <StatusBadge status={val ? "Aktif" : "Nonaktif"} />,
  },
];

export default function CustomerPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<CustomerFormData | undefined>();
  const [editId, setEditId] = useState<number | undefined>()
  const [loading, setLoading] = useState(false);

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

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://localhost:7283/api/customer");

      if (!response.ok) {
        throw new Error("Failed to fetch customer data");
      }

      const result = await response.json();

      const mappedData: Customer[] = (result.data || []).map(
        (item: CustomerApi) => ({
          id: item.customerId,
          kode: item.customerCode,
          nama: item.customerName,
          email: item.email,
          telepon: item.noTelpBisnis,
          alamat: item.alamat,
          status: item.isActive,
          category: item.categoryName || "-",
        })
      );

      setData(mappedData);
    } catch (error) {
      console.error("Error fetching:", error);
      showToast("Gagal mengambil data customer", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleTambah = () => {
    setEditId(undefined)
    setEditData(undefined);
    setModalOpen(true);
  };

  const handleEdit = (row: Customer) => {
    setEditId(row.id)  // ✅ simpan id yang diedit
    setEditData({
      kode: row.kode,
      nama: row.nama,
      email: row.email,
      telepon: row.telepon,
      alamat: row.alamat,
      status: row.status ? "Aktif" : "Nonaktif",
      category: row.category,
    } as CustomerFormData);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditId(undefined)
    setEditData(undefined)
  }

  const insertCustomer = async (formData: CustomerFormData) => {
    try {
      setLoading(true);

      const payload = {
        customerCode: formData.kode,
        customerName: formData.nama,
        email: formData.email,
        noTelpBisnis: formData.telepon,
        alamat: formData.alamat,
        isActive: formData.status === "Aktif",
        categoryId: Number(formData.category),
      };

      const response = await fetch("https://localhost:7283/api/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add customer");
      }

      showToast("Customer berhasil ditambahkan", "success");
      setModalOpen(false);
      await fetchCustomerData();
    } catch (error) {
      console.error("Error:", error);
      showToast("Gagal menambah customer", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fungsi update customer
  const updateCustomer = async (id: number, formData: CustomerFormData) => {
    try {
      setLoading(true)

      const payload = {
        customerCode: formData.kode,
        customerName: formData.nama,
        email: formData.email,
        noTelpBisnis: formData.telepon,
        alamat: formData.alamat,
        isActive: formData.status === 'Aktif',
        categoryId: Number(formData.category)
      }

      const response = await fetch(`https://localhost:7283/api/customer/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update customer')
      }

      showToast('Customer berhasil diupdate', 'success')
      handleCloseModal()
      await fetchCustomerData()
    } catch (error) {
      console.error('Error:', error)
      showToast('Gagal mengupdate customer', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleCustomerStatus = async (id: number) => {
    const response = await fetch(
      `https://localhost:7283/api/customer/${id}/status`,
      {
        method: "PATCH",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update customer status");
    }

    const result = await response.json();
    return result.status === true;
  };

  const confirmToggleStatus = async () => {
    if (!confirmStatus) return;

    try {
      const success = await toggleCustomerStatus(confirmStatus.id);

      if (success) {
        showToast(
          `Customer "${confirmStatus.nama}" berhasil ${
            confirmStatus.currentStatus ? "dinonaktifkan" : "diaktifkan"
          }`,
          "success"
        );
        setConfirmStatus(null);
        await fetchCustomerData();
      } else {
        showToast("Gagal mengubah status customer", "error");
      }
    } catch (err) {
      console.error("Gagal update status customer", err);
      showToast("Gagal mengubah status customer", "error");
    }
  };

  // ✅ handleSubmit sekarang bedakan insert vs update
  const handleSubmit = (formData: CustomerFormData) => {
    if (editData && editId) {
      updateCustomer(editId, formData)
    } else {
      insertCustomer(formData)
    }
  };

  return (
    <AppShell title="Data Pelanggan" subtitle="Master data pelanggan">
      <DataTable<Customer>
        title="Daftar Pelanggan"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Tambah Pelanggan"
        onAdd={handleTambah}
        renderActions={(row) => (
          <div className="flex items-center gap-1.5 justify-center">
            <button
              onClick={() => handleEdit(row)}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Edit
            </button>

            <button
              onClick={() =>
                setConfirmStatus({
                  open: true,
                  id: row.id,
                  nama: row.nama,
                  currentStatus: row.status,
                })
              }
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors text-white ${
                row.status
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {row.status ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
      />

      <CustomerModal
        open={modalOpen}
        onClose={handleCloseModal}
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
                  ? "Deactivate Customer?"
                  : "Activate Customer?"}
              </h3>
              <p className="mt-1 text-sm opacity-90 font-serif">
                {confirmStatus.currentStatus
                  ? "Customer akan dinonaktifkan."
                  : "Customer akan diaktifkan kembali."}
              </p>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 font-serif">
                Apakah kamu yakin ingin{" "}
                <span className="font-bold text-slate-900">
                  {confirmStatus.currentStatus ? "menonaktifkan" : "mengaktifkan"}
                </span>{" "}
                customer{" "}
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