export interface Forecast {
  product_id: number;
  product_name: string;
  forecast_month: string;
  last_training_period: string;
  historical_records: number;
  forecast_next_month: number;
  generated_at: string;
}

// ============================================================
// AI MODEL COMPARISON
// ============================================================

export interface ModelComparisonResult {
  model: string;
  mae: number;
  rmse: number;
  r2: number;
  productsEvaluated?: number;
}

export interface ModelComparisonResponse {
  evaluationMethod: string;
  trainingPeriod: string;
  testingPeriod: string;
  totalProducts: number;
  productsEvaluated: number;
  bestModel: string;
  models: ModelComparisonResult[];
}