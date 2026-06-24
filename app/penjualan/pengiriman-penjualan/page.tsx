"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import { Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PengirimanModal } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";
import {
  type PengirimanFormData,
  generateNoSuratJalan,
  todayStr,
} from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanType";
import {
  pengirimanPenjualanService,
  type PengirimanPenjualan,
} from "@/lib/services/pengiriman-penjualan.service";

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

const COLUMNS: Column<PengirimanPenjualan>[] = [
  { key: "noSuratJalan", label: "No Surat Jalan", width: "18%" },
  {
    key: "tanggalKirim",
    label: "Tanggal Kirim",
    width: "16%",
    render: (_v, row) => formatDate(row.tanggalKirim),
  },
  { key: "pelanggan", label: "Pelanggan", width: "26%" },
  { key: "noSo", label: "No. SO", width: "18%",
    render: (_v, row) => row.noSo || "—" },
  { key: "shippingType", label: "Tipe Pengiriman", width: "22%" },
];

export default function PengirimanPenjualanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PengirimanPenjualan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<Partial<PengirimanFormData> | undefined>(undefined);

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await pengirimanPenjualanService.getAll();
      setData(result);
    } catch (err) {
      console.error(err);
      showMessage("Gagal memuat data pengiriman penjualan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Baca query params dari redirect Sales Order ────────
  // Contoh URL: /penjualan/pengiriman-penjualan?customerId=6&pelanggan=PT...
  //             &salesOrderId=7&noSo=SO.2026.06.13168
  useEffect(() => {
    const customerIdParam = searchParams.get("customerId");
    const pelangganParam = searchParams.get("pelanggan");

    if (!customerIdParam && !pelangganParam) return;

    const customerId = customerIdParam ? Number(customerIdParam) : undefined;
    const pelanggan = pelangganParam ?? "";
    const salesOrderIdParam = searchParams.get("salesOrderId");
    const salesOrderId = salesOrderIdParam ? Number(salesOrderIdParam) : undefined;
    const noSo = searchParams.get("noSo") ?? "";

    setInitialFormData({
      customerId,
      pelanggan,
      tanggalKirim: todayStr(),
      noSuratJalan: generateNoSuratJalan(),
      noSuratJalanMode: "auto",
      salesOrderId: salesOrderId && salesOrderId > 0 ? salesOrderId : undefined,
      noSo: noSo || undefined,
    });

    setModalOpen(true);
    router.replace("/penjualan/pengiriman-penjualan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTambah = () => {
    setInitialFormData(undefined);
    setModalOpen(true);
  };

  const handleDetail = (row: PengirimanPenjualan) => {
    router.push(`/penjualan/pengiriman-penjualan/${row.id}`);
  };

  const handleModalSubmit = (formData: PengirimanFormData) => {
    setModalOpen(false);
    setInitialFormData(undefined);
    showMessage("Pengiriman penjualan berhasil disimpan");
    fetchData();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setInitialFormData(undefined);
  };

  return (
    <AppShell title="Pengiriman Penjualan" subtitle="Kelola surat jalan & pengiriman barang ke pelanggan">
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
        title="Daftar Pengiriman Penjualan"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Tambah Pengiriman"
        onAdd={handleTambah}
        loading={isLoading}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
        renderActions={(row) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleDetail(row)}
              disabled={isLoading}
              title="Lihat Detail"
              className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Eye size={15} />
            </button>
          </div>
        )}
      />

      <PengirimanModal
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={initialFormData}
      />
    </AppShell>
  );
}