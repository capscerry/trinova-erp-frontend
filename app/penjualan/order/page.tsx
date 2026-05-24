"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  WorkflowDraftProvider,
  useWorkflowDraft,
} from "@/lib/WorkflowDraftContext";
import { TransactionOrchestrator } from "@/components/modules/penjualan/workflow/TransactionOrchestrator";

import {
  salesOrderService,
  type SalesOrder,
} from "@/lib/services/penjualan.service";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

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

const COLUMNS: Column<SalesOrder>[] = [
  {
    key: "nomor",
    label: "Nomor SO",
    width: "160px",
  },
  {
    key: "tanggal",
    label: "Tanggal",
    width: "130px",
    render: (_value, row) => formatDate(row.tanggal),
  },
  {
    key: "pelanggan",
    label: "Pelanggan",
    width: "220px",
  },
  {
    key: "tanggalKirim",
    label: "Tanggal Kirim",
    width: "150px",
    render: (_value, row) => formatDate(row.tanggalKirim),
  },
  {
    key: "total",
    label: "Total",
    width: "160px",
    render: (_value, row) => formatRupiah(row.total ?? 0),
  },
];

export default function SalesOrderPage() {
  return (
    <WorkflowDraftProvider>
      <SalesOrderPageInner />
      <TransactionOrchestrator />
    </WorkflowDraftProvider>
  );
}

function SalesOrderPageInner() {
  const { openModal } = useWorkflowDraft();

  const [data, setData] = useState<SalesOrder[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = (
    msg: string,
    type: "success" | "error" = "success"
  ) => {
    setMessage(msg);
    setMessageType(type);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const result = await salesOrderService.getAll();

      console.log(result);

      setData(result);
    } catch (error) {
      console.error(error);
      showMessage("Gagal memuat data sales order", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const handleTambah = () => {
    openModal("salesOrder");
  };

  const handleDetail = (row: SalesOrder) => {
    console.log("Detail SO:", row);
  };

  const handleEdit = (row: SalesOrder) => {
    console.log("Edit SO:", row);
  };

  const handleDelete = async (row: SalesOrder) => {
    try {
      const confirmDelete = window.confirm(
        `Yakin ingin menghapus Sales Order ${row.nomor}?`
      );

      if (!confirmDelete) return;

      setIsLoading(true);

      await salesOrderService.remove(row.id);

      showMessage("Sales Order berhasil dihapus", "success");

      await fetchData();
    } catch (error) {
      console.error(error);
      showMessage("Gagal menghapus sales order", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell title="Sales Order" subtitle="Kelola pesanan penjualan">
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${
            messageType === "error"
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-green-100 text-green-700 border border-green-300"
          }`}
        >
          {message}
        </div>
      )}

      <DataTable
        title="Daftar Sales Order"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Tambah Sales Order"
        onAdd={handleTambah}
        isLoading={isLoading}
        renderActions={(row) => (
          <div className="flex items-center gap-1.5 justify-center">
            <button
              onClick={() => handleDetail(row)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-slate-100 text-navy-700 hover:bg-slate-200
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Detail
            </button>

            <button
              onClick={() => handleEdit(row)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-amber-50 text-amber-700 hover:bg-amber-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Edit
            </button>

            <button
              onClick={() => handleDelete(row)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold font-sans
                         bg-red-50 text-red-700 hover:bg-red-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Hapus
            </button>
          </div>
        )}
      />
    </AppShell>
  );
}