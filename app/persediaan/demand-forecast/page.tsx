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

import {
  getDemandForecast,
  getRealtimeForecast,
  generateMonthlyForecast,
  getLatestMonthlyForecast,
  downloadForecast,
} from "@/lib/services/demandForecastService";

import { Button } from "@/components/ui/Button";
import {
  Clock3,
  Sparkles,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";


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

  const [loading, setLoading] = useState(false);

  const [generating, setGenerating] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [monthlyGeneratedAt, setMonthlyGeneratedAt] = useState("");

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const realtime = await getRealtimeForecast();

      setData(realtime);

      const latest = await getLatestMonthlyForecast();

      if (latest.length > 0) {
        setMonthlyGeneratedAt(
          latest[0].generated_at
        );
      }
    } catch (error) {

      console.error(error);

      toast.error(
        "Gagal mengambil data forecast"
      );

    } finally {

      setLoading(false);

    }
  }

  async function handleGenerateForecast() {
    try {
      setGenerating(true);

      await generateMonthlyForecast();

      await fetchData();

      toast.success(
        "Monthly forecast generated successfully."
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "Failed to generate monthly forecast."
      );

    } finally {

      setGenerating(false);

    }
  }

  async function handleRefreshForecast() {
    try {
      setRefreshing(true);

      await fetchData();

      toast.success(
        "Realtime forecast updated successfully."
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "Failed to refresh realtime forecast."
      );

    } finally {

      setRefreshing(false);

    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const blob = await downloadForecast();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `DemandForecast_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Forecast downloaded successfully.");
    } catch (error) {
      console.error(error);

      toast.error("Failed to download forecast.");
    } finally {
      setDownloading(false);
    }
  };

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
      subtitle="Forecast permintaan produk bulan berikutnya"
    >
      <div className="space-y-6">

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Realtime Forecast */}
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex-1">

              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-slate-500" />

                <h3 className="text-lg font-semibold text-slate-800">
                  Forecast Last Updated
                </h3>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  LAST UPDATED
                </p>

                <p className="mt-0.5 text-xl font-bold">
                  {formatDate(generatedAt)}
                </p>
              </div>

              <p className="mt-3 min-h-8 text-sm leading-relaxed text-slate-500">
                Realtime prediction based on the latest inventory transactions.
              </p>

            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">

              <Button
                onClick={handleRefreshForecast}
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 px-5"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh Forecast
                  </>
                )}
              </Button>

            </div>

          </div>

          {/* Monthly Forecast */}
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex-1">

              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />

                <h3 className="text-lg font-semibold text-slate-800">
                  Monthly Forecast
                </h3>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  LAST GENERATED
                </p>

                <p className="mt-0.5 text-xl font-bold">
                  {formatDate(monthlyGeneratedAt)}
                </p>
              </div>

              <p className="mt-3 min-h-8 text-sm leading-relaxed text-slate-500">
                Monthly forecast snapshot stored for reporting and future analysis.
              </p>

            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">

              <div className="flex flex-wrap gap-3">

                <Button
                  onClick={handleGenerateForecast}
                  disabled={generating}
                  className="inline-flex h-10 items-center justify-center gap-2 px-5"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Monthly Forecast
                    </>
                  )}
                </Button>

                <Button
                  variant="primary"
                  onClick={handleDownload}
                  disabled={downloading || data.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 px-5"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Excel Forecast
                    </>
                  )}
                </Button>

              </div>

            </div>

          </div>

        </div>

        <ForecastSummary
          totalProducts={totalProducts}
          totalForecast={totalForecast}
          averageForecast={averageForecast}
          forecastMonth={forecastMonth}
        />

        <DemandForecastTable
          data={data}
          loading={loading}
        />

      </div>
    </AppShell>
  );
}
