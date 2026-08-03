"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { DataTable, StatusBadge } from "@/components/ui";
import type { Column } from "@/components/ui";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { SalesReturnModal } from "@/components/modules/penjualan/retur_penjualan/SalesReturnModal";
import {
  salesReturnService,
  type SalesReturn,
} from "@/lib/services/sales-return.service";
import { notify } from "@/lib/notify";

const formatDate = (d?: string | null) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const COLUMNS: Column<SalesReturn>[] = [
  { key: "noRetur", label: "Return No.", width: "18%" },
  {
    key: "tanggal",
    label: "Return Date",
    width: "14%",
    render: (_v, row) => formatDate(row.tanggal),
  },
  { key: "pelanggan", label: "Customer", width: "22%" },
  {
    key: "noSuratJalan",
    label: "DO No.",
    width: "16%",
    render: (_v, row) => row.noSuratJalan || "—",
  },
  {
    key: "noSo",
    label: "SO No.",
    width: "14%",
    render: (_v, row) => row.noSo || "—",
  },
  {
    key: "status",
    label: "Status",
    width: "16%",
    render: (_v, row) => <StatusBadge status={row.status} />,
  },
];

export default function RetourPenjualanPage() {
  const router = useRouter();

  const [data, setData] = useState<SalesReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await salesReturnService.getAll();
      setData(result);
    } catch (err) {
      console.error(err);
      notify.error("Gagal memuat Retur Penjualan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = () => {
    setModalOpen(false);
    notify.success("Retur Penjualan berhasil disimpan", "Stok telah dikembalikan ke gudang.");
    fetchData();
  };

  return (
    <AppShell title="Retur Penjualan" subtitle="Kelola retur barang dari pelanggan">
      <DataTable
        title="Sales Return List"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Add Return"
        onAdd={() => setModalOpen(true)}
        loading={isLoading}
        renderActions={(row) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() => router.push(`/penjualan/retur/${row.id}`)}
              disabled={isLoading}
              title="View detail"
              className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Eye size={15} />
            </button>
          </div>
        )}
      />

      <SalesReturnModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          fetchData();
        }}
        onSubmit={handleSubmit}
      />
    </AppShell>
  );
}
