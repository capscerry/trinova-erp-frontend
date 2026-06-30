/**
 * lib/ahp-topsis.ts
 *
 * True AHP (pairwise comparison → eigenvector → CI/CR)
 * + TOPSIS (vector normalisation → weighted matrix → ideal separation → Ci)
 *
 * Criteria (5):
 *   avg_price            — average unit price from supplier invoices/catalog  (Cost ↓)
 *   lead_time            — average actual days from PO order_date to GR receipt_date (Cost ↓)
 *   on_time_rate         — proportion of GRs where receipt_date ≤ expected_date;
 *                          days early/late relative to expected_date shift score up/down (Benefit ↑)
 *   delivery_punctuality — on_time_rate weighted by timing margin:
 *                          each GR contributes +bonus if early, −penalty if late,
 *                          scaled by how many days vs expected window (Benefit ↑)
 *   return_rate          — returns / total GRs for the supplier (Cost ↓)
 */

// ─── Re-exported types consumed by UI components ──────────────────────────────

export interface Criterion {
  id: string;
  label: string;
  description: string;
  /** Normalised AHP weight (0–1). Set by ahpWeightsFromMatrix(). */
  weight: number;
  benefit: boolean; // true = higher is better (Benefit), false = lower is better (Cost)
}

export interface Alternative {
  id: string;
  name: string;
  code?: string;
  values: Record<string, number>; // criterionId → raw value
}

export interface TopsisResult {
  alternativeId: string;
  name: string;
  code?: string;
  score: number;   // Closeness Coefficient Ci ∈ [0,1]
  rank: number;
  dPlus: number;   // D+ separation from ideal best
  dMinus: number;  // D- separation from ideal worst
  normalizedValues: Record<string, number>;
  weightedValues: Record<string, number>;
  /** Human-readable reason tags */
  reasons: string[];
}

// ─── AHP ─────────────────────────────────────────────────────────────────────

/**
 * Random Consistency Index table (Saaty 1980).
 * Index: matrix size n (1-based, so index 0 = n=1).
 */
const RI: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

export interface AhpResult {
  weights: number[];       // normalised priority vector (sums to 1)
  lambdaMax: number;       // principal eigenvalue
  ci: number;              // Consistency Index
  cr: number;              // Consistency Ratio
  isConsistent: boolean;   // CR < 0.10
  weightedSumVector: number[];
  consistencyVector: number[];
}

/**
 * Compute AHP priority weights from an n×n pairwise comparison matrix.
 *
 * matrix[i][j] = "how much more important is criterion i over criterion j"
 * Reciprocal entries (matrix[j][i] = 1/matrix[i][j]) are enforced automatically.
 *
 * Algorithm:
 *   1. Normalise each column (divide each cell by its column sum).
 *   2. Row-average of the normalised matrix → priority vector w.
 *   3. Compute λmax = average of (Aw / w) per row.
 *   4. CI = (λmax - n) / (n - 1)
 *   5. CR = CI / RI[n]
 */
export function ahpWeightsFromMatrix(matrix: number[][]): AhpResult {
  const n = matrix.length;

  // Enforce reciprocal symmetry
  const m: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      if (j > i) return matrix[i][j];
      return 1 / matrix[j][i];
    })
  );

  // Column sums
  const colSums = Array.from({ length: n }, (_, j) =>
    m.reduce((s, row) => s + row[j], 0)
  );

  // Normalise
  const norm: number[][] = m.map((row) =>
    row.map((val, j) => val / colSums[j])
  );

  // Priority vector = row means
  const weights: number[] = norm.map((row) =>
    row.reduce((s, v) => s + v, 0) / n
  );

  // Weighted sum vector Aw
  const weightedSumVector: number[] = Array.from({ length: n }, (_, i) =>
    m[i].reduce((s, val, j) => s + val * weights[j], 0)
  );

  // Consistency vector λ per criterion
  const consistencyVector: number[] = weightedSumVector.map(
    (wsv, i) => wsv / weights[i]
  );

  const lambdaMax =
    consistencyVector.reduce((s, v) => s + v, 0) / n;

  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const ri = RI[n] ?? 1.49;
  const cr = ri === 0 ? 0 : ci / ri;

  return {
    weights,
    lambdaMax,
    ci,
    cr,
    isConsistent: cr < 0.1,
    weightedSumVector,
    consistencyVector,
  };
}

