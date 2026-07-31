"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import { Eye, PackageCheck } from "lucide-react";
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
import { SalesStatusSelect } from "@/components/modules/penjualan/SalesStatusSelect";
import { SALES_STATUS_OPTIONS } from "@/lib/sales-status";
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

const COLUMNS: Column<PengirimanPenjualan>[] = [
  { key: "noSuratJalan", label: "Delivery No.", width: "16%" },
  {
    key: "tanggalKirim",
    label: "Delivery Date",
    width: "14%",
    render: (_v, row) => formatDate(row.tanggalKirim),
  },
  { key: "pelanggan", label: "Customer", width: "22%" },
  { key: "noSo", label: "SO No.", width: "14%",
    render: (_v, row) => row.noSo || "—" },
  { key: "shippingType", label: "Shipping Type", width: "18%" },
  {
    key: "status",
    label: "Status",
    width: "16%",
    render: (_v, row) => (
      <SalesStatusSelect module="delivery-order" id={row.id} value={row.status} />
    ),
  },
];

function PengirimanPenjualanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PengirimanPenjualan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<Partial<PengirimanFormData> | undefined>(undefined);

  const showMessage = useCallback((msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await pengirimanPenjualanService.getAll();
      setData(result);
    } catch (err) {
      console.error(err);
      showMessage("Failed to load delivery orders", "error");
      notify.error("Gagal memuat Delivery Order");
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

  // ── Baca query params dari redirect Sales Order ────────
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

  const [markingId, setMarkingId] = useState<number | null>(null);

  const handleMarkReceived = async (row: PengirimanPenjualan) => {
    if (!confirm(`Tandai ${row.noSuratJalan} sebagai sudah diterima customer?`)) return;
    try {
      setMarkingId(row.id);
      await pengirimanPenjualanService.markReceived(row.id);
      notify.success("Delivery Order ditandai sudah diterima");
      fetchData();
    } catch (err) {
      console.error(err);
      notify.error(
        "Gagal menandai diterima",
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    } finally {
      setMarkingId(null);
    }
  };

  const handleModalSubmit = () => {
    setModalOpen(false);
    setInitialFormData(undefined);
    showMessage("Delivery order saved successfully");
    notify.success("Delivery Order berhasil disimpan");
    fetchData();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setInitialFormData(undefined);
  };

  return (
    <AppShell title="Delivery Order" subtitle="Manage customer shipment documents">
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
        title="Delivery Order List"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Add Delivery"
        onAdd={handleTambah}
        loading={isLoading}
        filters={{
          dateKey: "tanggalKirim",
          statusKey: "status",
          statusOptions: SALES_STATUS_OPTIONS["delivery-order"],
        }}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
        renderActions={(row) => (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => handleDetail(row)}
              disabled={isLoading}
              title="View detail"
              className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Eye size={15} />
            </button>
            {row.status === "In Delivery" && (
              <button
                onClick={() => handleMarkReceived(row)}
                disabled={isLoading || markingId === row.id}
                title="Tandai Diterima"
                className="p-1.5 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PackageCheck size={15} />
              </button>
            )}
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

import { Suspense } from "react";

export default function PengirimanPenjualanContent() {
  return (
    <Suspense fallback={null}>
      <PengirimanPenjualanInner />
    </Suspense>
  );
}