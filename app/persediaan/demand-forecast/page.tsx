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

import {
  getDemandForecast,
} from "@/lib/services/demandForecastService";

import {
  DemandForecast,
} from "./types";

export default function DemandForecastPage() {
  const [data, setData] =
    useState<DemandForecast[]>([]);

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

  const needReorder =
    data.filter(
      (item) =>
        item.recommendation ===
        "Perlu Reorder"
    ).length;

  const needRestock =
    data.filter(
      (item) =>
        item.recommendation ===
        "Segera Restock"
    ).length;

  return (
    <AppShell
      title="AI Demand Forecast"
      subtitle="Prediksi kebutuhan stok bulan berikutnya"
    >
      <div className="space-y-6">

        <ForecastSummary
          totalProducts={
            totalProducts
          }
          totalForecast={
            totalForecast
          }
          needReorder={
            needReorder
          }
          needRestock={
            needRestock
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