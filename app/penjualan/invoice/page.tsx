"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { SalesStatusBadge } from "@/components/modules/penjualan/SalesStatusSelect";
import { SALES_STATUS_OPTIONS } from "@/lib/sales-status";
import { notify } from "@/lib/notify";

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
  { key: "invoiceNumber", label: "Invoice No.", width: "16%" },
  {
    key: "invoiceDate",
    label: "Date",
    width: "14%",
    render: (_v, row) => formatDate(row.invoiceDate),
  },
  { key: "customerName", label: "Customer", width: "22%" },
  {
    key: "salesOrderNumber",
    label: "No SO",
    width: "14%",
    render: (_v, row) => row.salesOrderNumber || "-",
  },
  {
    key: "grandTotal",
    label: "Total",
    width: "14%",
    render: (_v, row) => formatRupiah(row.grandTotal),
  },
  {
    key: "status",
    label: "Status",
    width: "16%",
    render: (_v, row) => (
      <SalesStatusBadge module="sales-invoice" value={row.status} />
    ),
  },
];

function SalesInvoicePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SalesInvoice[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<Partial<FakturPenjualanFormData> | undefined>(undefined);
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
      showMessage("Failed to load sales invoices", "error");
      notify.error("Gagal memuat Sales Invoice");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const customerIdParam = searchParams.get("customerId");
    const pelanggan = searchParams.get("pelanggan") ?? "";
    const deliveryOrderIdParam = searchParams.get("deliveryOrderId");

    if (!customerIdParam && !pelanggan && !deliveryOrderIdParam) return;

    setInitialFormData({
      customerId: customerIdParam ? Number(customerIdParam) : undefined,
      pelanggan,
      deliveryOrderId: deliveryOrderIdParam ? Number(deliveryOrderIdParam) : undefined,
    });
    setModalOpen(true);
    router.replace("/penjualan/invoice");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const handleSubmit = (form: FakturPenjualanFormData) => {
    void form;
    showMessage("Sales invoice saved successfully");
    notify.success("Sales Invoice berhasil disimpan");
    fetchData();
  };

  // Faktur Proforma DP 30% -- lanjut ke Uang Muka, bukan Sales Receipt. Pakai
  // jalur query-param "fromSalesOrder" yang sudah ada di halaman Uang Muka,
  // plus nominal DP yang persis (dari total faktur DP yang baru disimpan).
  const handleProcessToUangMuka = (form: FakturPenjualanFormData & { remainingAmount?: number }) => {
    const params = new URLSearchParams();
    params.set("fromSalesOrder", "1");
    if (form.customerId) params.set("customerId", String(form.customerId));
    if (form.pelanggan) params.set("pelanggan", form.pelanggan);
    if (form.noSo) params.set("noPesanan", form.noSo);
    if (form.alamat) params.set("alamat", form.alamat);
    params.set("keterangan", `Uang muka untuk faktur proforma ${form.noFaktur}`);
    params.set("totalHargaPesanan", String(form.remainingAmount ?? 0));
    params.set("uangMuka", String(form.remainingAmount ?? 0));

    router.push(`/penjualan/uang-muka?${params.toString()}`);
  };

  return (
    <AppShell title="Sales Invoice" subtitle="Manage customer billing documents">
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
        title="Sales Invoice List"
        columns={COLUMNS}
        data={data}
        keyField="id"
        addLabel="Add Invoice"
        onAdd={() => {
          setInitialFormData(undefined);
          setModalOpen(true);
        }}
        loading={isLoading}
        filters={{
          dateKey: "invoiceDate",
          statusKey: "status",
          statusOptions: SALES_STATUS_OPTIONS["sales-invoice"],
        }}
        className="[&_table]:table-fixed [&_th:last-child]:w-16 [&_td:last-child]:w-16"
        renderActions={(row) => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              title="View detail"
              onClick={() => router.push(`/penjualan/invoice/${row.id}`)}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-700"
            >
              <Eye size={15} />
            </button>
          </div>
        )}
      />

      <FakturPenjualanModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setInitialFormData(undefined);
          fetchData();
        }}
        onSubmit={handleSubmit}
        onProsesUangMuka={handleProcessToUangMuka}
        initialData={initialFormData}
      />
    </AppShell>
  );
}

export default function SalesInvoicePage() {
  return (
    <Suspense fallback={null}>
      <SalesInvoicePageInner />
    </Suspense>
  );
}
