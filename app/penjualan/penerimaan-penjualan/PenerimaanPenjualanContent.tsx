"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import { Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PenerimaanModal } from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanModal";
import {
  type PenerimaanFormData,
  generateNoBukti,
  todayStr,
} from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanPenjualanType";
import {
  penerimaanPenjualanService,
  type PenerimaanPenjualan,
} from "@/lib/services/penjualan.service";
import { SalesStatusSelect } from "@/components/modules/penjualan/SalesStatusSelect";
import { SALES_STATUS_OPTIONS } from "@/lib/sales-status";
import { notify } from "@/lib/notify";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);

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

const COLUMNS: Column<PenerimaanPenjualan>[] = [
  { key: "noBukti", label: "Receipt No.", width: "16%" },
  {
    key: "tanggalBayar",
    label: "Payment Date",
    width: "14%",
    render: (_v, row) => formatDate(row.tanggalBayar),
  },
  { key: "pelanggan", label: "Received From", width: "22%" },
  { key: "bank", label: "Bank", width: "20%" },
  {
    key: "nilaiPembayaran",
    label: "Payment Amount",
    width: "18%",
    render: (_v, row) => formatRupiah(row.nilaiPembayaran),
  },
  {
    key: "status",
    label: "Status",
    width: "16%",
    render: (_v, row) => (
      <SalesStatusSelect module="sales-receipt" id={row.id} value={row.status} />
    ),
  },
];

function PenerimaanPenjualanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PenerimaanPenjualan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<Partial<PenerimaanFormData> | undefined>(undefined);

  const showMessage = useCallback((msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await penerimaanPenjualanService.getAll();
      setData(result);
    } catch (err) {
      console.error(err);
      showMessage("Failed to load sales receipts", "error");
      notify.error("Gagal memuat Sales Receipt");
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Baca query params dari redirect Uang Muka ──────────
  // Contoh URL: /penjualan/penerimaan-penjualan?customerId=6&pelanggan=PT.+Enseval...
  //             &nilaiPembayaran=1107225&uangMukaId=12&salesOrderId=7
  useEffect(() => {
    const customerIdParam = searchParams.get("customerId");
    const pelangganParam = searchParams.get("pelanggan");

    // Kalau tidak ada param relevan, jangan auto-buka modal
    if (!customerIdParam && !pelangganParam) return;

    const customerId = customerIdParam ? Number(customerIdParam) : undefined;
    const pelanggan = pelangganParam ?? "";
    const nilaiPembayaran = Number(searchParams.get("nilaiPembayaran") ?? 0);
    const keterangan = searchParams.get("keterangan") ?? "";

    const uangMukaIdParam = searchParams.get("uangMukaId");
    const salesOrderIdParam = searchParams.get("salesOrderId");
    const salesInvoiceIdParam = searchParams.get("salesInvoiceId");
    const uangMukaId = uangMukaIdParam ? Number(uangMukaIdParam) : undefined;
    const salesOrderId = salesOrderIdParam ? Number(salesOrderIdParam) : undefined;
    const salesInvoiceId = salesInvoiceIdParam ? Number(salesInvoiceIdParam) : undefined;

    setInitialFormData({
      customerId,
      pelanggan,
      nilaiPembayaran,
      tanggalBayar: todayStr(),
      noBukti: generateNoBukti(),
      noBuktiMode: "auto",
      keterangan,
      uangMukaId: uangMukaId && uangMukaId > 0 ? uangMukaId : undefined,
      salesOrderId: salesOrderId && salesOrderId > 0 ? salesOrderId : undefined,
      salesInvoiceId: salesInvoiceId && salesInvoiceId > 0 ? salesInvoiceId : undefined,
    });

    setModalOpen(true);

    // Bersihkan query string dari address bar setelah dibaca, supaya kalau
    // user refresh halaman tidak membuka modal prefill yang sama berulang.
    router.replace("/penjualan/penerimaan-penjualan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTambah = () => {
    setInitialFormData(undefined);
    setModalOpen(true);
  };

  const handleDetail = (row: PenerimaanPenjualan) => {
    router.push(`/penjualan/penerimaan-penjualan/${row.id}`);
  };

  // Dipanggil modal SETELAH create API berhasil. Di sini kita tutup modal
  // dan refresh data dari server agar tabel selalu sinkron.
  const handleModalSubmit = () => {
    setModalOpen(false);
    setInitialFormData(undefined);
    showMessage("Sales receipt saved successfully");
    notify.success("Sales Receipt berhasil disimpan");
    fetchData();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Bersihkan prefill supaya kalau user buka modal lagi lewat "Tambah
    // Penerimaan" biasa, tidak ada sisa data dari redirect Uang Muka.
    setInitialFormData(undefined);
  };

  return (
    <AppShell title="Sales Receipt" subtitle="Manage payments received from customers">
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
        title="Sales Receipt List"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Add Receipt"
        onAdd={handleTambah}
        filters={{
          dateKey: "tanggalBayar",
          statusKey: "status",
          statusOptions: SALES_STATUS_OPTIONS["sales-receipt"],
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

      <PenerimaanModal
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={initialFormData}
      />
    </AppShell>
  );
}

import { Suspense } from "react";

export default function PenerimaanPenjualanContent() {
  return (
    <Suspense fallback={null}>
      <PenerimaanPenjualanInner />
    </Suspense>
  );
}