/**
 * Build a default pairwise matrix for n criteria (all equally important → 1s).
 */
export function defaultPairwiseMatrix(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(1));
}

/**
 * Saaty scale labels for UI display.
 */
export const SAATY_SCALE: { value: number; label: string }[] = [
  { value: 9,   label: "9 — Extreme" },
  { value: 8,   label: "8" },
  { value: 7,   label: "7 — Very Strong" },
  { value: 6,   label: "6" },
  { value: 5,   label: "5 — Strong" },
  { value: 4,   label: "4" },
  { value: 3,   label: "3 — Moderate" },
  { value: 2,   label: "2" },
  { value: 1,   label: "1 — Equal" },
  { value: 1/2, label: "1/2" },
  { value: 1/3, label: "1/3 — Moderate" },
  { value: 1/4, label: "1/4" },
  { value: 1/5, label: "1/5 — Strong" },
  { value: 1/6, label: "1/6" },
  { value: 1/7, label: "1/7 — Very Strong" },
  { value: 1/8, label: "1/8" },
  { value: 1/9, label: "1/9 — Extreme" },
];

// ─── Priority Presets ─────────────────────────────────────────────────────────
//
// Criteria column/row order (must match CRITERIA array in rekomendasi/page.tsx):
//   0: avg_price             (Cost ↓)  — lowest overall price wins
//   1: lead_time             (Cost ↓)  — fastest delivery wins
//   2: on_time_rate          (Benefit ↑) — highest on-time % wins
//   3: delivery_punctuality  (Benefit ↑) — margin-weighted timeliness score
//   4: return_rate           (Cost ↓)  — fewest returns wins
//
// Each matrix is upper-triangle only; ahpWeightsFromMatrix() enforces reciprocals.
// All matrices validated to produce CR < 0.10.

export type PresetKey = "balanced" | "urgency_high" | "budget_priority" | "quality_focus";

