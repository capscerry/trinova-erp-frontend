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

import type {
  Forecast,
  ModelComparisonResponse,
} from "@/types/forecast.type";

import {
  getRealtimeForecast,
  generateMonthlyForecast,
  getLatestMonthlyForecast,
  downloadForecast,
  getModelComparison,
} from "@/lib/services/demandForecastService";

import { Button }
  from "@/components/ui/Button";

import {
  Clock3,
  Sparkles,
  Download,
  Loader2,
  RefreshCw,
  BarChart3,
  Trophy,
} from "lucide-react";

import ForecastTrendChart
  from "@/components/modules/persediaan/demand-forecast/ForecastTrendChart";

import TopForecastProductsChart
  from "@/components/modules/persediaan/demand-forecast/TopForecastProductsChart";


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

  // ========================================================================
  // FORECAST STATE
  // ========================================================================

  const [data, setData] =
    useState<Forecast[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [monthlyGeneratedAt, setMonthlyGeneratedAt] =
    useState("");

  const [downloading, setDownloading] =
    useState(false);


  // ========================================================================
  // MODEL COMPARISON STATE
  // ========================================================================

  const [modelComparison, setModelComparison] =
    useState<ModelComparisonResponse | null>(null);

  const [comparisonLoading, setComparisonLoading] =
    useState(false);


  // ========================================================================
  // INITIAL LOAD
  // ========================================================================

  useEffect(() => {
    fetchData();
    fetchModelComparison();
  }, []);


  // ========================================================================
  // FETCH FORECAST DATA
  // ========================================================================

  async function fetchData() {

    try {

      setLoading(true);

      const realtime =
        await getRealtimeForecast();

      setData(realtime);

      const latest =
        await getLatestMonthlyForecast();

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


  // ========================================================================
  // FETCH MODEL COMPARISON
  // ========================================================================

  async function fetchModelComparison() {
    try {
      const comparison = await getModelComparison();

      console.log("===== MODEL COMPARISON RESPONSE =====");
      console.log(comparison);
      console.log("evaluationMethod:", comparison.evaluationMethod);
      console.log("trainingPeriod:", comparison.trainingPeriod);
      console.log("testingPeriod:", comparison.testingPeriod);
      console.log("totalProducts:", comparison.totalProducts);
      console.log("productsEvaluated:", comparison.productsEvaluated);
      console.log("bestModel:", comparison.bestModel);
      console.log("models:", comparison.models);
      console.log("======================================");

      setModelComparison(comparison);
    } catch (error) {
      console.error("Failed to fetch model comparison:", error);
    }
  }


  // ========================================================================
  // GENERATE MONTHLY FORECAST
  // ========================================================================

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


  // ========================================================================
  // REFRESH REALTIME FORECAST
  // ========================================================================

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


  // ========================================================================
  // FORECAST SUMMARY
  // ========================================================================

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


  const forecastMonth = (() => {

    const date = new Date();

    date.setMonth(
      date.getMonth() + 1
    );

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

  })();


  const generatedAt =
    data.length > 0
      ? data[0].generated_at
      : "";


  // ========================================================================
  // DOWNLOAD FORECAST
  // ========================================================================

  const handleDownload = async () => {

    try {

      setDownloading(true);

      const blob =
        await downloadForecast();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `DemandForecast_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success(
        "Forecast downloaded successfully."
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "Failed to download forecast."
      );

    } finally {

      setDownloading(false);

    }
  };


  // ========================================================================
  // MODEL COMPARISON HELPERS
  // ========================================================================

  const bestModel =
    modelComparison?.bestModel ?? "";

  const linearRegression =
    modelComparison?.models.find(
      (model) =>
        model.model === "Linear Regression"
    );

  const xgboost =
    modelComparison?.models.find(
      (model) =>
        model.model === "XGBoost"
    );


  // ========================================================================
  // RENDER
  // ========================================================================

  return (

    <AppShell
      title="AI Demand Forecast"
      subtitle="Predict next month's inventory demand using AI forecasting models."
    >

      <div className="space-y-6">


        {/* ================================================================
            REALTIME + MONTHLY FORECAST
        ================================================================= */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">


          {/* Realtime Forecast */}

          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex-1">

              <div className="flex items-center gap-2">

                <Clock3
                  className="h-5 w-5 text-slate-500"
                />

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

                    <Loader2
                      className="h-4 w-4 animate-spin"
                    />

                    Refreshing...

                  </>

                ) : (

                  <>

                    <RefreshCw
                      className="h-4 w-4"
                    />

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

                <Sparkles
                  className="h-5 w-5 text-blue-600"
                />

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

                      <Loader2
                        className="h-4 w-4 animate-spin"
                      />

                      Generating...

                    </>

                  ) : (

                    <>

                      <Sparkles
                        className="h-4 w-4"
                      />

                      Generate Monthly Forecast

                    </>

                  )}

                </Button>


                <Button
                  variant="primary"
                  onClick={handleDownload}
                  disabled={
                    downloading ||
                    data.length === 0
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 px-5"
                >

                  {downloading ? (

                    <>

                      <Loader2
                        className="h-4 w-4 animate-spin"
                      />

                      Downloading...

                    </>

                  ) : (

                    <>

                      <Download
                        className="h-4 w-4"
                      />

                      Download Excel Forecast

                    </>

                  )}

                </Button>

              </div>

            </div>

          </div>

        </div>


        {/* ================================================================
            FORECAST SUMMARY
        ================================================================= */}

        <ForecastSummary
          totalProducts={totalProducts}
          totalForecast={totalForecast}
          averageForecast={averageForecast}
          forecastMonth={forecastMonth}
        />


        {/* ================================================================
            MODEL COMPARISON
        ================================================================= */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Header */}

          <div className="border-b border-slate-100 p-6">

            <div className="flex items-center gap-2">

              <BarChart3
                className="h-5 w-5 text-blue-600"
              />

              <div>

                <h3 className="text-lg font-semibold text-slate-800">
                  AI Model Comparison
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Performance comparison between Linear Regression and XGBoost.
                </p>

              </div>

            </div>

          </div>


          {/* Loading */}

          {comparisonLoading ? (

            <div className="flex items-center justify-center p-10">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <Loader2
                  className="h-4 w-4 animate-spin"
                />

                Loading model comparison...

              </div>

            </div>

          ) : modelComparison ? (

            <>

              {/* Evaluation Information */}

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 p-6 md:grid-cols-4">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Evaluation Method
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {modelComparison.evaluationMethod}
                  </p>

                </div>


                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Training Period
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {modelComparison.trainingPeriod}
                  </p>

                </div>


                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Testing Period
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {modelComparison.testingPeriod}
                  </p>

                </div>


                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Products Evaluated
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {modelComparison.productsEvaluated} /{" "}
                    {modelComparison.totalProducts}
                  </p>

                </div>

              </div>


              {/* Best Model */}

              <div className="mx-6 mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">

                    <Trophy
                      className="h-5 w-5 text-amber-500"
                    />

                  </div>


                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      BEST MODEL
                    </p>

                    <p className="mt-0.5 text-base font-bold text-slate-800">
                      {bestModel}
                    </p>

                  </div>

                </div>

              </div>


              {/* Comparison Table */}

              <div className="overflow-x-auto p-6">

                <table className="w-full min-w-150 text-sm">

                  <thead>

                    <tr className="border-b border-slate-200">

                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        Model
                      </th>

                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        MAE ↓
                      </th>

                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        RMSE ↓
                      </th>

                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        R²
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {modelComparison.models.map(
                      (model) => {

                        const isBest =
                          model.model === bestModel;

                        return (

                          <tr
                            key={model.model}
                            className="border-b border-slate-100 last:border-0"
                          >

                            <td className="px-4 py-4">

                              <div className="flex items-center gap-2">

                                {isBest && (

                                  <Trophy
                                    className="h-4 w-4 text-amber-500"
                                  />

                                )}

                                <span
                                  className={
                                    isBest
                                      ? "font-semibold text-slate-900"
                                      : "font-medium text-slate-700"
                                  }
                                >
                                  {model.model}
                                </span>

                              </div>

                            </td>


                            <td className="px-4 py-4 text-right font-medium text-slate-700">

                              {model.mae.toFixed(2)}

                            </td>


                            <td className="px-4 py-4 text-right font-medium text-slate-700">

                              {model.rmse.toFixed(2)}

                            </td>


                            <td className="px-4 py-4 text-right font-medium text-slate-700">

                              {model.r2.toFixed(4)}

                            </td>

                          </tr>

                        );

                      }
                    )}

                  </tbody>

                </table>

              </div>


              {/* Explanation */}

              <div className="border-t border-slate-100 px-6 pb-6">

                <p className="pt-4 text-xs leading-relaxed text-slate-500">

                  Lower MAE and RMSE indicate lower prediction error.
                  R² measures how well the model explains variation in the
                  observed demand. The model with the lowest MAE is selected
                  as the best-performing model for this evaluation.

                </p>

              </div>

            </>

          ) : (

            <div className="p-10 text-center text-sm text-slate-500">

              Model comparison data is unavailable.

            </div>

          )}

        </div>


        {/* ================================================================
            CHARTS
        ================================================================= */}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          <ForecastTrendChart
            data={data}
            generatedAt={formatDate(generatedAt)}
          />

          <TopForecastProductsChart
            data={data}
            generatedAt={formatDate(generatedAt)}
          />

        </div>


        {/* ================================================================
            FORECAST TABLE
        ================================================================= */}

        <DemandForecastTable
          data={data}
          loading={loading}
        />

      </div>

    </AppShell>
  );
}