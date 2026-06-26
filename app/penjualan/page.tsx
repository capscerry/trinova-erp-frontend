"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  FileText,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { customerService, penerimaanPenjualanService, salesOrderService } from "@/lib/services";
import { salesInvoiceService, type SalesInvoice } from "@/lib/services/sales-invoice.service";
import {
  pengirimanPenjualanService,
  type PengirimanPenjualan,
} from "@/lib/services/pengiriman-penjualan.service";
import type { Customer } from "@/lib/services/customer.service";
import type { PenerimaanPenjualan, SalesOrder } from "@/lib/services/penjualan.service";

type Tone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";

interface MetricCard {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  tone: Tone;
}

interface ShortcutItem {
  label: string;
  href: string;
  icon: React.ElementType;
  desc: string;
}

const toneClass: Record<Tone, { icon: string; bg: string }> = {
  blue: { icon: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
  emerald: { icon: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  amber: { icon: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
  rose: { icon: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
  violet: { icon: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
  slate: { icon: "text-slate-600", bg: "bg-slate-50 border-slate-100" },
};

const shortcuts: ShortcutItem[] = [
  { label: "Penawaran", href: "/penjualan/quotation", icon: FileText, desc: "Buat dan pantau quotation" },
  { label: "Pesanan", href: "/penjualan/order", icon: ClipboardList, desc: "Kelola sales order" },
  { label: "Pengiriman", href: "/penjualan/pengiriman-penjualan", icon: Truck, desc: "Surat jalan pelanggan" },
  { label: "Faktur", href: "/penjualan/invoice", icon: Receipt, desc: "Tagihan penjualan" },
  { label: "Uang Muka", href: "/penjualan/uang-muka", icon: CreditCard, desc: "Down payment customer" },
  { label: "Penerimaan", href: "/penjualan/penerimaan-penjualan", icon: PackageCheck, desc: "Pembayaran pelanggan" },
];

const formatCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value || 0);

const formatRupiah = (value: number) => `Rp ${formatCompact(value)}`;

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function PenjualanDashboardPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [deliveries, setDeliveries] = useState<PengirimanPenjualan[]>([]);
  const [receipts, setReceipts] = useState<PenerimaanPenjualan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [soResult, invoiceResult, deliveryResult, receiptResult, customerResult] =
      await Promise.allSettled([
        salesOrderService.getAll(),
        salesInvoiceService.getAll(),
        pengirimanPenjualanService.getAll(),
        penerimaanPenjualanService.getAll(),
        customerService.getAll(),
      ]);

    if (soResult.status === "fulfilled") setSalesOrders(soResult.value);
    if (invoiceResult.status === "fulfilled") setInvoices(invoiceResult.value);
    if (deliveryResult.status === "fulfilled") setDeliveries(deliveryResult.value);
    if (receiptResult.status === "fulfilled") setReceipts(receiptResult.value);
    if (customerResult.status === "fulfilled") setCustomers(customerResult.value);

    const failed = [soResult, invoiceResult, deliveryResult, receiptResult, customerResult]
      .filter((result) => result.status === "rejected").length;

    if (failed > 0) {
      setError(`${failed} sumber data belum bisa dimuat. Dashboard tetap menampilkan data yang tersedia.`);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const totalSalesOrder = useMemo(
    () => salesOrders.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [salesOrders]
  );

  const totalInvoice = useMemo(
    () => invoices.reduce((sum, item) => sum + Number(item.grandTotal || 0), 0),
    [invoices]
  );

  const totalReceipt = useMemo(
    () => receipts.reduce((sum, item) => sum + Number(item.nilaiPembayaran || 0), 0),
    [receipts]
  );

  const outstandingInvoice = useMemo(
    () => invoices.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0),
    [invoices]
  );

  const metrics: MetricCard[] = [
    { label: "Sales Order", value: formatRupiah(totalSalesOrder), sub: `${salesOrders.length} dokumen pesanan`, icon: ShoppingBag, tone: "blue" },
    { label: "Faktur Penjualan", value: formatRupiah(totalInvoice), sub: `${invoices.length} faktur dibuat`, icon: Receipt, tone: "emerald" },
    { label: "Outstanding", value: formatRupiah(outstandingInvoice), sub: "Sisa tagihan pelanggan", icon: CreditCard, tone: "rose" },
    { label: "Penerimaan", value: formatRupiah(totalReceipt), sub: `${receipts.length} pembayaran masuk`, icon: PackageCheck, tone: "violet" },
    { label: "Pengiriman", value: String(deliveries.length), sub: "Surat jalan tercatat", icon: Truck, tone: "amber" },
    { label: "Customer", value: String(customers.length), sub: "Pelanggan terdaftar", icon: Users, tone: "slate" },
  ];

  const recentOrders = salesOrders.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  return (
    <AppShell title="Dashboard Penjualan" subtitle="Ringkasan aktivitas sales dan tagihan pelanggan">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Overview modul penjualan</p>
            <p className="text-xs text-slate-400">
              {lastUpdated
                ? `Terakhir diperbarui ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                : "Memuat data terbaru"}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-white" />
              ))
            : metrics.map((metric) => {
                const Icon = metric.icon;
                const tone = toneClass[metric.tone];
                return (
                  <div key={metric.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{metric.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-800">{metric.value}</p>
                        <p className="mt-1 text-xs text-slate-400">{metric.sub}</p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone.bg}`}>
                        <Icon size={17} className={tone.icon} />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_320px]">
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Sales Order Terbaru</p>
                <p className="text-xs text-slate-400">Pesanan penjualan terakhir</p>
              </div>
              <Link href="/penjualan/order" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {recentOrders.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada sales order.</p>
              ) : recentOrders.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">{item.nomor}</p>
                    <p className="truncate text-xs text-slate-400">{item.pelanggan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{formatRupiah(item.total)}</p>
                    <p className="text-[11px] text-slate-400">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Faktur Terbaru</p>
                <p className="text-xs text-slate-400">Tagihan penjualan terakhir</p>
              </div>
              <Link href="/penjualan/invoice" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Lihat semua</Link>
            </div>
            <div className="space-y-2">
              {recentInvoices.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada faktur penjualan.</p>
              ) : recentInvoices.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">{item.invoiceNumber}</p>
                    <p className="truncate text-xs text-slate-400">{item.customerName} - {formatDate(item.invoiceDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{formatRupiah(item.grandTotal)}</p>
                    <p className="text-[11px] text-slate-400">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700">Akses Cepat</p>
            <p className="mb-4 text-xs text-slate-400">Menu utama modul sales</p>
            <div className="space-y-2">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-700">{item.label}</span>
                        <span className="block truncate text-[11px] text-slate-400">{item.desc}</span>
                      </span>
                    </span>
                    <ArrowRight size={13} className="text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
