"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import {
  UangMukaModal,
  type UangMukaFormData,
} from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import type { Column } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { uangMukaService } from "@/lib/services/penjualan.service";
import { Eye } from "lucide-react";
import { SalesStatusBadge } from "@/components/modules/penjualan/SalesStatusSelect";
import { SALES_STATUS_OPTIONS } from "@/lib/sales-status";
import { notify } from "@/lib/notify";

export interface UangMuka {
  no: number;
  id: number;
  noFaktur: string;
  tanggal: string;
  pelanggan: string;
  uangMuka: number;
  isTaxable: boolean;
  isTaxIncluded: boolean;
  noPO: string;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
  fakturType: string;
  noPesanan: string;
  totalHargaPesanan: number;
  status?: string;
}

const today = new Date().toLocaleDateString("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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

const COLUMNS: Column<UangMuka>[] = [
  { key: "noFaktur", label: "Invoice No.", width: "160px" },
  {
    key: "tanggal",
    label: "Date",
    width: "120px",
    render: (_value, row) => formatDate(row.tanggal),
  },
  { key: "pelanggan", label: "Customer" },
  { key: "noPesanan", label: "No SO", width: "140px" },
  {
    key: "uangMuka",
    label: "Down Payment",
    width: "150px",
    render: (value: unknown) =>
      Number(value || 0).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
  },
  {
    key: "status",
    label: "Status",
    width: "150px",
    render: (_: unknown, row: UangMuka) => (
      <SalesStatusBadge module="down-payment" value={row.status} />
    ),
  },
];

function UangMukaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<UangMuka[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<UangMukaFormData | undefined>();
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
      const result = await uangMukaService.getAll();
      setData(
        result.map((item, index) => ({
          no: index + 1,
          id: item.id ?? index + 1,
          noFaktur: item.noFaktur,
          tanggal: item.tanggal,
          pelanggan: item.customerName ?? "",
          uangMuka: item.nominalUangMuka,
          isTaxable: false,
          isTaxIncluded: false,
          noPO: item.noPO ?? "",
          syaratPembayaran: item.syaratPembayaran ?? "",
          alamat: item.alamat ?? "",
          keterangan: item.keterangan ?? "",
          fakturType: "Faktur Penjualan",
          noPesanan: item.nomorSo ?? "",
          totalHargaPesanan: item.totalAmount ?? 0,
          status: item.status,
        }))
      );
    } catch (error) {
      console.error(error);
      showMessage("Failed to load down payments", "error");
      notify.error("Gagal memuat Sales Down Payment");
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fromSalesOrder = searchParams.get("fromSalesOrder");
    if (!fromSalesOrder) return;

    const pelanggan = searchParams.get("pelanggan") ?? "";
    const noPesanan = searchParams.get("noPesanan") ?? "";
    const totalHargaPesanan = Number(searchParams.get("totalHargaPesanan") ?? 0);
    const alamat = searchParams.get("alamat") ?? "";
    const keterangan = searchParams.get("keterangan") ?? "";

    setEditData({
      id: 0,
      pelanggan,
      noFaktur: "",
      noFakturMode: "auto",
      tanggal: today,
      uangMuka: 0,
      noPO: "",
      noSo: "",
      isTaxable: false,
      isTaxIncluded: true,
      taxAmount: 0,
      syaratPembayaran: "",
      alamat,
      keterangan,
      fakturType: "Faktur Penjualan",
      noPesanan,
      totalHargaPesanan,
    });

    setModalOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const handleTambah = () => {
    setEditData(undefined);
    setModalOpen(true);
  };

  const handleDetail = (row: UangMuka) => {
    router.push(`/penjualan/uang-muka/${row.id}`);
  };

  const handleSubmit = (formData: UangMukaFormData) => {
    showMessage(
      formData.id ? "Down payment updated successfully" : "Down payment added successfully",
      "success"
    );
    notify.success(
      formData.id ? "Sales Down Payment berhasil diperbarui" : "Sales Down Payment berhasil dibuat"
    );
  };

  const handleModalClose = () => {
    setModalOpen(false);
    fetchData();
  };

  return (
    <AppShell title="Sales Down Payment" subtitle="Manage customer down payments">
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
        title="Down Payment List"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Add Down Payment"
        onAdd={handleTambah}
        filters={{
          dateKey: "tanggal",
          statusKey: "status",
          statusOptions: SALES_STATUS_OPTIONS["down-payment"],
        }}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
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

      <UangMukaModal
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        initialData={editData}
      />
    </AppShell>
  );
}

import { Suspense } from "react";

export default function UangMukaContent() {
  return (
    <Suspense fallback={null}>
      <UangMukaInner />
    </Suspense>
  );
}