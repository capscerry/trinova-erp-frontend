"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  FakturPenjualanModal,
  type FakturPenjualanFormData,
} from "@/components/modules/penjualan/faktur_penjualan/FakturPenjualanModal";
import {
  salesInvoiceService,
  type SalesInvoice,
} from "@/lib/services/sales-invoice.service";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (d?: string | null) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const COLUMNS: Column<SalesInvoice>[] = [
  { key: "invoiceNumber", label: "No Faktur", width: "17%" },
  {
    key: "invoiceDate",
    label: "Tanggal",
    width: "14%",
    render: (_v, row) => formatDate(row.invoiceDate),
  },
  { key: "customerName", label: "Pelanggan", width: "25%" },
  {
    key: "salesOrderNumber",
    label: "No SO",
    width: "16%",
    render: (_v, row) => row.salesOrderNumber || "-",
  },
  {
    key: "grandTotal",
    label: "Total",
    width: "16%",
    render: (_v, row) => formatRupiah(row.grandTotal),
  },
  {
    key: "status",
    label: "Status",
    width: "12%",
    render: (_v, row) => (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
        {row.status || "Draft"}
      </span>
    ),
  },
];

export default function SalesInvoicePage() {
  const [data, setData] = useState<SalesInvoice[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await salesInvoiceService.getAll();
      setData(result);
    } catch (err) {
      console.error(err);
      showMessage("Gagal memuat data faktur penjualan", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const handleSubmit = (form: FakturPenjualanFormData) => {
    void form;
    setModalOpen(false);
    showMessage("Faktur penjualan berhasil disimpan");
    fetchData();
  };

  return (
    <AppShell title="Faktur Penjualan" subtitle="Kelola tagihan penjualan pelanggan">
      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
            messageType === "error"
              ? "border-red-300 bg-red-100 text-red-700"
              : "border-green-300 bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <DataTable
        title="Daftar Faktur Penjualan"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Tambah Faktur"
        onAdd={() => setModalOpen(true)}
        loading={isLoading}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
        renderActions={() => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              title="Lihat Detail"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-700"
            >
              <Eye size={15} />
            </button>
          </div>
        )}
      />

      <FakturPenjualanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </AppShell>
  );
}