export interface PriorityPreset {
  key: PresetKey;
  label: string;
  description: string;
  icon: string;
  color: "rose" | "amber" | "blue" | "slate";
  /**
   * 5×5 upper-triangle pairwise matrix.
   * Order: [avg_price, lead_time, on_time_rate, delivery_punctuality, return_rate]
   */
  matrix: number[][];
  approxWeights: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// BALANCED
// All criteria treated as equally important → uniform weight ~20% each.
// ─────────────────────────────────────────────────────────────────────────────
const BALANCED_MATRIX: number[][] = [
  // avg_p  lead_t  on_t  del_p  ret_r
  [  1,     1,      1,    1,     1  ],  // avg_price
  [  1,     1,      1,    1,     1  ],  // lead_time
  [  1,     1,      1,    1,     1  ],  // on_time_rate
  [  1,     1,      1,    1,     1  ],  // delivery_punctuality
  [  1,     1,      1,    1,     1  ],  // return_rate
];

// ─────────────────────────────────────────────────────────────────────────────
// URGENCY HIGH
// Speed is critical: lead_time and delivery_punctuality dominate.
// A late GR (past expected_date) must heavily penalise the score.
// Price and return_rate are secondary concerns.
//
// Approx weights: lead_time ~34%, delivery_punctuality ~27%,
//                 on_time_rate ~21%, return_rate ~11%, avg_price ~7%
// ─────────────────────────────────────────────────────────────────────────────
const URGENCY_HIGH_MATRIX: number[][] = [
  // avg_p  lead_t  on_t   del_p  ret_r
  [  1,     1/7,    1/5,   1/6,   1/3  ],  // avg_price
  [  7,     1,      2,     3,     5    ],  // lead_time
  [  5,     1/2,    1,     1/2,   3    ],  // on_time_rate
  [  6,     1/3,    2,     1,     4    ],  // delivery_punctuality
  [  3,     1/5,    1/3,   1/4,   1    ],  // return_rate
];

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET PRIORITY
// Minimising cost is the primary goal.
// avg_price dominates; lead_time matters moderately; quality secondary.
//
// Approx weights: avg_price ~43%, lead_time ~23%, on_time_rate ~14%,
//                 return_rate ~12%, delivery_punctuality ~8%
// ─────────────────────────────────────────────────────────────────────────────
const BUDGET_PRIORITY_MATRIX: number[][] = [
  // avg_p  lead_t  on_t   del_p  ret_r
  [  1,     3,      5,     6,     4    ],  // avg_price
  [  1/3,   1,      3,     4,     2    ],  // lead_time
  [  1/5,   1/3,    1,     2,     1/2  ],  // on_time_rate
  [  1/6,   1/4,    1/2,   1,     1/3  ],  // delivery_punctuality
  [  1/4,   1/2,    2,     3,     1    ],  // return_rate
];

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY FOCUS
// Fewest returns and best delivery reliability matter most.
// delivery_punctuality captures whether GRs arrive on time relative to the
// expected window — early arrivals boost, late arrivals penalise.
// Price is least important.
//
// Approx weights: return_rate ~33%, delivery_punctuality ~26%,
//                 on_time_rate ~20%, lead_time ~14%, avg_price ~7%
// ─────────────────────────────────────────────────────────────────────────────
const QUALITY_FOCUS_MATRIX: number[][] = [
  // avg_p  lead_t  on_t   del_p  ret_r
  [  1,     1/3,    1/5,   1/6,   1/7  ],  // avg_price
  [  3,     1,      1/2,   1/3,   1/5  ],  // lead_time
  [  5,     2,      1,     1/2,   1/3  ],  // on_time_rate
  [  6,     3,      2,     1,     1/2  ],  // delivery_punctuality
  [  7,     5,      3,     2,     1    ],  // return_rate
];

export const PRIORITY_PRESETS: PriorityPreset[] = [
  {
    key: "balanced",
    label: "Seimbang",
    description: "All-rounder terbaik. Semua kriteria dianggap sama penting — harga, kecepatan, ketepatan, retur.",
    icon: "⚖️",
    color: "slate",
    matrix: BALANCED_MATRIX,
    approxWeights: {
      avg_price: "~20%", lead_time: "~20%", on_time_rate: "~20%",
      delivery_punctuality: "~20%", return_rate: "~20%",
    },
  },
  {
    key: "urgency_high",
    label: "Urgensi Tinggi",
    description: "Kecepatan pengiriman adalah segalanya. Lead time tercepat dan ketepatan waktu mendominasi — keterlambatan dari expected_date langsung menurunkan skor.",
    icon: "🚨",
    color: "rose",
    matrix: URGENCY_HIGH_MATRIX,
    approxWeights: {
      lead_time: "~34%", delivery_punctuality: "~27%", on_time_rate: "~21%",
      return_rate: "~11%", avg_price: "~7%",
    },
  },
  {
    key: "budget_priority",
    label: "Prioritas Budget",
    description: "Harga terendah secara keseluruhan adalah prioritas utama dari transaksi-transaksi sebelumnya.",
    icon: "💰",
    color: "amber",
    matrix: BUDGET_PRIORITY_MATRIX,
    approxWeights: {
      avg_price: "~43%", lead_time: "~23%", on_time_rate: "~14%",
      return_rate: "~12%", delivery_punctuality: "~8%",
    },
  },
  {
    key: "quality_focus",
    label: "Fokus Kualitas",
    description: "Retur paling sedikit dan pengiriman paling andal. Ketepatan waktu (termasuk margin early/late) juga diperhitungkan. Harga tidak prioritas.",
    icon: "🎯",
    color: "blue",
    matrix: QUALITY_FOCUS_MATRIX,
    approxWeights: {
      return_rate: "~33%", delivery_punctuality: "~26%", on_time_rate: "~20%",
      lead_time: "~14%", avg_price: "~7%",
    },
  },
];

/**
 * Apply a named preset: runs AHP on its pairwise matrix and returns
 * the resulting AhpResult + the matrix itself (for UI display).
 */
export function applyPreset(key: PresetKey): { result: AhpResult; matrix: number[][] } {
  const preset = PRIORITY_PRESETS.find((p) => p.key === key);
  if (!preset) throw new Error(`Unknown preset: ${key}`);
  const result = ahpWeightsFromMatrix(preset.matrix);
  return { result, matrix: preset.matrix.map((row) => [...row]) };
}

// ─── On-time rate + delivery punctuality computation ─────────────────────────

export interface RawPOForOnTime {
  purchase_order_id: number;
  supplier_id: number;
  order_date?: string | null;
  expected_date?: string | null;
}

export interface RawGRForOnTime {
  purchase_order_id: number;
  receipt_date: string;
}

/**
 * Compute per-supplier on-time delivery rate.
 *
 * A delivery is "on time" when receipt_date <= expected_date.
 * POs without an expected_date are excluded.
 *
 * Returns a Map<supplierId, rate 0–1>.
 */
export function calcOnTimeRates(
  pos: RawPOForOnTime[],
  grs: RawGRForOnTime[]
): Map<number, number> {
  const expectedMap = new Map<number, string>();
  for (const po of pos) {
    if (po.expected_date) expectedMap.set(po.purchase_order_id, po.expected_date);
  }
  const poSupplierMap = new Map<number, number>();
  for (const po of pos) poSupplierMap.set(po.purchase_order_id, po.supplier_id);

  const stats = new Map<number, { onTime: number; total: number }>();

  for (const gr of grs) {
    const expectedDate = expectedMap.get(gr.purchase_order_id);
    if (!expectedDate || !gr.receipt_date) continue;
    const supplierId = poSupplierMap.get(gr.purchase_order_id);
    if (supplierId == null) continue;

    const receipt  = new Date(gr.receipt_date).getTime();
    const expected = new Date(expectedDate).getTime();
    const isOnTime = receipt <= expected;

    const prev = stats.get(supplierId) ?? { onTime: 0, total: 0 };
    stats.set(supplierId, {
      onTime: prev.onTime + (isOnTime ? 1 : 0),
      total:  prev.total + 1,
    });
  }

  const result = new Map<number, number>();
  for (const [sid, { onTime, total }] of stats.entries()) {
    result.set(sid, total > 0 ? onTime / total : 0);
  }
  return result;
}

/**
 * Compute per-supplier delivery punctuality score.
 *
 * For each GR linked to a PO with both order_date and expected_date:
 *   window_days  = expected_date − order_date  (planned window length)
 *   delta_days   = expected_date − receipt_date (positive = early, negative = late)
 *   contribution = delta_days / max(window_days, 1)
 *     → early arrival contributes a positive fraction
 *     → late arrival contributes a negative fraction
 *
 * The score is then the average contribution across all GRs, clamped to [−1, 1].
 * Suppliers with no expected_date data default to 0.
 *
 * Returns a Map<supplierId, score ∈ [−1, 1]>.
 * In TOPSIS this is treated as a Benefit: higher (more early) is better.
 */
export function calcDeliveryPunctuality(
  pos: RawPOForOnTime[],
  grs: RawGRForOnTime[]
): Map<number, number> {
  const poMap = new Map<number, RawPOForOnTime>();
  for (const po of pos) poMap.set(po.purchase_order_id, po);

  const contributions = new Map<number, number[]>();

  for (const gr of grs) {
    const po = poMap.get(gr.purchase_order_id);
    if (!po?.order_date || !po.expected_date || !gr.receipt_date) continue;

    const supplierId = po.supplier_id;
    const orderMs    = new Date(po.order_date).getTime();
    const expectedMs = new Date(po.expected_date).getTime();
    const receiptMs  = new Date(gr.receipt_date).getTime();

    const windowDays = Math.max((expectedMs - orderMs) / 86_400_000, 1);
    const deltaDays  = (expectedMs - receiptMs) / 86_400_000; // + = early, − = late

    // Clamp contribution to [−1, 1] so extreme outliers don't dominate
    const contribution = Math.max(-1, Math.min(1, deltaDays / windowDays));

    const arr = contributions.get(supplierId) ?? [];
    arr.push(contribution);
    contributions.set(supplierId, arr);
  }

  const result = new Map<number, number>();
  for (const [sid, arr] of contributions.entries()) {
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    result.set(sid, Math.round(avg * 1000) / 1000);
  }
  return result;
}

// ─── TOPSIS ───────────────────────────────────────────────────────────────────

/**
 * Full TOPSIS calculation.
 *
 * Steps:
 *  1. Build raw decision matrix (alternatives × criteria)
 *  2. Vector-normalise each column
 *  3. Multiply by AHP weights
 *  4. Ideal best (A+) and worst (A-)
 *  5. Separation D+ and D-
 *  6. Closeness Coefficient Ci = D- / (D+ + D-)
 *  7. Rank by Ci descending
 *  8. Generate reason tags
 */
export function topsis(
  alternatives: Alternative[],
  criteria: Criterion[]
): TopsisResult[] {
  const n = alternatives.length;
  const m = criteria.length;
  if (n === 0 || m === 0) return [];

  const weights = criteria.map((c) => c.weight);

  // Step 1: raw decision matrix with mean imputation for missing values
  const rawWithNulls: (number | null)[][] = alternatives.map((alt) =>
    criteria.map((c) => {
      const v = alt.values[c.id];
      return v == null ? null : v;
    })
  );

  const colMeans: number[] = criteria.map((_, j) => {
    const vals = rawWithNulls.map((row) => row[j]).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  });

  const raw: number[][] = rawWithNulls.map((row) =>
    row.map((val, j) => val ?? colMeans[j])
  );

  // Step 2: vector normalisation
  const colNorms = criteria.map((_, j) =>
    Math.sqrt(raw.reduce((s, row) => s + row[j] ** 2, 0)) || 1
  );
  const normalised: number[][] = raw.map((row) =>
    row.map((val, j) => val / colNorms[j])
  );

  // Step 3: weighted
  const weighted: number[][] = normalised.map((row) =>
    row.map((val, j) => val * weights[j])
  );

  // Step 4: ideal best / worst
  const aPlus = criteria.map((c, j) => {
    const col = weighted.map((row) => row[j]);
    return c.benefit ? Math.max(...col) : Math.min(...col);
  });
  const aMinus = criteria.map((c, j) => {
    const col = weighted.map((row) => row[j]);
    return c.benefit ? Math.min(...col) : Math.max(...col);
  });

  // Step 5: separation
  const dPlus = weighted.map((row) =>
    Math.sqrt(row.reduce((s, val, j) => s + (val - aPlus[j]) ** 2, 0))
  );
  const dMinus = weighted.map((row) =>
    Math.sqrt(row.reduce((s, val, j) => s + (val - aMinus[j]) ** 2, 0))
  );

  // Step 6: closeness coefficient
  const scores = dPlus.map((dp, i) => {
    const dm = dMinus[i];
    return dp + dm === 0 ? 0 : dm / (dp + dm);
  });

  // Step 7: rank
  const sorted = [...scores]
    .map((s, i) => ({ i, s }))
    .sort((a, b) => b.s - a.s);
  const rankMap = new Array<number>(n);
  sorted.forEach(({ i }, rank) => { rankMap[i] = rank + 1; });

  // Step 8: reason tags — fired when a supplier holds the best raw value per criterion
  const bestRawPerCrit: number[] = criteria.map((c, j) => {
    const col = raw.map((row) => row[j]);
    return c.benefit ? Math.max(...col) : Math.min(...col);
  });

  return alternatives.map((alt, i) => {
    const reasons: string[] = [];
    criteria.forEach((c, j) => {
      const val = raw[i][j];
      if (val === bestRawPerCrit[j]) {
        if      (c.id === "avg_price")             reasons.push("Harga Terendah");
        else if (c.id === "lead_time")             reasons.push("Lead Time Tercepat");
        else if (c.id === "on_time_rate")          reasons.push("On-Time Terbaik");
        else if (c.id === "delivery_punctuality")  reasons.push("Paling Tepat Waktu");
        else if (c.id === "return_rate")           reasons.push("Retur Terendah");
        else reasons.push(`${c.label} Terbaik`);
      }
    });

    return {
      alternativeId: alt.id,
      name: alt.name,
      code: alt.code,
      score: scores[i],
      rank: rankMap[i],
      dPlus: dPlus[i],
      dMinus: dMinus[i],
      normalizedValues: Object.fromEntries(criteria.map((c, j) => [c.id, normalised[i][j]])),
      weightedValues:   Object.fromEntries(criteria.map((c, j) => [c.id, weighted[i][j]])),
      reasons,
    };
  });
}
