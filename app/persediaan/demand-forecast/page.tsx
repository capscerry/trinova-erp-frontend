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

  return (
    <AppShell
      title="AI Demand Forecast"
      subtitle="Prediksi kebutuhan stok bulan berikutnya"
    >
      <DemandForecastTable
        data={data}
        loading={loading}
      />
    </AppShell>
  );
}