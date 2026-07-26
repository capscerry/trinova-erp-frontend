"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";

import type { InventoryAiSummary } from "@/lib/services/inventory-dashboard.service";

interface ForecastInsightProps {
  aiSummary: InventoryAiSummary;
}

export function ForecastInsight({
  aiSummary,
}: ForecastInsightProps) {
  const ratio =
    aiSummary.forecastedProducts === 0
      ? 0
      : aiSummary.needRestock / aiSummary.forecastedProducts;

  const percentage = Math.round(ratio * 100);

  const generatedAt = new Date(aiSummary.generatedAt);

  const risk =
    ratio >= 0.6
      ? {
          label: "Risiko Restock Tinggi",
          className: "bg-red-100 text-red-700 border-red-200",
          icon: <AlertTriangle size={16} />,
        }
      : ratio >= 0.3
      ? {
          label: "Perlu Pemantauan",
          className: "bg-amber-100 text-amber-700 border-amber-200",
          icon: <Activity size={16} />,
        }
      : {
          label: "Kondisi Stabil",
          className: "bg-green-100 text-green-700 border-green-200",
          icon: <CheckCircle2 size={16} />,
        };

  const insight =
    ratio >= 0.6
      ? `Berdasarkan hasil analisis AI, sekitar ${percentage}% produk diperkirakan memerlukan restock pada periode mendatang. Prioritaskan pengadaan untuk produk dengan prediksi demand tertinggi agar tidak terjadi kekurangan stok.`
      : ratio >= 0.3
      ? `Hasil forecasting menunjukkan sekitar ${percentage}% produk diprediksi membutuhkan restock. Kondisi inventory masih terkendali, namun perlu dilakukan pemantauan terhadap produk dengan permintaan tinggi untuk menjaga ketersediaan stok.`
      : `Berdasarkan hasil forecasting, kondisi inventory diperkirakan tetap stabil. Hanya sekitar ${percentage}% produk yang memerlukan restock sehingga stok saat ini dinilai masih mampu memenuhi kebutuhan pada periode berikutnya.`;

  return (
    <section className="mt-6">

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                <BrainCircuit size={18} />
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                AI Forecast Insight
              </h2>

            </div>

            <p className="text-sm text-slate-500">
              Analisis otomatis berdasarkan hasil prediksi AI untuk membantu
              pengambilan keputusan inventory.
            </p>

          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${risk.className}`}
          >
            {risk.icon}
            {risk.label}
          </div>

        </div>

        {/* Metrics */}
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            icon={<Calendar size={18} />}
            title="Forecast Bulan"
            value={aiSummary.forecastMonth}
          />

          <MetricCard
            icon={<PackageCheck size={18} />}
            title="Produk Diprediksi"
            value={`${aiSummary.forecastedProducts}`}
          />

          <MetricCard
            icon={<BarChart3 size={18} />}
            title="Rata-rata Demand"
            value={`${aiSummary.averageForecast.toFixed(2)} Unit`}
          />

          <MetricCard
            icon={<AlertTriangle size={18} />}
            title="Perlu Restock"
            value={`${aiSummary.needRestock} Produk`}
          />

        </div>

        {/* AI Insight */}
        <div className="border-t border-slate-100 px-6 py-6">

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">

            {/* Judul */}
            <div className="mb-3 flex items-center gap-2">
            <BrainCircuit
                size={18}
                className="text-indigo-700"
            />
            <h3 className="font-semibold text-indigo-900">
                Insight AI
            </h3>
            </div>

            {/* Badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            <BrainCircuit size={14} />
            Insight dibuat secara otomatis berdasarkan hasil Demand Forecast AI
            </div>

            {/* PARAGRAF */}
            <p className="leading-7 text-slate-700">
            {insight}
            </p>

            {/* ===== TARUH DI SINI ===== */}
            <div className="mt-6 border-t border-indigo-200 pt-5">

            <div className="mb-2 flex items-center justify-between text-sm">

                <span className="font-medium text-slate-600">
                Persentase Produk yang Memerlukan Restock
                </span>

                <span className="font-bold text-slate-800">
                {percentage}%
                </span>

            </div>

            {/* Progress Bar */}
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                <div
                className={`h-full rounded-full transition-all duration-700 ${
                    ratio >= 0.6
                    ? "bg-red-500"
                    : ratio >= 0.3
                    ? "bg-amber-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${percentage}%` }}
                />

            </div>

            {/* Label */}
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                <span>Stabil</span>
                <span>Pemantauan</span>
                <span>Risiko Tinggi</span>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between text-xs text-slate-500">

                <span>
                Generated pada{" "}
                <span className="font-medium text-slate-700">
                    {generatedAt.toLocaleString("id-ID")}
                </span>
                </span>

                <span>
                Forecast Bulan{" "}
                <span className="font-medium text-slate-700">
                    {aiSummary.forecastMonth}
                </span>
                </span>

            </div>

            </div>

        </div>

        </div>
    
    </div>

    </section>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function MetricCard({
  icon,
  title,
  value,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-5 transition-all hover:shadow-md">

      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>

      <h3 className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </h3>

    </div>
  );
}