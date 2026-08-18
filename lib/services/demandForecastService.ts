import { api } from "@/lib/api";

import type {
  ModelComparisonResponse,
} from "@/types/forecast.type";

const BASE_URL = "/DemandForecast";

export async function getRealtimeForecast() {
  const response = await api.get(BASE_URL);
  const result = response.data;

  return result.data ?? result;
}

export async function generateMonthlyForecast() {
  const response = await api.post(`${BASE_URL}/generate`);
  const result = response.data;

  return result.data ?? result;
}

export async function getLatestMonthlyForecast() {
  const response = await api.get(`${BASE_URL}/latest`);
  const result = response.data;

  return result.data ?? result;
}

export async function downloadForecast() {
  const response = await api.get(`${BASE_URL}/download`, {
    responseType: "blob",
  });

  return response.data;
}

// ============================================================
// MODEL COMPARISON
// ============================================================

export async function getModelComparison(): Promise<ModelComparisonResponse> {
  const response = await api.get(
    `${BASE_URL}/model-comparison`
  );

  const result = response.data;

  const data = result.data ?? result;

  return {
    evaluationMethod: data.evaluation_method,
    trainingPeriod: data.training_period,
    testingPeriod: data.testing_period,
    totalProducts: data.total_products,
    productsEvaluated: data.products_evaluated,
    bestModel: data.best_model,
    models: data.models.map((model: any) => ({
      model: model.model,
      mae: model.mae,
      rmse: model.rmse,
      r2: model.r2,
      productsEvaluated: model.products_evaluated,
    })),
  };
}