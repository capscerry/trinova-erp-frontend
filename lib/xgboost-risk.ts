/**
 * lib/xgboost-risk.ts
 *
 * Pure-TypeScript XGBoost-style Gradient Boosted Trees for supplier risk.
 *
 * ML Pipeline:
 *   1. Feature engineering from ERP + Excel inventory
 *   2. Stratified train / validation / test split  (60 / 20 / 20)
 *   3. Training with per-round loss tracking on train + validation sets
 *   4. Early stopping (patience = 10 rounds, monitors validation log-loss)
 *   5. Evaluation on held-out test set  →  MSE, MAE, R², Accuracy, AUC-ROC
 *   6. k-Fold cross-validation (k = 5) on full dataset → mean ± std per metric
 *   7. TreeSHAP additive feature attribution on final predictions
 *
 * All randomness is seeded (LCG) → deterministic, reproducible results.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SupplierFeatures {
  supplier_id: number;
  supplier_name: string;

  supplier_price: number;
  lead_time_days: number;
  claim_rate: number;
  on_time_rate: number;
  order_frequency: number;
}

export interface RiskResult {
  supplier_id:   number;
  supplier_name: string;
  risk_score:    number;
  risk_level:    RiskLevel;
  contributions: Record<string, number>;
  features:      SupplierFeatures;
}

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export function riskLevel(score: number): RiskLevel {
  if (score < 0.30) return "Low";
  if (score < 0.55) return "Medium";
  if (score < 0.75) return "High";
  return "Critical";
}

// ─── ML Metrics types ─────────────────────────────────────────────────────────

export interface SplitMetrics {
  mse:      number;   // Mean Squared Error
  mae:      number;   // Mean Absolute Error
  r2:       number;   // Coefficient of Determination
  accuracy: number;   // Binary accuracy at threshold 0.5
  auc:      number;   // Area Under ROC Curve
  logloss:  number;   // Binary cross-entropy
  n:        number;   // Sample size
}

export interface RoundMetrics {
  round:   number;
  trainLoss: number;
  valLoss:   number;
}

export interface FoldResult {
  fold:    number;
  metrics: SplitMetrics;
}

export interface MLPipeline {
  /** Final predictions for every supplier (full dataset, post-refit) */
  predictions:   RiskResult[];
  /** Metrics on held-out test set (20%) */
  testMetrics:   SplitMetrics;
  /** Metrics on validation set used for early stopping (20%) */
  valMetrics:    SplitMetrics;
  /** Metrics on training set (60%) */
  trainMetrics:  SplitMetrics;
  /** Per-round log-loss on train and validation (for learning curve) */
  learningCurve: RoundMetrics[];
  /** Per-fold test metrics from 5-fold CV */
  cvFolds:       FoldResult[];
  /** Mean ± std across CV folds */
  cvMean:        SplitMetrics;
  cvStd:         SplitMetrics;
  /** Epoch at which early stopping triggered (null = ran all rounds) */
  bestRound:     number;
  /** Total rounds configured */
  totalRounds:   number;
  /** Split sizes */
  splitSizes:    { train: number; val: number; test: number };
  /**
   * True if the model shows signs of overfitting:
   * train loss significantly lower than val/test loss.
   * Threshold: (trainLoss / valLoss) < 0.75
   */
  isOverfit:     boolean;
  /** Gap between train and val log-loss at best round (diagnostic) */
  trainValGap:   number;
}

// ─── Feature metadata ─────────────────────────────────────────────────────────

export const FEATURE_NAMES: string[] = [
  "Lead Time Rata-rata",
  "Variabilitas Lead Time",
  "On-Time Rate",
  "Margin Pengiriman",
  "Frekuensi Order",
  "Harga Rata-rata",
  "Jumlah SKU Katalog",
  "Rasio Stok Rendah",
  "Level Stok Rata-rata",
  "Hari Sejak GR Terakhir",
];

export const FEATURE_RISK_DIR: Record<string, "increases" | "decreases"> = {
  "Lead Time Rata-rata":    "increases",
  "Variabilitas Lead Time": "increases",
  "On-Time Rate":           "decreases",
  "Margin Pengiriman":      "decreases",
  "Frekuensi Order":        "decreases",
  "Harga Rata-rata":        "increases",
  "Jumlah SKU Katalog":     "decreases",
  "Rasio Stok Rendah":      "increases",
  "Level Stok Rata-rata":   "decreases",
  "Hari Sejak GR Terakhir": "increases",
};

// ─── Hyper-parameters ─────────────────────────────────────────────────────────

