"use client";

import { AppShell } from "@/components/layout";

import { ModuleOverview } from "@/components/modules/ModuleOverview";

import { NAV_CONFIG } from "@/lib/nav";

import {
  ShoppingCart,
  Truck,
  Clock3,
  Building2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────

const STATS = [

  {
    label: "Total Pembelian",
    value: "Rp 2,17 M",
    change: "+12.4%",
    trend: "up" as const,
    sub: "Bulan ini",
    icon: ShoppingCart,
  },

  {
    label: "Goods Receipt",
    value: "28",
    change: "+4",
    trend: "up" as const,
    sub: "Barang diterima",
    icon: Truck,
  },

  {
    label: "PO Pending",
    value: "6",
    change: "+2",
    trend: "down" as const,
    sub: "Menunggu approval",
    icon: Clock3,
  },

  {
    label: "Supplier Aktif",
    value: "14",
    change: "+1",
    trend: "up" as const,
    sub: "Supplier terdaftar",
    icon: Building2,
  },
];

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function PembelianPage() {

  const module =
    NAV_CONFIG.find(
      (n) => n.id === "pembelian"
    )!;

  return (

    <AppShell
      title="Purchasing Dashboard"
      subtitle="Overview aktivitas pembelian dan supplier"
    >

      {/* OVERVIEW */}

      <ModuleOverview
        module={module}
        stats={STATS}
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
              Supplier performance terpantau stabil
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
              Berdasarkan histori transaksi bulan ini,
              supplier dengan performa terbaik adalah
              PT Sumber Makmur dengan tingkat ketepatan
              pengiriman 98% dan rata-rata lead time
              tercepat dibanding supplier lainnya.
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
                Top Supplier
              </div>

              <div className="mt-2 text-white font-semibold">
                PT Sumber Makmur
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
                Avg Lead Time
              </div>

              <div className="mt-2 text-gold-400 font-bold text-xl">
                2.1 Hari
              </div>
            </div>

          </div>

        </div>

      </div>

    </AppShell>
  );
}