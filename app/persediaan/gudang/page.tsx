"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";

// ─── Type ──────────────────────────────────────────────────────────────────────
interface Warehouse {
  id: string;
  nama: string;
}

// ─── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<Warehouse>[] = [
  {
    key: "no",
    label: "No",
    width: "60px",
    render: (value) => (
      <span className="text-slate-600">{ 1}</span>
    ),
  },
  {
    key: "nama",
    label: "Nama Warehouse",
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function WarehousePage() {
  return (
    <AppShell title="Warehouse" subtitle="Kelola data warehouse">
      <DataTable<Warehouse>
        title="Warehouse"
        columns={COLUMNS}
        data={[]} // tanpa data
        addLabel="Tambah Warehouse"
        onAdd={() => {
          // TODO: buka modal tambah warehouse
        }}
        keyField="id"
      />
    </AppShell>
  );
}