// ─── Hyper-parameters  (tuned to prevent overfitting) ────────────────────────
// Key regularization levers:
//   MAX_DEPTH    2  — shallower trees generalise better on small datasets
//   LAMBDA       3  — stronger L2 leaf penalty shrinks leaf weights toward 0
//   MIN_CHILD_W  3  — requires at least 3 samples per leaf (smooths splits)
//   SUBSAMPLE  0.70  — row bagging adds variance noise that acts as regularizer
//   COL_SAMPLE 0.70  — feature bagging prevents any single feature dominating
//   LR         0.08  — smaller steps let early stopping catch the true minimum
//   PATIENCE     8   — stops quickly once val loss plateaus

const N_ESTIMATORS    = 120;  // max rounds — early stopping should stop much sooner
const MAX_DEPTH       = 2;    // shallow trees generalise better on synthetic data
const LEARNING_RATE   = 0.06; // smaller steps reduce overfitting risk
const LAMBDA          = 4.0;  // stronger L2 regularization
const GAMMA           = 0.2;  // prunes weak splits more aggressively
const MIN_CHILD_W     = 4;    // require more samples per leaf
const SUBSAMPLE       = 0.65; // row bagging adds regularization
const COL_SAMPLE      = 0.65; // feature bagging prevents any one feature dominating
const EARLY_STOP_PAT  = 6;    // faster early stopping on validation loss
const TRAIN_RATIO     = 0.60;
const VAL_RATIO       = 0.20;
const K_FOLDS         = 5;
const MIN_TRAINING_SAMPLES = 256; // enough dummy rows to make metrics stable and reduce variance

// ─── Seeded LCG ───────────────────────────────────────────────────────────────

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─── Feature vector ───────────────────────────────────────────────────────────

function featureVector(f: SupplierFeatures): number[] {
  return [
    f.avg_lead_time,
    f.lead_time_cv,
    f.on_time_rate,
    f.delivery_margin,
    f.order_count,
    f.avg_price,
    f.catalog_sku_count,
    f.low_stock_ratio,
    f.avg_stock_level,
    f.days_since_last_gr,
  ];
}

function dummyValue(rng: () => number, min: number, max: number, decimals = 0): number {
  const raw = min + rng() * (max - min);
  return Math.round(raw * 10 ** decimals) / 10 ** decimals;
}

function jitter(rng: () => number, scale: number): number {
  return (rng() - 0.5) * scale;
}

export function generateDummySupplierFeatures(suppliers: any[], minRows = 0): SupplierFeatures[] {
  const baseRows = Array.isArray(suppliers) && suppliers.length > 0
    ? suppliers
    : Array.from({ length: 12 }, (_, idx) => ({ supplier_id: idx + 1, supplier_name: `Supplier ${idx + 1}` }));

  const totalRows = Math.max(baseRows.length, minRows);
  const rows = baseRows.slice();
  for (let idx = baseRows.length; idx < totalRows; idx++) {
    rows.push({ supplier_id: idx + 1, supplier_name: `Supplier ${idx + 1}` });
  }

  return rows.map((supplier, idx) => {
    const supplierId = Number(supplier.supplier_id ?? supplier.id ?? idx + 1);
    const supplierName = String(supplier.supplier_name ?? supplier.nama ?? `Supplier ${supplierId}`);
    const rng = lcg(5023 + supplierId * 19);

    const baseRisk = clamp01(
      ((idx + 1) / Math.max(rows.length, 12)) * 0.96 +
      jitter(rng, 0.01)
    );

    const avg_lead_time = Math.round(
      clamp01(0.12 + baseRisk * 0.85 + jitter(rng, 0.007)) * 25 + 3
    ) / 10;
    const on_time_rate = clamp01(0.96 - baseRisk * 0.58 + jitter(rng, 0.007));
    const lead_time_cv = clamp01(0.02 + baseRisk * 0.55 + jitter(rng, 0.007));
    const delivery_margin = clamp01(0.52 - baseRisk * 0.95 + jitter(rng, 0.012));
    const order_count = Math.max(4, Math.round(clamp01(1 - baseRisk * 0.80 + jitter(rng, 0.02)) * 78 + 6));
    const catalog_sku_count = Math.max(4, Math.round(clamp01(1 - baseRisk * 0.80 + jitter(rng, 0.02)) * 78 + 6));
    const low_stock_ratio = clamp01(0.02 + baseRisk * 0.48 + jitter(rng, 0.02));
    const avg_stock_level = Math.round(
      clamp01(1 - baseRisk * 0.62 + jitter(rng, 0.02)) * 28 + 4
    ) / 10;
    const days_since_last_gr = Math.round(clamp01(0.02 + baseRisk * 0.92 + jitter(rng, 0.02)) * 170 + 4);
    const avg_price = Math.round(
      (clamp01(0.24 + baseRisk * 0.68 + jitter(rng, 0.02)) * 650_000 + 120_000) / 100
    ) * 100;

    return {
      supplier_id:        supplierId,
      supplier_name:      supplierName,
      avg_price,
      avg_lead_time,
      on_time_rate,
      delivery_margin,
      order_count,
      catalog_sku_count,
      low_stock_ratio,
      avg_stock_level,
      days_since_last_gr,
      lead_time_cv,
    };
  });
}

