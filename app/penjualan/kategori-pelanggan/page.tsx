"use client";

import { useState,useEffect } from "react";
import { AppShell } from "@/components/layout";
import { DataTable, StatusBadge } from "@/components/ui";
import { KategoriCustomerModal, type KategoriFormData } from "@/components/modules/penjualan/CategoryCustomerModal";
import type { Column } from "@/components/ui";
import axios from "axios";

// ─── Type ─────────────────────────────────────────────────────────────────────
interface KategoriCustomer {
  no : string;
  id : number;
  nama: string; 
}

type CategoryResponse = {
  id:number;
  namaKategori: string;
};

const COLUMNS: Column<KategoriCustomer>[] = [
  {
    key: "no",
    label: "No",
    width: "140px",
  },
  {
    key: "nama",
    label: "Nama Kategori",
    width: "200px",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KategoriCustomerPage() {
  const [data, setData]           = useState<KategoriCustomer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState<KategoriFormData | undefined>();
  const [message,setMessage] = useState("");

  const fetchCategoryCustomer = async () => {
    try {
      const response = await axios.get("https://localhost:7283/api/category-customer");
      const result = response.data.data;

      const mapped = result.map((item: CategoryResponse, index: number) => ({
        no: (index + 1).toString(),
        id: item.id,
        nama: item.namaKategori
      }));

      setData(mapped);
    } catch (error) {
      console.error("Error fetching customer data:", error);
    }
  };

  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategoryCustomer();
  },[])
        

  // ── Handlers ────────────────────────────────────────
  const handleTambah = () => {
    setEditData(undefined);
    setModalOpen(true);
  };

  const handleSubmit = async (formData : KategoriFormData) => {
    try{
       if(formData.id){
          const response = await axios.put(`https://localhost:7283/api/category-customer/${formData.id}`,{
            NamaKategori : formData.nama,
          });
          if(response != null){
            setMessage(response.data.message);
          }
       }else{
          const response = await axios.post("https://localhost:7283/api/category-customer",{
            NamaKategori : formData.nama,
          });

          if(response != null){
            setMessage(response.data);
          }
       }
        await fetchCategoryCustomer();
    }catch(error){
      console.error("Gagal menambahkan kategori:", error);
    }
  }

  



  const handleEdit = (row: KategoriCustomer) => {
    setEditData({
      id:row.id,
      nama : row.nama,
    });
    setModalOpen(true);
  };

  // const handleHapus = (row: KategoriCustomer) => {
  //   // TODO: ganti dengan konfirmasi dialog
  //   setData((prev) => prev.filter((k) => k.kode !== row.kode));
  // };

  // const handleSubmit = (formData: KategoriFormData) => {
  //   if (editData) {
  //     setData((prev) => prev.map((k) => (k.kode === formData.kode ? formData : k)));
  //   } else {
  //     setData((prev) => [...prev, formData]);
  //   }
  //   // TODO: ganti dengan call API ke backend
  // };

  return (
    <AppShell title="Kategori Customer" subtitle="Master data kategori pelanggan">
      {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${
              message.toLowerCase().includes("failed")
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-green-100 text-green-700 border border-green-300"
            }`}
          >
            {message}
          </div>
        )}

      <DataTable
        title="Daftar Kategori Customer"
        columns={COLUMNS}
        data={data}
        keyField="no"
        addLabel="Tambah Kategori"
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

              {/* Hapus */}
              <button
                // onClick={() => handleHapus(row)}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                          bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
              >
                Hapus
              </button>
            </div>
        )}
      />

      <KategoriCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editData}
      />

    </AppShell>
  );
}