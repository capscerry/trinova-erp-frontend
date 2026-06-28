"use client";

import {
  useEffect,
  useState,
} from "react";

import { AppShell }
  from "@/components/layout";

import { toast }
  from "sonner";

import DemandForecastTable
  from "@/components/modules/persediaan/demand-forecast/DemandForecastTable";

import ForecastSummary
  from "@/components/modules/persediaan/demand-forecast/ForecastSummary";

import { Forecast } from "@/types/forecast.type";

import { getDemandForecast } from "@/lib/services/demandForecastService";

import { Clock3 } from "lucide-react";


function formatDate(date: string) {
  if (!date) return "-";

  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function DemandForecastPage() {
  const [data, setData] =
  useState<Forecast[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const result =
        await getDemandForecast();

      setData(result);

    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal mengambil data forecast"
      );

    } finally {
      setLoading(false);
    }
  }

  const totalProducts =
    data.length;

  const totalForecast =
    data.reduce(
      (sum, item) =>
        sum + item.forecast_next_month,
      0
    );

    const averageForecast =
    totalProducts === 0
      ? 0
      : totalForecast / totalProducts;

    const forecastMonth =
    data.length > 0
      ? data[0].forecast_month
      : "";

    const generatedAt =
    data.length > 0
      ? data[0].generated_at
      : "";

  return (
    <AppShell
      title="AI Demand Forecast"
      subtitle="Forecast permintaan produk bulan berikutnya"    >
      <div className="space-y-6">

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Clock3 className="h-5 w-5 text-slate-500" />

          <div>
            <p className="text-xs text-slate-500">
              Last Forecast Generated
            </p>

            <p className="font-medium text-slate-800">
              {formatDate(generatedAt)}
            </p>
          </div>
        </div>

        <ForecastSummary
          totalProducts={
            totalProducts
          }
          totalForecast={
            totalForecast
          }
          averageForecast={
            averageForecast
          }
          forecastMonth={
            forecastMonth
          }
        />

        <DemandForecastTable
          data={data}
          loading={loading}
        />

      </div>
    </AppShell>
  );
}