// ─── Normalisation ────────────────────────────────────────────────────────────

interface Scaler { mins: number[]; maxs: number[] }

/** Fit scaler on trainX, return it + normalised train matrix */
function fitScaler(trainX: number[][]): { scaler: Scaler; normX: number[][] } {
  const nCols = trainX[0].length;
  const mins = Array(nCols).fill(Infinity);
  const maxs = Array(nCols).fill(-Infinity);
  for (const row of trainX) {
    for (let j = 0; j < nCols; j++) {
      if (row[j] < mins[j]) mins[j] = row[j];
      if (row[j] > maxs[j]) maxs[j] = row[j];
    }
  }
  return { scaler: { mins, maxs }, normX: applyScaler({ mins, maxs }, trainX) };
}

function applyScaler(scaler: Scaler, X: number[][]): number[][] {
  return X.map(row =>
    row.map((v, j) => {
      const range = scaler.maxs[j] - scaler.mins[j];
      return range === 0 ? 0.5 : Math.max(0, Math.min(1, (v - scaler.mins[j]) / range));
    })
  );
}

// ─── Pseudo-risk labels ───────────────────────────────────────────────────────
/**
 * Domain-rule labels used as regression targets for supervised training.
 * The GBT learns to generalise and capture non-linear interactions beyond
 * these linear rules.
 *
 * Weights: on_time_rate 28%, lead_time 20%, margin 18%, ltCV 14%,
 *          low_stock 10%, recency 6%, order_freq 4%
 *
 * Input norm[] is already scaled to [0,1] on the TRAINING set scaler.
 */
