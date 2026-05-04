"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";

// ─── Type ──────────────────────────────────────────────────────────────────────
interface Brand{
  id: string;
  nama: string;
}

// ─── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<Brand>[] = [
  {
    key: "no",
    label: "No",
    width: "60px",
    render: (val) => (
      <span className="text-slate-600">{ 1}</span>
    ),
  },
  {
    key: "nama",
    label: "Nama",
    width: "200px",
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function UnitOfMeasurePage() {
  return (
    <AppShell title="Unit Of Measure" subtitle="Kelola satuan unit">
      <DataTable<Brand>
        title="Unit Of Measure"
        columns={COLUMNS}
        data={[]} // tanpa data
        addLabel="Tambah UoM"
        onAdd={() => {
          // TODO: buka modal tambah UoM
        }}
        keyField="id"
      />
    </AppShell>
  );
}