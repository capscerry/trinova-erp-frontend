"use client";

import {
  TrendingUp,
  BarChart3,
  Boxes,
  PackageSearch,
} from "lucide-react";

import type { InventoryAiSummary } from "@/lib/services/inventory-dashboard.service";

interface InventoryAISummaryProps {
  aiSummary: InventoryAiSummary;
}

export function InventoryAISummary({
  aiSummary,
}: InventoryAISummaryProps) {
  return (
    <section className="mt-6">

        <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-600">
          AI Forecast Summary
        </p>
      </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
            icon={<TrendingUp size={18} />}
            title="Highest Demand"
            value={aiSummary.highestDemand.productName}
            subtitle={`${aiSummary.highestDemand.forecast.toFixed(2)} Units`}
            iconClass="bg-green-100 text-green-700"
        />

        <SummaryCard
            icon={<BarChart3 size={18} />}
            title="Average Forecast"
            value={`${aiSummary.averageForecast.toFixed(2)} Units`}
            subtitle="Average Monthly Demand"
            iconClass="bg-blue-100 text-blue-700"
        />

        <SummaryCard
            icon={<PackageSearch size={18} />}
            title="Need Restock"
            value={`${aiSummary.needRestock}`}
            subtitle="Products Recommended"
            iconClass="bg-amber-100 text-amber-700"
        />

        <SummaryCard
            icon={<Boxes size={18} />}
            title="Forecasted Products"
            value={`${aiSummary.forecastedProducts}`}
            subtitle="Products Predicted"
            iconClass="bg-purple-100 text-purple-700"
        />

        </div>

    </section>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  iconClass: string;
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  iconClass,
}: SummaryCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">

      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>

      <h3 className="mt-2 line-clamp-2 font-serif text-lg font-bold text-slate-900">
        {value}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {subtitle}
      </p>

    </div>
  );
}