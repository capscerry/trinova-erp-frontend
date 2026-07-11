"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  WorkflowDraftProvider,
  useWorkflowDraft,
} from "@/lib/WorkflowDraftContext";
import { TransactionOrchestrator } from "@/components/modules/penjualan/workflow/TransactionOrchestrator";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import {
  salesOrderService,
  type SalesOrder,
} from "@/lib/services/penjualan.service";
import { SalesStatusSelect } from "@/components/modules/penjualan/SalesStatusSelect";
import { SALES_STATUS_OPTIONS } from "@/lib/sales-status";
import { notify } from "@/lib/notify";

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
  { key: "nomor", label: "SO Number", width: "16%" },
  {
    key: "tanggal",
    label: "Date",
    width: "14%",
    render: (_value, row) => formatDate(row.tanggal),
  },
  { key: "pelanggan", label: "Customer", width: "24%" },
  {
    key: "tanggalKirim",
    label: "Delivery Date",
    width: "14%",
    render: (_value, row) => formatDate(row.tanggalKirim),
  },
  {
    key: "total",
    label: "Total",
    width: "14%",
    render: (_value, row) => formatRupiah(row.total ?? 0),
  },
  {
    key: "status",
    label: "Status",
    width: "16%",
    render: (_value, row) => (
      <SalesStatusSelect
        module="sales-order"
        id={row.id}
        value={row.status}
        excludeOptions={["Cancelled"]}
        onUpdated={(status) => {
          row.status = status as SalesOrder["status"];
        }}
      />
    ),
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
  const router = useRouter();

  const [data, setData] = useState<SalesOrder[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = useCallback((msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await salesOrderService.getAll();
      setData(result);
    } catch (error) {
      console.error(error);
      showMessage("Failed to load sales orders", "error");
      notify.error("Gagal memuat Sales Order");
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refreshSalesOrders = () => fetchData();
    window.addEventListener("sales-order:saved", refreshSalesOrders);
    return () => window.removeEventListener("sales-order:saved", refreshSalesOrders);
  }, [fetchData]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleTambah = () => openModal("salesOrder");

  const handleDetail = (row: SalesOrder) => {
    router.push(`/penjualan/order/${row.id}`);
  };

  return (
    <AppShell title="Sales Order" subtitle="Manage customer sales orders">
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
        title="Sales Order List"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Add Sales Order"
        onAdd={handleTambah}
        filters={{
          dateKey: "tanggal",
          statusKey: "status",
          statusOptions: SALES_STATUS_OPTIONS["sales-order"],
        }}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
        // isLoading={isLoading}
        renderActions={(row) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleDetail(row)}
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
    </AppShell>
  );
}