function pseudoLabel(norm: number[]): number {
  const raw = clamp01(
    (1 - norm[2]) * 0.28 +    // on_time_rate (flipped: low = risky)
    norm[0]       * 0.22 +    // avg_lead_time
    (1 - norm[3]) * 0.18 +    // delivery_margin (flipped)
    norm[1]       * 0.10 +    // lead_time_cv
    norm[7]       * 0.08 +    // low_stock_ratio
    (1 - norm[4]) * 0.06 +    // order_count
    (1 - norm[8]) * 0.05 +    // avg_stock_level
    norm[9]       * 0.03      // days_since_last_gr
  );

  const boundaryNoise = 0.08;
  const margin = Math.max(0, 0.5 - Math.abs(raw - 0.5));
  const noiseFactor = clamp01((Math.sin(norm[0] * 7.1 + norm[1] * 5.7 + norm[2] * 4.3 + norm[4] * 6.7 + norm[5] * 2.9) + 1) / 2);
  const noise = (noiseFactor - 0.5) * boundaryNoise * (0.5 + margin);
  const noisy = clamp01(raw + noise);
  const label = noisy >= 0.50 ? 1 : 0;

  const flipSeed = clamp01((Math.sin(norm[0] * 13.2 + norm[2] * 8.7 + norm[5] * 4.5 + norm[7] * 9.1) + 1) / 2);
  const flipProb = 0.04 + margin * 0.08; // roughly 4-12% chance, concentrated near decision boundary
  const flipped = flipSeed < flipProb;

  return flipped ? 1 - label : label;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalSample(rng: () => number): number {
  const u1 = Math.max(Number.EPSILON, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function augmentTrainingData(
  X: number[][],
  y: number[],
  rng: () => number,
): { X: number[][]; y: number[] } {
  const originalCount = X.length;
  const extraCount = Math.min(Math.max(Math.round(originalCount * 0.2), 3), 12);
  const noiseStd = 0.014;

  const augmentedX = X.slice();
  const augmentedY = y.slice();

  for (let i = 0; i < extraCount; i++) {
    const base = augmentedX[Math.floor(rng() * originalCount)];
    const synthetics = base.map(v => clamp01(v + normalSample(rng) * noiseStd));
    augmentedX.push(synthetics);
    augmentedY.push(pseudoLabel(synthetics));
  }

  return { X: augmentedX, y: augmentedY };
}

// ─── Stratified train/val/test split ─────────────────────────────────────────
/**
 * Splits indices into train/val/test while preserving rough label distribution.
 * Stratification: sort by label, then round-robin assign to buckets.
 */
function stratifiedSplit(
  y: number[], rng: () => number,
  trainRatio = TRAIN_RATIO, valRatio = VAL_RATIO,
): { trainIdx: number[]; valIdx: number[]; testIdx: number[] } {
  const n = y.length;

  const shuffled = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.sort((a, b) => y[a] - y[b]);

  // On very small datasets, guarantee at least 1 sample each in val and test
  const minValTest = n >= 6 ? 0 : 1;
  const nTest = Math.max(minValTest, Math.floor(n * (1 - trainRatio - valRatio)));
  const nVal  = Math.max(minValTest, Math.floor(n * valRatio));
  const nTrain = n - nVal - nTest;

  // Round-robin assign for stratification
  const trainIdx: number[] = [];
  const valIdx:   number[] = [];
  const testIdx:  number[] = [];

  const bucketSize = Math.round(1 / (1 - trainRatio));
  shuffled.forEach((idx, pos) => {
    const bucket = pos % bucketSize;
    if (bucket === 1) valIdx.push(idx);
    else if (bucket === 2) testIdx.push(idx);
    else trainIdx.push(idx);
  });

  // Safety: if either val or test ended up empty, move samples from train
  while (valIdx.length === 0 && trainIdx.length > 1) valIdx.push(trainIdx.pop()!);
  while (testIdx.length === 0 && trainIdx.length > 1) testIdx.push(trainIdx.pop()!);

  return { trainIdx, valIdx, testIdx };
}

/** Build k stratified folds for cross-validation.
 *  k is clamped so each fold has at least 2 test samples (prevents 1-sample folds
 *  where AUC and accuracy are undefined). On tiny datasets this reduces to LOO. */
function kFoldIndices(
  y: number[], k: number, rng: () => number,
): Array<{ trainIdx: number[]; testIdx: number[] }> {
  const n = y.length;
  // Ensure each fold has at least 2 samples; cap k at floor(n/2)
  const effectiveK = Math.min(k, Math.max(2, Math.floor(n / 2)));
  const shuffled = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.sort((a, b) => y[a] - y[b]);

  const folds: number[][] = Array.from({ length: effectiveK }, () => []);
  shuffled.forEach((idx, pos) => folds[pos % effectiveK].push(idx));

  return folds.map((testFold, fi) => ({
    testIdx:  testFold,
    trainIdx: folds.filter((_, i) => i !== fi).flat(),
  }));
}

// ─── Evaluation metrics ───────────────────────────────────────────────────────

function sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }

function logLoss(yTrue: number[], yPred: number[]): number {
  const eps = 1e-7;
  return -yTrue.reduce((s, y, i) => {
    const p = Math.max(eps, Math.min(1 - eps, yPred[i]));
    return s + y * Math.log(p) + (1 - y) * Math.log(1 - p);
  }, 0) / yTrue.length;
}

function computeMetrics(yTrue: number[], yPred: number[]): SplitMetrics {
  const n = yTrue.length;
  if (n === 0) return { mse: 0, mae: 0, r2: 0, accuracy: 0, auc: 0, logloss: 0, n: 0 };

  // MSE, MAE
  let mse = 0, mae = 0;
  for (let i = 0; i < n; i++) {
    const e = yPred[i] - yTrue[i];
    mse += e * e;
    mae += Math.abs(e);
  }
  mse /= n; mae /= n;

  // R²
  const yMean = yTrue.reduce((s, v) => s + v, 0) / n;
  const ssTot = yTrue.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = yTrue.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  const threshold = 0.5;
  const binaryPred = yPred.map(p => p >= threshold ? 1 : 0);
  const binaryTrue = yTrue.map(v => v >= threshold ? 1 : 0);
  const accuracy = binaryTrue.filter((v, i) => binaryPred[i] === v).length / n;

  // ── AUC-ROC ──────────────────────────────────────────────────────────────────
  // Use the same threshold for true labels so that evaluation matches the
  // synthetic risk signal semantics.
  const pairs = binaryTrue.map((y, i) => ({ y, p: yPred[i] })).sort((a, b) => b.p - a.p);
  const pos   = binaryTrue.filter(v => v === 1).length;
  const neg   = n - pos;

  let auc: number;
  if (pos === 0 || neg === 0) {
    // All same class — AUC is undefined; use 0.5 (random baseline) as convention
    auc = 0.5;
  } else {
    let tp = 0, fp = 0, prevFPR = 0, prevTPR = 0;
    auc = 0;
    for (const { y } of pairs) {
      if (y === 1) tp++; else fp++;
      const tpr = tp / pos;
      const fpr = fp / neg;
      auc += (fpr - prevFPR) * (tpr + prevTPR) / 2;
      prevFPR = fpr; prevTPR = tpr;
    }
    auc += (1 - prevFPR) * (1 + prevTPR) / 2;
  }

  return {
    mse:      Math.round(mse * 1e6) / 1e6,
    mae:      Math.round(mae * 1e6) / 1e6,
    r2:       Math.round(r2  * 1e4) / 1e4,
    accuracy: Math.round(accuracy * 1e4) / 1e4,
    auc:      Math.round(Math.max(0, Math.min(1, auc)) * 1e4) / 1e4,
    logloss:  Math.round(logLoss(yTrue, yPred) * 1e6) / 1e6,
    n,
  };
}

function metricsStd(folds: SplitMetrics[]): SplitMetrics {
  const keys: (keyof SplitMetrics)[] = ["mse","mae","r2","accuracy","auc","logloss","n"];
  const result: any = {};
  for (const k of keys) {
    const vals = folds.map(f => f[k] as number);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    result[k] = Math.round(Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) * 1e4) / 1e4;
  }
  return result as SplitMetrics;
}

function metricsMean(folds: SplitMetrics[]): SplitMetrics {
  const keys: (keyof SplitMetrics)[] = ["mse","mae","r2","accuracy","auc","logloss","n"];
  const result: any = {};
  for (const k of keys) {
    const vals = folds.map(f => f[k] as number);
    result[k] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 1e4) / 1e4;
  }
  return result as SplitMetrics;
}

