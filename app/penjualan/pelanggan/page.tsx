"use client";

import { AppShell } from "@/components/layout";
import { CustomerFormData, CustomerModal } from "@/components/modules/penjualan/CustomerModal";
import { Column, DataTable,StatusBadge } from "@/components/ui";
import { useState } from "react";

interface Customer{
  kode:string;
  nama:string;
  email:string;
  telepon:string;
  alamat: string;
  status: string;
}

const DATA: Customer[] = [
   {
    kode: "CUST-001",
    nama: "PT Maju Bersama",
    email: "info@majubersama.co.id",
    telepon: "021-5551234",
    alamat: "Jl. Sudirman No. 12, Jakarta Pusat",
    status: "Aktif",
  },
  {
    kode: "CUST-002",
    nama: "CV Sinar Terang",
    email: "sinarterang@gmail.com",
    telepon: "031-7778888",
    alamat: "Jl. Pemuda No. 45, Surabaya",
    status: "Aktif",
  },
  {
    kode: "CUST-003",
    nama: "Toko Berkah Jaya",
    email: "berkah.jaya@yahoo.com",
    telepon: "024-4442222",
    alamat: "Jl. Pandanaran No. 8, Semarang",
    status: "Aktif",
  },
  {
    kode: "CUST-004",
    nama: "PT Karya Mandiri",
    email: "karyamandiri@gmail.com",
    telepon: "022-3339999",
    alamat: "Jl. Asia Afrika No. 77, Bandung",
    status: "Non-aktif",
  },
  {
    kode: "CUST-005",
    nama: "UD Sejahtera",
    email: "ud.sejahtera@gmail.com",
    telepon: "0274-556677",
    alamat: "Jl. Malioboro No. 3, Yogyakarta",
    status: "Aktif",
  }
]

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
      <span className="text-slate-500 text-xs leading-relaxed">{String(val)}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "120px",
    render: (val) => <StatusBadge status={String(val)} />,
  },
]


export default function CustomerPage(){
  const [data,setData] = useState<Customer[]>(DATA);
  const [modalOpen,setModalOpen] = useState(false);
  const [editData,setEditData] = useState<CustomerFormData | undefined>();

    const handleTambah = () => {
    setEditData(undefined);
    setModalOpen(true);
  };

  const handleEdit = (row: Customer) => {
    setEditData(row as CustomerFormData);
    setModalOpen(true);
  };

  const handleDetail = (row: Customer) => {
    // TODO: navigasi ke halaman detail
    console.log("Detail:", row);
  };

  const handleHapus = (row: Customer) => {
    // TODO: ganti dengan konfirmasi dialog
    setData((prev) => prev.filter((c) => c.kode !== row.kode));
  };

  const handleSubmit = (formData: CustomerFormData) => {
    if (editData) {
      // Mode edit → update row yang ada
      setData((prev) => prev.map((c) => (c.kode === formData.kode ? formData : c)));
    } else {
      // Mode tambah → append row baru
      setData((prev) => [...prev, formData]);
    }
    // TODO: ganti dengan call API ke backend
  };


   return(
     <AppShell title="Data Pelanggan" subtitle="Master data pelanggan">
      <DataTable<Customer>
        title="Daftar Pelanggan"
        columns={COLUMNS}
        data={DATA}
        keyField="kode"
        addLabel="Tambah Pelanggan"
        onAdd={handleTambah}
        renderActions={(row)=>(
          <div className="flex items-center gap-1.5 justify-center">
             <button
              onClick={() => handleDetail(row)}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-slate-100 text-navy-700 hover:bg-slate-200 transition-colors"
            >
              Detail
            </button>

              {/* Edit */}
            <button
              onClick={() => handleEdit(row)}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Edit
            </button>

            {/* Hapus */}
            <button
              onClick={() => handleHapus(row)}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            >
              Hapus
            </button>
          </div>
        )}
      >

      </DataTable> 
      
      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editData}
      />
     </AppShell>
   )
}