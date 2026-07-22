import { api } from "../api";

// ─── Actual FastAPI predict response (via C# controller envelope) ─────────────
// Controller wraps: { status: bool, message: string, data: SupplierRiskPredictResponse }
// FastAPI SupplierRiskPredictResponse fields:
//   supplier_id, risk_level ("LOW"|"MEDIUM"|"HIGH"), delay_probability, late_probability

export interface RawPredictData {
  supplier_id?:       number;
  risk_level:         string;        // "LOW" | "MEDIUM" | "HIGH"
  delay_probability:  number;        // 0.0 – 1.0  → used as risk_score
  late_probability:   number;        // 0 – 100
}

// Normalized shape used by the frontend components
export interface SupplierRiskPredictResponse {
  supplier_id:   number;
  supplier_name: string;
  risk_score:    number;             // delay_probability
  risk_level:    "Low" | "Medium" | "High" | "Critical";
  features:      Record<string, number>;
  contributions: Record<string, number>;
}

// ─── Train response (SupplierRiskTrainResponse from backend) ──────────────────
// Controller wraps: { status, message, data: SupplierRiskTrainResponse }

export interface TrainSplitMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  log_loss: number;
}

export interface TrainFoldMetrics {
  fold: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  log_loss: number;
}

export interface TrainCVResults {
  fold_metrics: TrainFoldMetrics[];

  avg_accuracy?: number | null;
  avg_precision?: number | null;
  avg_recall?: number | null;
  avg_f1_score?: number | null;
  avg_auc_roc?: number | null;
  avg_log_loss?: number | null;

  std_accuracy?: number | null;
  std_precision?: number | null;
  std_recall?: number | null;
  std_f1_score?: number | null;
  std_auc_roc?: number | null;
  std_log_loss?: number | null;
}

export interface TrainResponse {
  message:         string;
  split_method?:   string;
  samples_trained?: number;
  samples_tested?:  number;
  best_round?:      number;
  model_path?:      string;
  data_source?:     string;
  train_metrics?:   TrainSplitMetrics;
  test_metrics?:    TrainSplitMetrics;
  /** TimeSeriesSplit CV run on the training set — per-fold + averaged metrics */
  cv_results?:      TrainCVResults;
}

// ─── Training row — must match FastAPI REQUIRED_COLUMNS exactly ───────────────
// supplier_price, lead_time_days, claim_rate, on_time_rate, order_frequency, late_delivery

export interface TrainRow {
  supplier_id?:    number;
  supplier_price:  number;
  lead_time_days:  number;
  claim_rate:      number;
  on_time_rate:    number;
  order_frequency: number;
  late_delivery:   number;   // 0 = on-time, 1 = late
}

// ─── ML metric shapes (for future /metrics endpoint) ─────────────────────────
// These are kept so BackendMetricsCard types stay intact; actual data comes
// from the train response fields (accuracy, roc_auc, etc.)

export interface BackendSplitMetrics {
  logloss: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc: number;
  n: number;
}

export interface BackendRoundMetrics {
  round:     number;
  trainLoss: number;
  valLoss:   number;
}

export interface BackendFoldResult {
  fold:    number;
  metrics: BackendSplitMetrics;
}

export interface BackendModelMetrics {
  trainMetrics:  BackendSplitMetrics;
  valMetrics:    BackendSplitMetrics;
  testMetrics:   BackendSplitMetrics;
  learningCurve: BackendRoundMetrics[];
  cvFolds:       BackendFoldResult[];
  cvMean:        BackendSplitMetrics;
  cvStd:         BackendSplitMetrics;
  bestRound:     number;
  totalRounds:   number;
  splitSizes:    { train: number; val: number; test: number };
  isOverfit:     boolean;
  trainValGap:   number;
  trainedAt?:    string;
  // Summary metrics from train response, shown in the simple metrics card
  accuracy?:     number;
  roc_auc?:      number;
  samples_trained?: number;
  samples_tested?:  number;
  data_source?:  string;
}

// ─── Helper — unwrap controller envelope ─────────────────────────────────────

function unwrap<T>(res: any): T {
  // Backend returns { status, message, data } — unwrap .data if present
  if (res.data && typeof res.data === "object" && "data" in res.data) {
    return res.data.data as T;
  }
  return res.data as T;
}

// ─── Predict ──────────────────────────────────────────────────────────────────

/**
 * GET /api/supplier-risk/predict/{supplierId}
 * Returns raw FastAPI predict data. Caller is responsible for enriching
 * with supplier_name from the ERP suppliers list.
 */
export const predictSupplierRiskRaw = async (
  supplierId: number,
): Promise<RawPredictData> => {
  const res = await api.get(`/supplier-risk/predict/${supplierId}`);
  return unwrap<RawPredictData>(res);
};

