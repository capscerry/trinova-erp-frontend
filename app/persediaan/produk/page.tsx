"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";

// ─── Type ──────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  namaBarang: string;
  kodeBarang: string;
  jenisBarang: string;
  satuan: string;
  kts: number;
  stokDapatDijual: number;
}

// ─── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<Product>[] = [
  {
    key: "namaBarang",
    label: "Nama Barang",
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),
  },
  {
    key: "kodeBarang",
    label: "Kode Barang",
    width: "160px",
    render: (val) => (
      <span className="font-mono text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },
  {
    key: "jenisBarang",
    label: "Jenis Barang",
    width: "160px",
    render: (val) => (
      <span className="text-slate-600">{String(val)}</span>
    ),
  },
  {
    key: "satuan",
    label: "Satuan",
    width: "100px",
    render: (val) => (
      <span className="text-slate-600">{String(val)}</span>
    ),
  },
  {
    key: "kts",
    label: "Kts (Gdng Pengguna)",
    width: "180px",
    render: (val) => (
      <span className="tabular-nums text-slate-700">
        {Number(val)}
      </span>
    ),
  },
  {
    key: "stokDapatDijual",
    label: "Stok dapat dijual",
    width: "160px",
    render: (val) => (
      <span className="tabular-nums font-semibold text-slate-700">
        {Number(val)}
      </span>
    ),
  },
];

// ─── Dummy Data (optional biar langsung kelihatan) ──────────────────────────────


// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MasterProductPage() {
  return (
    <AppShell title="Master Product" subtitle="Kelola data produk">
      <DataTable<Product>
        title="Master Product"
        columns={COLUMNS}
        data={[]}   // data tetap kosong
        addLabel="Tambah Produk"
        onAdd={() => {
          // TODO: buka modal tambah produk
        }}
        keyField="id"
      />
    </AppShell>
  );
}