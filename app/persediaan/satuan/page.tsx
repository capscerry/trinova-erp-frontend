"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import {
  DataTable,
  type Column,
} from "@/components/ui/DataTable";

import {
  getUoms,
  Uom,
} from "@/lib/services/uom.service";

import { toast } from "sonner";

const COLUMNS: Column<Uom>[] = [
  {
    key: "uom_code",
    label: "Code",
    width: "180px",

    render: (val) => (
      <span className="font-mono text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "uom_name",
    label: "Unit Name",

    render: (val) => (
      <span className="font-medium text-slate-700">
        {String(val)}
      </span>
    ),
  },
];

export default function UnitOfMeasurePage() {
  const [uoms, setUoms] =
    useState<Uom[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    fetchUoms();
  }, []);

  async function fetchUoms() {
    try {
      setLoading(true);

      const data =
        await getUoms();

      setUoms(data);
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal mengambil data UOM"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Unit Of Measure"
      subtitle="Daftar satuan unit"
    >
      <DataTable<Uom>
        title="Master UOM"
        columns={COLUMNS}
        data={uoms}
        loading={loading}
        keyField="uom_id"
      />
    </AppShell>
  );
}