// ─── Train — server-side bundled CSV ──────────────────────────────────────────

export const trainFromServerCsv = async (): Promise<TrainResponse> => {
  const res = await api.post("/supplier-risk/train");
  return unwrap<TrainResponse>(res);
};

// ─── Train — live ERP data ────────────────────────────────────────────────────

export const trainFromErp = async (
  appendToExisting = true,
): Promise<TrainResponse> => {
  const res = await api.post("/supplier-risk/train/from-erp", {
    append_to_existing: appendToExisting,
  });

  console.log("========== AXIOS RESPONSE ==========");
  console.log(res);

  console.log("========== AXIOS DATA ==========");
  console.log(res.data);

  const data = unwrap<TrainResponse>(res);

  console.log("========== UNWRAPPED ==========");
  console.log(data);

  console.log("========== TRAIN METRICS ==========");
  console.log(data.train_metrics);

  console.log("========== TEST METRICS ==========");
  console.log(data.test_metrics);

  console.log("========== CV RESULTS ==========");
  console.log(data.cv_results);

  return data;
};

// ─── Train — pre-labeled JSON rows ───────────────────────────────────────────

export const trainFromRows = async (
  rows: TrainRow[],
  appendToExisting = true,
): Promise<TrainResponse> => {
  const res = await api.post("/supplier-risk/train/from-rows", {
    rows,
    append_to_existing: appendToExisting,
  });
  return unwrap<TrainResponse>(res);
};

// ─── Train — CSV file upload ──────────────────────────────────────────────────

export const trainFromCsvUpload = async (file: File): Promise<TrainResponse> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/supplier-risk/train/from-csv-upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap<TrainResponse>(res);
};

// ─── AHP-TOPSIS ranking via backend Python service ───────────────────────────
// POST /api/supplier-risk/rank/ahp-topsis
// Accepts the results[] from predictAllSuppliers() and returns TOPSIS-ranked output.
// The Python service computes AHP weights + TOPSIS scores from the ML features.

export interface BackendRankResponse {
  total:             number;
  consistency_ratio: number;
  ahp_weights:       Record<string, number>;   // e.g. { "delay_probability": 0.54, ... }
  ranked_suppliers:  BatchPredictItem[];        // same fields as BatchPredictItem + topsis_score + topsis_rank
}

export const rankWithAhpTopsis = async (
  suppliers: BatchPredictItem[],
  ahpMatrix?: number[][],
): Promise<BackendRankResponse> => {
  const body: Record<string, unknown> = { suppliers };
  if (ahpMatrix) body.ahp_matrix = { matrix: ahpMatrix };
  const res = await api.post("/supplier-risk/rank/ahp-topsis", body);
  return unwrap<BackendRankResponse>(res);
};

// ─── Batch predict all suppliers ─────────────────────────────────────────────
// GET /api/supplier-risk/predict/all
// Returns ML scores for every supplier the backend knows about.

export interface BatchPredictItem {
  supplier_id:       number;
  supplier_name?:    string;
  risk_level:        string;        // "LOW" | "MEDIUM" | "HIGH"
  delay_probability: number;        // 0–1
  late_probability:  number;        // 0–100 (backend field)
}

export interface BatchPredictResponse {
  results: BatchPredictItem[];
  total:   number;
}

export const predictAllSuppliers = async (): Promise<BatchPredictResponse> => {
  const res = await api.get("/supplier-risk/predict/all");
  const data = unwrap<any>(res);
  // Backend may return { results: [...], total: N } or just an array
  if (Array.isArray(data)) return { results: data, total: data.length };
  return { results: data?.results ?? [], total: data?.total ?? 0 };
};

// ─── Full pipeline: train-from-ERP → predict-all → AHP-TOPSIS rank ───────────
// POST /api/supplier-risk/evaluate/all
// One-shot endpoint that runs the complete pipeline server-side.

export interface RankedSupplierResult {
  supplier_id:       number;
  supplier_name?:    string;
  risk_level:        string;
  delay_probability: number;
  topsis_score?:     number;
  topsis_rank?:      number;
}

export interface FullEvaluationResponse {
  message?:        string;
  train_metrics?:  TrainSplitMetrics;
  test_metrics?:   TrainSplitMetrics;
  samples_trained?: number;
  samples_tested?:  number;
  data_source?:    string;
  results:         RankedSupplierResult[];
}

export const evaluateAll = async (
  appendToExisting = true,
): Promise<FullEvaluationResponse> => {
  const res = await api.post("/supplier-risk/evaluate/all", {
    append_to_existing: appendToExisting,
  });
  return unwrap<FullEvaluationResponse>(res);
};