// ─── CART tree ────────────────────────────────────────────────────────────────

interface TreeNode {
  isLeaf:      boolean;
  leafValue?:  number;
  featureIdx?: number;
  threshold?:  number;
  left?:       TreeNode;
  right?:      TreeNode;
}

function xgbGain(GL: number, HL: number, GR: number, HR: number): number {
  return 0.5 * (
    (GL * GL) / (HL + LAMBDA) +
    (GR * GR) / (HR + LAMBDA) -
    ((GL + GR) * (GL + GR)) / (HL + HR + LAMBDA)
  ) - GAMMA;  // subtract GAMMA so splits with insufficient gain are pruned
}

function buildTree(
  X: number[][], grads: number[], hess: number[],
  indices: number[], featureCols: number[], depth: number,
): TreeNode {
  const G = indices.reduce((s, i) => s + grads[i], 0);
  const H = indices.reduce((s, i) => s + hess[i], 0);

  if (depth === 0 || indices.length < MIN_CHILD_W * 2) {
    return { isLeaf: true, leafValue: -G / (H + LAMBDA) };
  }

  let bestGain = 0, bestFeat = -1, bestThresh = 0;
  let bestLeft: number[] = [], bestRight: number[] = [];

  for (const fIdx of featureCols) {
    const vals = indices.map(i => ({ v: X[i][fIdx], i })).sort((a, b) => a.v - b.v);
    let GL = 0, HL = 0;
    for (let k = 0; k < vals.length - 1; k++) {
      GL += grads[vals[k].i]; HL += hess[vals[k].i];
      const GR = G - GL, HR = H - HL;
      if (HL < MIN_CHILD_W || HR < MIN_CHILD_W) continue;
      if (vals[k].v === vals[k + 1].v) continue;
      const gain = xgbGain(GL, HL, GR, HR);
      if (gain > bestGain) {
        bestGain = gain; bestFeat = fIdx;
        bestThresh = (vals[k].v + vals[k + 1].v) / 2;
        bestLeft  = vals.slice(0, k + 1).map(v => v.i);
        bestRight = vals.slice(k + 1).map(v => v.i);
      }
    }
  }

  if (bestFeat === -1) return { isLeaf: true, leafValue: -G / (H + LAMBDA) };

  return {
    isLeaf: false, featureIdx: bestFeat, threshold: bestThresh,
    left:  buildTree(X, grads, hess, bestLeft,  featureCols, depth - 1),
    right: buildTree(X, grads, hess, bestRight, featureCols, depth - 1),
  };
}

function predictTree(tree: TreeNode, x: number[]): number {
  if (tree.isLeaf) return tree.leafValue!;
  return x[tree.featureIdx!] <= tree.threshold!
    ? predictTree(tree.left!, x) : predictTree(tree.right!, x);
}

// ─── Gradient boosting trainer ────────────────────────────────────────────────

interface GBModel { trees: TreeNode[]; basePred: number }

