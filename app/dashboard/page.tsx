"use client";

import { AppShell } from "@/components/layout";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState } from "react";
import {
  getPurchaseOrders,
  getGoodsReceipts,
  getSuppliers,
  salesOrderService,
  customerService,
  getProducts,
} from "@/lib/services";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Clock3,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  RefreshCw,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(n);

// ─── types ───────────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string;
  sub: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

interface ModuleStat {
  module: string;
  color: string;
  barColor: string;
  value: number;
  max: number;
  label: string;
}

// ─── mini bar chart ──────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // stat cards
  const [stats, setStats] = useState<StatCard[]>([]);
  // module bars
  const [moduleBars, setModuleBars] = useState<ModuleStat[]>([]);
  // recent SO
  const [recentSO, setRecentSO] = useState<{ nomor: string; pelanggan: string; total: number; status: string }[]>([]);
  // recent PO
  const [recentPO, setRecentPO] = useState<{ nomor: string; supplier: string; total: number; status: string }[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [poRes, grRes, supplierRes, soList, customerList, productRes] =
        await Promise.allSettled([
          getPurchaseOrders(),
          getGoodsReceipts(),
          getSuppliers(),
          salesOrderService.getAll(),
          customerService.getAll(),
          getProducts(),
        ]);

      const poList: any[]   = poRes.status === "fulfilled"  ? (Array.isArray(poRes.value) ? poRes.value : poRes.value?.data ?? []) : [];
      const grList: any[]   = grRes.status === "fulfilled"  ? (Array.isArray(grRes.value) ? grRes.value : grRes.value?.data ?? []) : [];
      const supList: any[]  = supplierRes.status === "fulfilled" ? (Array.isArray(supplierRes.value) ? supplierRes.value : supplierRes.value?.data ?? []) : [];
      const soArr: any[]    = soList.status === "fulfilled"  ? soList.value : [];
      const custArr: any[]  = customerList.status === "fulfilled" ? customerList.value : [];
      const prodList: any[] = productRes.status === "fulfilled" ? (Array.isArray(productRes.value) ? productRes.value : productRes.value?.data ?? []) : [];

      // ── computed values ──────────────────────────────────────────────────

      const totalPembelian = poList.reduce((s: number, i: any) => s + Number(i.total_amount ?? i.totalAmount ?? 0), 0);
      const totalPenjualan = soArr.reduce((s: number, i: any) => s + Number(i.total ?? i.subTotal ?? 0), 0);
      const pendingPO      = poList.filter((i: any) => i.status === "Draft" || i.status === "Waiting to be processed").length;
      const pendingSO      = soArr.filter((i: any) => i.status === "Draft" || i.status === "Dikonfirmasi").length;

      // ── stat cards ───────────────────────────────────────────────────────

      setStats([
        {
          label:   "Total Penjualan",
          value:   `Rp ${fmt(totalPenjualan)}`,
          sub:     `${soArr.length} sales order`,
          change:  "+12%",
          trend:   "up",
          icon:    TrendingUp,
          color:   "text-blue-600",
          iconBg:  "bg-blue-50 border-blue-100",
        },
        {
          label:   "Total Pembelian",
          value:   `Rp ${fmt(totalPembelian)}`,
          sub:     `${poList.length} purchase order`,
          change:  "+8%",
          trend:   "up",
          icon:    ShoppingCart,
          color:   "text-amber-600",
          iconBg:  "bg-amber-50 border-amber-100",
        },
        {
          label:   "Customer Aktif",
          value:   String(custArr.filter((c: any) => c.status === "Aktif" || c.isActive).length || custArr.length),
          sub:     `${custArr.length} total terdaftar`,
          change:  "+3",
          trend:   "up",
          icon:    Users,
          color:   "text-purple-600",
          iconBg:  "bg-purple-50 border-purple-100",
        },
        {
          label:   "Supplier Aktif",
          value:   String(supList.filter((s: any) => s.isActive !== false).length || supList.length),
          sub:     `${supList.length} total terdaftar`,
          change:  "+1",
          trend:   "up",
          icon:    Building2,
          color:   "text-green-600",
          iconBg:  "bg-green-50 border-green-100",
        },
        {
          label:   "Goods Receipt",
          value:   String(grList.length),
          sub:     "Penerimaan barang",
          change:  "+4",
          trend:   "up",
          icon:    Truck,
          color:   "text-cyan-600",
          iconBg:  "bg-cyan-50 border-cyan-100",
        },
        {
          label:   "PO Pending",
          value:   String(pendingPO),
          sub:     "Menunggu proses",
          change:  pendingPO > 5 ? "+2" : "-1",
          trend:   pendingPO > 5 ? "down" : "up",
          icon:    Clock3,
          color:   "text-rose-600",
          iconBg:  "bg-rose-50 border-rose-100",
        },
        {
          label:   "SO Pending",
          value:   String(pendingSO),
          sub:     "Belum selesai diproses",
          change:  pendingSO > 5 ? "+2" : "-1",
          trend:   pendingSO > 5 ? "down" : "up",
          icon:    BarChart2,
          color:   "text-orange-600",
          iconBg:  "bg-orange-50 border-orange-100",
        },
        {
          label:   "Total Produk",
          value:   String(prodList.length),
          sub:     "Goods & service",
          change:  "0",
          trend:   "neutral",
          icon:    Package,
          color:   "text-teal-600",
          iconBg:  "bg-teal-50 border-teal-100",
        },
      ]);

      // ── module bars ───────────────────────────────────────────────────────

      const maxVal = Math.max(soArr.length, poList.length, grList.length, custArr.length, 1);
      setModuleBars([
        { module: "Sales Order",    color: "text-blue-600",   barColor: "bg-blue-500",   value: soArr.length,   max: maxVal, label: `${soArr.length} transaksi` },
        { module: "Purchase Order", color: "text-amber-600",  barColor: "bg-amber-500",  value: poList.length,  max: maxVal, label: `${poList.length} transaksi` },
        { module: "Goods Receipt",  color: "text-cyan-600",   barColor: "bg-cyan-500",   value: grList.length,  max: maxVal, label: `${grList.length} penerimaan` },
        { module: "Customer",       color: "text-purple-600", barColor: "bg-purple-500", value: custArr.length, max: maxVal, label: `${custArr.length} customer` },
        { module: "Supplier",       color: "text-green-600",  barColor: "bg-green-500",  value: supList.length, max: maxVal, label: `${supList.length} supplier` },
      ]);

      // ── recent SO (top 5) ─────────────────────────────────────────────────

      setRecentSO(
        soArr.slice(0, 5).map((i: any) => ({
          nomor:     i.nomor ?? i.soNumber ?? "-",
          pelanggan: i.pelanggan ?? i.customerName ?? "-",
          total:     i.total ?? i.subTotal ?? 0,
          status:    i.status ?? "-",
        }))
      );

      // ── recent PO (top 5) ─────────────────────────────────────────────────

      setRecentPO(
        poList.slice(0, 5).map((i: any) => ({
          nomor:    i.poNumber ?? i.po_number ?? "-",
          supplier: i.supplierName ?? i.supplier_name ?? "-",
          total:    Number(i.total_amount ?? i.totalAmount ?? 0),
          status:   i.status ?? "-",
        }))
      );

      setLastUpdated(new Date());
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── status badge ───────────────────────────────────────────────────────────

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      Draft:                    "bg-slate-100 text-slate-500",
      Dikonfirmasi:             "bg-blue-100 text-blue-600",
      Diproses:                 "bg-amber-100 text-amber-600",
      Dikirim:                  "bg-cyan-100 text-cyan-600",
      Selesai:                  "bg-green-100 text-green-600",
      Dibatalkan:               "bg-red-100 text-red-500",
      "Waiting to be processed":"bg-amber-100 text-amber-600",
      Approved:                 "bg-green-100 text-green-600",
    };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[s] ?? "bg-slate-100 text-slate-500"}`}>
        {s}
      </span>
    );
  };

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <AppShell title="Dashboard" subtitle="Overview sistem Trinova Business Suite">
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-500 text-sm">
            Selamat datang,{" "}
            <span className="font-semibold text-slate-700">{user?.username}</span>
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {lastUpdated ? `Update: ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-28" />
            ))
          : stats.map((s) => {
              const Icon = s.icon;
              const isUp = s.trend === "up";
              const isNeutral = s.trend === "neutral";
              return (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm hover:border-slate-200 transition-all duration-150"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.iconBg}`}>
                      <Icon size={15} className={s.color} />
                    </div>
                    {!isNeutral && (
                      <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
                        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {s.change}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xl font-bold text-slate-800 leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{s.sub}</p>
                </div>
              );
            })}
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Module Activity bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <p className="text-sm font-bold text-slate-700 mb-1">Aktivitas Modul</p>
          <p className="text-[11px] text-slate-400 mb-5">Volume transaksi per modul</p>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse h-8 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {moduleBars.map((m) => (
                <div key={m.module}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${m.color}`}>{m.module}</span>
                    <span className="text-[11px] text-slate-400">{m.label}</span>
                  </div>
                  <MiniBar value={m.value} max={m.max} color={m.barColor} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <p className="text-sm font-bold text-slate-700 mb-1">Sales Order Terbaru</p>
          <p className="text-[11px] text-slate-400 mb-4">5 transaksi penjualan terakhir</p>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : recentSO.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {recentSO.map((so, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{so.nomor}</p>
                    <p className="text-[10px] text-slate-400 truncate">{so.pelanggan}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    {statusBadge(so.status)}
                    <p className="text-[10px] font-semibold text-slate-600">Rp {fmt(so.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchase Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <p className="text-sm font-bold text-slate-700 mb-1">Purchase Order Terbaru</p>
          <p className="text-[11px] text-slate-400 mb-4">5 transaksi pembelian terakhir</p>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : recentPO.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {recentPO.map((po, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{po.nomor}</p>
                    <p className="text-[10px] text-slate-400 truncate">{po.supplier}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    {statusBadge(po.status)}
                    <p className="text-[10px] font-semibold text-slate-600">Rp {fmt(po.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}