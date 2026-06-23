"use client";

import { AppShell } from "@/components/layout";

import { ModuleOverview } from "@/components/modules/ModuleOverview";

import { NAV_CONFIG } from "@/lib/nav";

import Link from "next/link";
import { Brain, ArrowRight, TrendingUp, Clock, Trophy, ShoppingCart, Truck, Clock3, Building2 } from "lucide-react";

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

      {/* AI INSIGHT CTA */}
      <Link href="/pembelian/insight" className="block mt-6 group">
        <div className="rounded-2xl border border-navy-800 bg-gradient-to-r from-navy-900 to-navy-700 p-6 shadow-lg hover:shadow-xl hover:from-navy-800 hover:to-navy-600 transition-all duration-200">

          <div className="flex items-start justify-between gap-6">

            {/* Left — text */}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/15 text-gold-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                <Brain size={11} />
                AI Purchasing Insight
              </div>

              <h2 className="text-xl font-bold text-white font-serif leading-tight">
                Lihat analisis penuh performa pembelian
              </h2>

              <p className="mt-2 text-slate-300 text-[13px] max-w-xl leading-relaxed">
                Skor supplier AHP + TOPSIS, spend bulanan, lead time aktual vs katalog,
                kesehatan pembayaran, konsentrasi HHI, dan kandidat reorder — semua dari
                data transaksi nyata.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-gold-400 text-[13px] font-semibold group-hover:gap-3 transition-all duration-150">
                Buka AI Insight
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            </div>

            {/* Right — feature pills */}
            <div className="hidden lg:flex flex-col gap-2.5 shrink-0 min-w-[200px]">

              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gold-400/15 flex items-center justify-center shrink-0">
                  <Trophy size={13} className="text-gold-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Supplier Terbaik</p>
                  <p className="text-white text-[13px] font-semibold font-serif">Skor AHP + TOPSIS</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-400/15 flex items-center justify-center shrink-0">
                  <TrendingUp size={13} className="text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Spend Bulanan</p>
                  <p className="text-white text-[13px] font-semibold font-serif">Trend & Pareto HHI</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-400/15 flex items-center justify-center shrink-0">
                  <Clock size={13} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Lead Time</p>
                  <p className="text-white text-[13px] font-semibold font-serif">Aktual vs Katalog</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </Link>

    </AppShell>
  );
}