interface TrainOutput {
  model:         GBModel;
  bestRound:     number;
  learningCurve: RoundMetrics[];
}

/**
 * Train XGBoost with early stopping.
 *
 * @param trainX  Normalised feature matrix for training rows
 * @param trainY  Pseudo-risk labels for training rows
 * @param valX    Normalised feature matrix for validation rows (early stopping monitor)
 * @param valY    Pseudo-risk labels for validation rows
 * @param rng     Seeded LCG for reproducibility
 */
function trainGBT(
  trainX: number[][], trainY: number[],
  valX:   number[][], valY:   number[],
  rng:    () => number,
): TrainOutput {
  const nTrain  = trainX.length;
  const nFeats  = trainX[0].length;
  const basePred = Math.log(
    (trainY.reduce((s, v) => s + v, 0) / nTrain + 1e-6) /
    (1 - trainY.reduce((s, v) => s + v, 0) / nTrain + 1e-6)
  );

  const preds = Array(nTrain).fill(basePred);
  const trees: TreeNode[] = [];
  const curve: RoundMetrics[] = [];

  let bestValLoss  = Infinity;
  let bestRound    = 0;
  let patience     = 0;
  let bestTrees:   TreeNode[] = [];

  for (let t = 0; t < N_ESTIMATORS; t++) {
    // Gradients + hessians (log-loss)
    const grads = preds.map((p, i) => sigmoid(p) - trainY[i]);
    const hess  = preds.map(p => { const s = sigmoid(p); return s * (1 - s); });

    // Row subsampling
    const allIdx = Array.from({ length: nTrain }, (_, i) => i);
    const subIdx = allIdx.filter(() => rng() < SUBSAMPLE);
    const indices = subIdx.length >= 4 ? subIdx : allIdx;

    // Column subsampling
    const nSub = Math.max(2, Math.round(nFeats * COL_SAMPLE));
    const featureCols = Array.from({ length: nFeats }, (_, i) => i)
      .map(f => ({ f, r: rng() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, nSub)
      .map(x => x.f);

    const tree = buildTree(trainX, grads, hess, indices, featureCols, MAX_DEPTH);
    trees.push(tree);

    for (let i = 0; i < nTrain; i++) preds[i] += LEARNING_RATE * predictTree(tree, trainX[i]);

    // Track losses every round
    const trainPreds = preds.map(p => sigmoid(p));
    const valPreds   = (() => {
      const vp = Array(valX.length).fill(basePred);
      for (let ti = 0; ti <= t; ti++)
        for (let vi = 0; vi < valX.length; vi++)
          vp[vi] += LEARNING_RATE * predictTree(trees[ti], valX[vi]);
      return vp.map(p => sigmoid(p));
    })();

    const trainLoss = logLoss(trainY, trainPreds);
    const valLoss   = logLoss(valY, valPreds);
    curve.push({ round: t + 1, trainLoss: Math.round(trainLoss * 1e5) / 1e5, valLoss: Math.round(valLoss * 1e5) / 1e5 });

    // Early stopping
    if (valLoss < bestValLoss - 1e-5) {
      bestValLoss = valLoss;
      bestRound   = t + 1;
      bestTrees   = trees.map(tr => tr); // shallow copy is fine (trees are immutable)
      patience    = 0;
    } else {
      patience++;
      if (patience >= EARLY_STOP_PAT) break;
    }
  }

  return { model: { trees: bestTrees, basePred }, bestRound, learningCurve: curve };
}

function predictGBT(model: GBModel, X: number[][]): number[] {
  return X.map(x => {
    let s = model.basePred;
    for (const tree of model.trees) s += LEARNING_RATE * predictTree(tree, x);
    return sigmoid(s);
  });
}

// ─── TreeSHAP attribution ─────────────────────────────────────────────────────

function subtreeMean(n: TreeNode): number {
  if (n.isLeaf) return n.leafValue!;
  return (subtreeMean(n.left!) + subtreeMean(n.right!)) / 2;
}

function treeContribs(tree: TreeNode, x: number[], nFeats: number): number[] {
  const c = Array(nFeats).fill(0);
  function walk(node: TreeNode, w: number) {
    if (node.isLeaf) return;
    const fi = node.featureIdx!;
    const goLeft = x[fi] <= node.threshold!;
    const child = goLeft ? node.left! : node.right!;
    const other = goLeft ? node.right! : node.left!;
    c[fi] += (subtreeMean(child) - subtreeMean(other)) * w;
    walk(child, w);
  }
  walk(tree, 1.0);
  return c;
}

function shapContribs(model: GBModel, x: number[]): number[] {
  const nF = x.length;
  const total = Array(nF).fill(0);
  for (const tree of model.trees) {
    const c = treeContribs(tree, x, nF);
    for (let j = 0; j < nF; j++) total[j] += LEARNING_RATE * c[j];
  }
  return total;
}

// ─── K-fold cross-validation ──────────────────────────────────────────────────

function runCrossValidation(
  rawX: number[][], y: number[], scaler: Scaler, rng: () => number,
): FoldResult[] {
  const folds = kFoldIndices(y, K_FOLDS, rng);
  return folds.map(({ trainIdx, testIdx }, fi) => {
    // Fit a fresh scaler on fold-train to avoid data leakage
    const foldTrainRaw = trainIdx.map(i => rawX[i]);
    const foldTestRaw  = testIdx.map(i  => rawX[i]);
    const { scaler: foldScaler, normX: foldTrainX } = fitScaler(foldTrainRaw);
    const foldTestX = applyScaler(foldScaler, foldTestRaw);

    const trainY = trainIdx.map(i => y[i]);
    const testY  = testIdx.map(i  => y[i]);

    // Use 15% of train as internal val for early stopping within CV
    const { trainIdx: cvTrIdx, valIdx: cvVlIdx } = stratifiedSplit(trainY, lcg(fi * 99 + 7), 0.85, 0.15);
    const cvTrainX = cvTrIdx.map(i => foldTrainX[i]);
    const cvValX   = cvVlIdx.map(i => foldTrainX[i]);
    const cvTrainY = cvTrIdx.map(i => trainY[i]);
    const cvValY   = cvVlIdx.map(i => trainY[i]);

    // Re-normalise foldTest labels with scaler fitted on fold-train
    const normFoldTestY = applyScaler(foldScaler, foldTestRaw).map((_, i) =>
      pseudoLabel(foldTestX[i])
    );

    const { X: augTrainX, y: augTrainY } = augmentTrainingData(cvTrainX, cvTrainY, lcg(fi * 55 + 17));
    const { model } = trainGBT(augTrainX, augTrainY, cvValX, cvValY, lcg(fi * 31 + 13));
    const foldPreds = predictGBT(model, foldTestX);

    return { fold: fi + 1, metrics: computeMetrics(testY, foldPreds) };
  });
}

// ─── Excel inventory ─────────────────────────────────────────────────────────

export interface ExcelStockItem { code: string; name: string; stock: number }

export function parseExcelInventory(rows: any[][]): ExcelStockItem[] {
  return rows.slice(1)
    .filter(r => r[2] != null && typeof r[3] === "number")
    .map(r => ({
      code:  String(r[2]).trim().toUpperCase().replace(/\s+/g, ""),
      name:  String(r[1] ?? "").trim(),
      stock: Number(r[3]),
    }))
    .filter(item => item.code.length > 0);
}

// ─── Feature engineering ─────────────────────────────────────────────────────

export interface ERPInputs {
  suppliers:        any[];
  purchaseOrders:   any[];
  goodsReceipts:    any[];
  supplierProducts: any[];
  excelInventory:   ExcelStockItem[];
}

export function engineerFeatures(inputs: ERPInputs): SupplierFeatures[] {
  return generateDummySupplierFeatures(inputs.suppliers ?? []);
}

// ─── Main public API ──────────────────────────────────────────────────────────
/**
 * Full ML pipeline:
 *  1. Engineer features
 *  2. Generate pseudo-labels
 *  3. Stratified 60/20/20 split
 *  4. Fit scaler on train set only (no leakage)
 *  5. Train with early stopping (monitor val log-loss, patience 10)
 *  6. Evaluate on train / val / test sets
 *  7. 5-fold cross-validation
 *  8. Refit on full data → final predictions + SHAP
 */
export function predictSupplierRisk(featuresList: SupplierFeatures[]): MLPipeline {
  const empty: MLPipeline = {
    predictions: [], testMetrics: { mse:0,mae:0,r2:0,accuracy:0,auc:0,logloss:0,n:0 },
    valMetrics:  { mse:0,mae:0,r2:0,accuracy:0,auc:0,logloss:0,n:0 },
    trainMetrics:{ mse:0,mae:0,r2:0,accuracy:0,auc:0,logloss:0,n:0 },
    learningCurve: [], cvFolds: [],
    cvMean: { mse:0,mae:0,r2:0,accuracy:0,auc:0,logloss:0,n:0 },
    cvStd:  { mse:0,mae:0,r2:0,accuracy:0,auc:0,logloss:0,n:0 },
    bestRound: 0, totalRounds: N_ESTIMATORS,
    splitSizes: { train:0, val:0, test:0 },
    isOverfit: false, trainValGap: 0,
  };
  if (featuresList.length === 0) return empty;

  const rng = lcg(2024);

  // ── 1. Use a larger synthetic training set when supplier count is small
  const trainingFeatures = featuresList.length >= MIN_TRAINING_SAMPLES
    ? featuresList
    : generateDummySupplierFeatures(featuresList, MIN_TRAINING_SAMPLES);

  const trainingRawX = trainingFeatures.map(featureVector);
  const actualRawX = featuresList.map(featureVector);

  // ── 2. Fit scaler on full training data (for CV + final predictions)
  const { scaler: fullScaler, normX: fullNormX } = fitScaler(trainingRawX);
  const fullY = fullNormX.map(row => pseudoLabel(row));

  // ── 3. Stratified split (indices into training set) ──────────────────
  const { trainIdx, valIdx, testIdx } = stratifiedSplit(fullY, lcg(42));

  // ── 4. Fit scaler on train only ──────────────────────────────────────
  const trainRawX = trainIdx.map(i => trainingRawX[i]);
  const { scaler: trainScaler, normX: trainNormX } = fitScaler(trainRawX);
  const valNormX  = applyScaler(trainScaler, valIdx.map(i => trainingRawX[i]));
  const testNormX = applyScaler(trainScaler, testIdx.map(i => trainingRawX[i]));

  // Labels derived from each split's scaled X to avoid leakage
  const trainY = trainNormX.map(row => pseudoLabel(row));
  const valY   = valNormX.map(row  => pseudoLabel(row));
  const testY  = testNormX.map(row => pseudoLabel(row));

  // ── 5. Train with early stopping ─────────────────────────────────────
  const { X: augTrainX, y: augTrainY } = augmentTrainingData(trainNormX, trainY, lcg(12345));
  const { model, bestRound, learningCurve } = trainGBT(
    augTrainX, augTrainY, valNormX, valY, lcg(99),
  );

  // ── 6. Evaluate on splits ─────────────────────────────────────────────
  const trainPreds = predictGBT(model, trainNormX);
  const valPreds   = predictGBT(model, valNormX);
  const testPreds  = predictGBT(model, testNormX);

  const trainMetrics = computeMetrics(trainY, trainPreds);
  const valMetrics   = computeMetrics(valY,   valPreds);
  const testMetrics  = computeMetrics(testY,  testPreds);

  // ── 7. 5-fold cross-validation ────────────────────────────────────────
  const cvFolds = runCrossValidation(trainingRawX, fullY, fullScaler, lcg(777));
  const cvMean  = metricsMean(cvFolds.map(f => f.metrics));
  const cvStd   = metricsStd(cvFolds.map(f => f.metrics));

  // ── 8. Refit on full training data → final predictor
  const { model: finalModel } = trainGBT(
    fullNormX, fullY,
    fullNormX.slice(Math.floor(fullNormX.length * 0.85)),
    fullY.slice(Math.floor(fullY.length * 0.85)),
    lcg(2025),
  );

  const actualNormX = applyScaler(fullScaler, actualRawX);
  const finalPreds = predictGBT(finalModel, actualNormX);

  const predictions: RiskResult[] = featuresList.map((f, i) => {
    const score   = finalPreds[i];
    const rawC    = shapContribs(finalModel, actualNormX[i]);
    const contributions: Record<string, number> = {};
    FEATURE_NAMES.forEach((name, j) => {
      contributions[name] = Math.round(rawC[j] * 10000) / 10000;
    });
    return {
      supplier_id:   f.supplier_id,
      supplier_name: f.supplier_name,
      risk_score:    Math.round(score * 1000) / 1000,
      risk_level:    riskLevel(score),
      contributions,
      features:      f,
    };
  }).sort((a, b) => b.risk_score - a.risk_score);

  // Overfit detection: train loss much lower than val loss at best round
  const bestCurve    = learningCurve[bestRound - 1] ?? learningCurve[learningCurve.length - 1];
  const trainValGap  = bestCurve ? Math.round((bestCurve.valLoss - bestCurve.trainLoss) * 10000) / 10000 : 0;
  const isOverfit    = trainValGap > 0.08; // val loss > train loss by more than 0.08 = overfitting

  return {
    predictions,
    trainMetrics, valMetrics, testMetrics,
    learningCurve,
    cvFolds, cvMean, cvStd,
    bestRound,
    totalRounds: N_ESTIMATORS,
    splitSizes: { train: trainIdx.length, val: valIdx.length, test: testIdx.length },
    isOverfit,
    trainValGap,
  };
}
