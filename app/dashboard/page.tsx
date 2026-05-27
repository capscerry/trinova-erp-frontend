"use client";

import { AppShell } from "@/components/layout";

import { ModuleOverview } from "@/components/modules/ModuleOverview";

import { NAV_CONFIG } from "@/lib/nav";

import {
  getPurchaseOrders,
  getGoodsReceipts,
  getSuppliers,
} from "@/lib/services";

import {
  ShoppingCart,
  Truck,
  Clock3,
  Building2,
} from "lucide-react";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface DashboardStat {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  sub: string;
  icon: any;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(n);

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function PembelianPage() {

  const module =
    NAV_CONFIG.find(
      (n) => n.id === "pembelian"
    )!;

  const [stats, setStats] =
    useState<DashboardStat[]>([]);

  // ─────────────────────────────────────────────────────────
  // FETCH DASHBOARD
  // ─────────────────────────────────────────────────────────

  const fetchDashboard =
    async () => {

      try {

        const [
          poRes,
          grRes,
          supplierRes,
        ] = await Promise.all([
          getPurchaseOrders(),
          getGoodsReceipts(),
          getSuppliers(),
        ]);

        const poList =
          Array.isArray(poRes)
            ? poRes
            : poRes.data;

        const grList =
          Array.isArray(grRes)
            ? grRes
            : grRes.data;

        const supplierList =
          Array.isArray(supplierRes)
            ? supplierRes
            : supplierRes.data;

        // TOTAL PEMBELIAN

        const totalPurchase =
          poList.reduce(
            (
              acc: number,
              item: any
            ) =>
              acc +
              Number(
                item.total_amount || 0
              ),
            0
          );

        // PO PENDING

        const pendingPO =
          poList.filter(
            (item: any) =>
              item.status === "Draft" ||
              item.status ===
                "Waiting to be processed"
          ).length;

        // GOODS RECEIPT

        const totalGR =
          grList.length;

        // SUPPLIER

        const totalSupplier =
          supplierList.length;

        setStats([
          {
            label:
              "Total Pembelian",

            value:
              `Rp ${formatRupiah(
                totalPurchase
              )}`,

            change: "+12%",

            trend: "up",

            sub: "Total transaksi",

            icon: ShoppingCart,
          },

          {
            label:
              "Goods Receipt",

            value:
              String(totalGR),

            change: "+4",

            trend: "up",

            sub: "Barang diterima",

            icon: Truck,
          },

          {
            label:
              "PO Pending",

            value:
              String(pendingPO),

            change: "-2",

            trend: "down",

            sub: "Menunggu proses",

            icon: Clock3,
          },

          {
            label:
              "Supplier Aktif",

            value:
              String(totalSupplier),

            change: "+1",

            trend: "up",

            sub: "Supplier terdaftar",

            icon: Building2,
          },
        ]);

      } catch (error) {

        console.error(error);
      }
    };

  // ─────────────────────────────────────────────────────────
  // USE EFFECT
  // ─────────────────────────────────────────────────────────

  useEffect(() => {

    fetchDashboard();

  }, []);

  // ─────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────

  return (

    <AppShell
      title="Purchasing Dashboard"
      subtitle="Overview aktivitas pembelian dan supplier"
    >

      <ModuleOverview
        module={module}
        stats={stats}
      />

      {/* AI INSIGHT */}

      <div
        className="
          mt-6
          rounded-2xl
          border
          border-navy-800
          bg-gradient-to-r
          from-navy-900
          to-navy-700
          p-6
          shadow-lg
        "
      >

        <div className="flex items-start justify-between gap-6">

          <div>

            <div
              className="
                inline-flex
                items-center
                gap-2
                px-3
                py-1
                rounded-full
                bg-gold-400/10
                text-gold-400
                text-xs
                font-semibold
                uppercase
                tracking-widest
              "
            >
              AI Purchasing Insight
            </div>

            <h2
              className="
                mt-4
                text-2xl
                font-bold
                text-white
                tracking-tight
              "
            >
              Purchasing performance terpantau stabil
            </h2>

            <p
              className="
                mt-2
                text-slate-300
                text-sm
                max-w-2xl
                leading-relaxed
              "
            >
              Dashboard purchasing menampilkan
              total transaksi pembelian,
              monitoring goods receipt,
              status purchase order,
              dan supplier aktif
              berdasarkan data real-time
              dari sistem ERP.
            </p>

          </div>

          <div
            className="
              hidden
              lg:flex
              flex-col
              gap-3
              min-w-[220px]
            "
          >

            <div
              className="
                rounded-xl
                bg-white/5
                border
                border-white/10
                p-4
              "
            >
              <div className="text-slate-400 text-xs uppercase tracking-widest">
                Total Goods Receipt
              </div>

              <div className="mt-2 text-white font-semibold">
                {stats[1]?.value || 0}
              </div>
            </div>

            <div
              className="
                rounded-xl
                bg-white/5
                border
                border-white/10
                p-4
              "
            >
              <div className="text-slate-400 text-xs uppercase tracking-widest">
                Pending Purchase Order
              </div>

              <div className="mt-2 text-gold-400 font-bold text-xl">
                {stats[2]?.value || 0}
              </div>
            </div>

          </div>

        </div>

      </div>

    </AppShell>
  );
}