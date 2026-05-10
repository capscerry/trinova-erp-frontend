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

  useEffect(() => {
    api.get("/Supplier")
      .then((res) => {
        console.log(res.data);

        const mappedData = res.data.map((item: any) => ({
          id: item.supplier_id.toString(),
          kode: item.supplier_code,
          nama: item.supplier_name,
          telepon: item.no_telp_bisnis,
          email: item.email,
          alamat: item.alamat,
        }));

        setSuppliers(mappedData);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <AppShell title="Data Supplier" subtitle="Master data supplier">
      <DataTable<Supplier>
        title="Daftar Supplier"
        columns={COLUMNS}
        data={suppliers}
        addLabel="Tambah Supplier"
        onAdd={() => {
          // TODO: buka modal tambah supplier
        }}
        keyField="id"
      />
    </AppShell>
  );
}