// ─── Model metrics — built from last train response ───────────────────────────
// There is no dedicated /metrics endpoint. Metrics are derived from the train
// response and stored in state by the page after each training run.
// getModelMetrics always returns null (no persistent metrics endpoint exists).

export const getModelMetrics = async (): Promise<BackendModelMetrics | null> => {
  return null;
};

// ─── Normalize raw predict → frontend RiskResult shape ───────────────────────

export function normalizeRiskLevel(
  raw: string,
): "Low" | "Medium" | "High" | "Critical" {
  const s = raw.toLowerCase();
  if (s.includes("critical"))          return "Critical";
  if (s.includes("high"))              return "High";
  if (s.includes("medium") || s.includes("med")) return "Medium";
  return "Low";
}

export function buildMetricsFromTrainResponse(
  res: TrainResponse,
): BackendModelMetrics {
  // FastAPI now returns train_metrics and test_metrics as separate objects,
  // each containing: accuracy, precision, recall, f1_score, auc_roc, log_loss
  // Map them directly to BackendSplitMetrics — no approximation needed.

  const n  = res.samples_trained ?? 0;
  const nt = res.samples_tested  ?? 0;

function toSplitMetrics(
  m: TrainSplitMetrics | undefined,
  sampleCount: number,
): BackendSplitMetrics {

  if (!m) {
    return {
      logloss: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1_score: 0,
      auc: 0,
      n: 0,
    };
  }

  return {
    logloss: m.log_loss,
    accuracy: m.accuracy,
    precision: m.precision,
    recall: m.recall,
    f1_score: m.f1_score,
    auc: m.auc_roc,
    n: sampleCount,
  };
}

  console.log("RAW RESPONSE", res);
  console.log("RAW TRAIN", res.train_metrics);
  console.log("RAW TEST", res.test_metrics);
  console.log("FULL RES", res);
  console.log("RAW train_metrics", res.train_metrics);
  console.log("RAW test_metrics", res.test_metrics);
  console.log("RAW cv_results", res.cv_results);

  const trainM = toSplitMetrics(res.train_metrics, n);
  const testM  = toSplitMetrics(res.test_metrics,  nt);

  // Map TimeSeriesSplit CV fold metrics from the backend shape
  // into the BackendFoldResult[] shape the RiskPredictionPanel expects.
  const cvFolds: BackendFoldResult[] = (res.cv_results?.fold_metrics ?? []).map((f) => ({
    fold: f.fold,
    metrics:{
        logloss: f.log_loss,
        accuracy: f.accuracy,
        precision: f.precision,
        recall: f.recall,
        f1_score: f.f1_score,
        auc: f.auc_roc,
        n: 0,
    },
  }));

  // CV mean across folds — use avg_* fields from the backend when available
  const cv = res.cv_results;
  const cvMeanMetrics: BackendSplitMetrics = cvFolds.length > 0 ? {
    logloss: cv?.avg_log_loss ?? testM.logloss,
    accuracy: cv?.avg_accuracy ?? testM.accuracy,
    precision: cv?.avg_precision ?? testM.precision,
    recall: cv?.avg_recall ?? testM.recall,
    f1_score: cv?.avg_f1_score ?? testM.f1_score,
    auc: cv?.avg_auc_roc ?? testM.auc,
    n: cvFolds.length,
  } : testM;

  // Summary values for the top-level metrics strip (accuracy + AUC from test split)
  const acc = testM.accuracy;
  const auc = testM.auc;

  return {
    trainMetrics:  trainM,
    valMetrics:    { logloss: 0, accuracy:0, precision:0, recall:0, f1_score:0, auc: 0, n: 0 },
    testMetrics:   testM,
    learningCurve: [],
    cvFolds,
    cvMean:        cvMeanMetrics,
    cvStd: {
        logloss: cv?.std_log_loss ?? 0,
        accuracy: cv?.std_accuracy ?? 0,
        precision: cv?.std_precision ?? 0,
        recall: cv?.std_recall ?? 0,
        f1_score: cv?.std_f1_score ?? 0,
        auc: cv?.std_auc_roc ?? 0,
        n: cvFolds.length,
    },
    bestRound:     res.best_round ?? 0,
    totalRounds:   0,
    splitSizes:    { train: n, val: 0, test: nt },
    isOverfit:     trainM.accuracy - testM.accuracy > 0.1,
    trainValGap:   trainM.logloss - testM.logloss,
    trainedAt:     new Date().toISOString(),
    accuracy:      acc,
    roc_auc:       auc,
    samples_trained: n,
    samples_tested:  nt,
    data_source:   res.data_source,
  };
}
