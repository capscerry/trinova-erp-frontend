"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";

// ─── Type ─────────────────────────────────────────────────────────────
interface CategorySupplier {
  id: string;
  name: string;
  status: string;
}

// ─── Columns ──────────────────────────────────────────────────────────
const COLUMNS: Column<CategorySupplier>[] = [
  {
    key: "id",
    label: "Kode Supplier",
    width: "140px",
  },
  {
    key: "name",
    label: "Nama Supplier",
  },
  {
    key: "status",
    label: "Status",
    width: "140px",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────
export default function SupplierPage() {
  return (
    <AppShell
      title="Data Supplier"
      subtitle="Master data supplier"
    >
      <DataTable<CategorySupplier>
        title="Daftar Supplier"
        columns={COLUMNS}
        data={[]}
        addLabel="Tambah Supplier"
        onAdd={() => {
          // TODO
        }}
        keyField="id"
      />
    </AppShell>
  );
}