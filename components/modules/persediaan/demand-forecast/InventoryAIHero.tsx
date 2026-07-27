"use client";

import Link from "next/link";
import { ArrowRight, Brain, Calendar, Boxes, PackageSearch } from "lucide-react";

import type { InventoryAiSummary } from "@/lib/services/inventory-dashboard.service";

interface InventoryAIHeroProps {
  aiSummary: InventoryAiSummary;
}

export function InventoryAIHero({
  aiSummary,
}: InventoryAIHeroProps) {
  return (
    <Link
      href="/persediaan/demand-forecast"
      className="group mt-6 block"
    >
      <div className="rounded-2xl border border-navy-800 bg-linear-to-r from-navy-900 to-navy-700 p-6 shadow-lg transition-all duration-200 hover:from-navy-800 hover:to-navy-600 hover:shadow-xl">

        <div className="flex items-start justify-between gap-6">

          {/* LEFT */}

          <div className="min-w-0">

            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold-400">
              <Brain size={11} />
              AI Inventory Insight
            </div>

            <h2 className="font-serif text-xl font-bold leading-tight text-white">
              Optimalkan persediaan menggunakan AI Demand Forecast
            </h2>

            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-slate-300">
              Prediksi permintaan bulan berikutnya berdasarkan histori transaksi
              keluar untuk membantu perencanaan stok dan keputusan restock.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-gold-400 transition-all duration-150 group-hover:gap-3">
              Open Demand Forecast

              <ArrowRight
                size={14}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </div>

          </div>

          {/* RIGHT */}

          <div className="hidden lg:flex flex-col gap-2.5 shrink-0 min-w-60">

            <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400">
                Demand Forecast Summary
            </p>

            <InsightItem
                icon={<Calendar size={13} className="text-blue-300" />}
                label="Forecast Month"
                value={aiSummary.forecastMonth}
            />

            <InsightItem
                icon={<Boxes size={13} className="text-green-300" />}
                label="Forecasted Products"
                value={`${aiSummary.forecastedProducts} Products`}
            />

            <InsightItem
                icon={<PackageSearch size={13} className="text-amber-300" />}
                label="Need Restock"
                value={`${aiSummary.needRestock} Products`}
            />

            <InsightItem
                icon={<Calendar size={13} className="text-purple-300" />}
                label="Generated"
                value={new Date(aiSummary.generatedAt).toLocaleDateString(
                "id-ID",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                }
                )}
            />

            </div>

        </div>

      </div>
    </Link>
  );
}

function InsightItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors">

      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-[10px] uppercase tracking-widest text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate font-serif text-[13px] font-semibold text-white">
          {value}
        </p>

      </div>

    </div>
  );
}