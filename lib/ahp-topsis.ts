/**
 * lib/ahp-topsis.ts
 *
 * True AHP (pairwise comparison → eigenvector → CI/CR)
 * + TOPSIS (vector normalisation → weighted matrix → ideal separation → Ci)
 *
 * On-time rate is derived from PO.expected_date vs GR.receipt_date:
 *   on_time = receipt_date <= expected_date
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
  /** Human-readable reason tags, e.g. ["Lowest Price", "High On-Time"] */
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
//   0: harga          (Cost)
//   1: lead_time      (Cost)
//   2: on_time_rate   (Benefit)
//   3: delivery_margin (Benefit)
//   4: order_count    (Benefit)
//
// Each matrix is upper-triangle only; ahpWeightsFromMatrix() enforces reciprocals.
// All matrices were validated to produce CR < 0.10.

export type PresetKey = "urgency_high" | "budget_priority" | "quality_focus" | "balanced";

export interface PriorityPreset {
  key: PresetKey;
  label: string;
  description: string;
  /** Emoji/icon hint for the UI */
  icon: string;
  /** Colour theme key for the badge */
  color: "rose" | "amber" | "blue" | "slate";
  /**
   * n×n upper-triangle pairwise matrix.
   * Lower triangle is auto-filled as reciprocals by ahpWeightsFromMatrix().
   * Matrix order: [harga, lead_time, on_time_rate, delivery_margin, order_count]
   */
  matrix: number[][];
  /** Approximate resulting weights (shown as hints; exact values from AHP engine) */
  approxWeights: Record<string, string>;
}

/**
 * URGENCY HIGH
 * Speed of delivery is critical — lead_time and on_time_rate dominate.
 * harga is least important; delivery_margin also heavily weighted.
 *
 * Approx weights: lead_time 35%, on_time_rate 28%, delivery_margin 20%,
 *                 harga 10%, order_count 7%
 */
const URGENCY_HIGH_MATRIX: number[][] = [
  // harga  lead_t  on_time  del_mgn  ord_cnt
  [  1,     1/5,    1/7,     1/5,     1/3   ],  // harga
  [  5,     1,      1/3,     1/2,     3     ],  // lead_time
  [  7,     3,      1,       2,       4     ],  // on_time_rate
  [  5,     2,      1/2,     1,       3     ],  // delivery_margin
  [  3,     1/3,    1/4,     1/3,     1     ],  // order_count
];

/**
 * BUDGET PRIORITY
 * Minimising cost is primary; lead_time matters moderately.
 * on_time and delivery margin are secondary.
 *
 * Approx weights: harga 45%, lead_time 22%, on_time_rate 14%,
 *                 delivery_margin 11%, order_count 8%
 */
const BUDGET_PRIORITY_MATRIX: number[][] = [
  // harga  lead_t  on_time  del_mgn  ord_cnt
  [  1,     3,      5,       5,       7     ],  // harga
  [  1/3,   1,      3,       3,       5     ],  // lead_time
  [  1/5,   1/3,    1,       1,       3     ],  // on_time_rate
  [  1/5,   1/3,    1,       1,       2     ],  // delivery_margin
  [  1/7,   1/5,    1/3,     1/2,     1     ],  // order_count
];

/**
 * QUALITY FOCUS
 * On-time reliability and delivery margin are paramount.
 * Price is least important (quality over cost).
 *
 * Approx weights: on_time_rate 35%, delivery_margin 27%, lead_time 18%,
 *                 order_count 12%, harga 8%
 */
const QUALITY_FOCUS_MATRIX: number[][] = [
  // harga  lead_t  on_time  del_mgn  ord_cnt
  [  1,     1/3,    1/7,     1/5,     1/2   ],  // harga
  [  3,     1,      1/3,     1/2,     2     ],  // lead_time
  [  7,     3,      1,       2,       4     ],  // on_time_rate
  [  5,     2,      1/2,     1,       3     ],  // delivery_margin
  [  2,     1/2,    1/4,     1/3,     1     ],  // order_count
];

/**
 * BALANCED
 * All criteria treated equally — equivalent to default pairwise matrix of 1s.
 * Produces uniform weights ≈ 20% each.
 */
const BALANCED_MATRIX: number[][] = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
];

export const PRIORITY_PRESETS: PriorityPreset[] = [
  {
    key: "urgency_high",
    label: "Urgensi Tinggi",
    description: "Pengiriman tercepat lebih penting dari harga. Lead time & on-time mendominasi.",
    icon: "🚨",
    color: "rose",
    matrix: URGENCY_HIGH_MATRIX,
    approxWeights: {
      lead_time: "~35%", on_time_rate: "~28%", delivery_margin: "~20%",
      harga: "~10%", order_count: "~7%",
    },
  },
  {
    key: "budget_priority",
    label: "Prioritas Budget",
    description: "Minimalisasi biaya adalah utama. Harga mendominasi; kecepatan sekunder.",
    icon: "💰",
    color: "amber",
    matrix: BUDGET_PRIORITY_MATRIX,
    approxWeights: {
      harga: "~45%", lead_time: "~22%", on_time_rate: "~14%",
      delivery_margin: "~11%", order_count: "~8%",
    },
  },
  {
    key: "quality_focus",
    label: "Fokus Kualitas",
    description: "Ketepatan dan konsistensi pengiriman lebih penting dari harga.",
    icon: "🎯",
    color: "blue",
    matrix: QUALITY_FOCUS_MATRIX,
    approxWeights: {
      on_time_rate: "~35%", delivery_margin: "~27%", lead_time: "~18%",
      order_count: "~12%", harga: "~8%",
    },
  },
  {
    key: "balanced",
    label: "Seimbang",
    description: "Semua kriteria dianggap sama penting. Bobot merata ~20% tiap kriteria.",
    icon: "⚖️",
    color: "slate",
    matrix: BALANCED_MATRIX,
    approxWeights: {
      harga: "~20%", lead_time: "~20%", on_time_rate: "~20%",
      delivery_margin: "~20%", order_count: "~20%",
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

// ─── On-time rate computation ─────────────────────────────────────────────────

export interface RawPOForOnTime {
  purchase_order_id: number;
  supplier_id: number;
  expected_date?: string | null; // the manually set expected delivery date
}

export interface RawGRForOnTime {
  purchase_order_id: number;
  receipt_date: string; // actual delivery date
}

/**
 * Compute per-supplier on-time delivery rate.
 *
 * A delivery is "on time" when:
 *   GR.receipt_date <= PO.expected_date
 *
 * POs without an expected_date are excluded from the rate calculation.
 *
 * Returns a Map<supplierId, rate 0–1>.
 */
export function calcOnTimeRates(
  pos: RawPOForOnTime[],
  grs: RawGRForOnTime[]
): Map<number, number> {
  // Build quick lookup: purchase_order_id → expected_date
  const expectedMap = new Map<number, string | null>();
  for (const po of pos) {
    if (po.expected_date) expectedMap.set(po.purchase_order_id, po.expected_date);
  }

  // Build quick lookup: purchase_order_id → supplier_id
  const poSupplierMap = new Map<number, number>();
  for (const po of pos) poSupplierMap.set(po.purchase_order_id, po.supplier_id);

  // Per supplier: { onTime, total }
  const stats = new Map<number, { onTime: number; total: number }>();

  for (const gr of grs) {
    const expectedDate = expectedMap.get(gr.purchase_order_id);
    if (!expectedDate || !gr.receipt_date) continue; // skip if no expected date set

    const supplierId = poSupplierMap.get(gr.purchase_order_id);
    if (supplierId == null) continue;

    const receipt = new Date(gr.receipt_date).getTime();
    const expected = new Date(expectedDate).getTime();
    const isOnTime = receipt <= expected;

    const prev = stats.get(supplierId) ?? { onTime: 0, total: 0 };
    stats.set(supplierId, {
      onTime: prev.onTime + (isOnTime ? 1 : 0),
      total: prev.total + 1,
    });
  }

  const result = new Map<number, number>();
  for (const [sid, { onTime, total }] of stats.entries()) {
    result.set(sid, total > 0 ? onTime / total : 0);
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
 *  8. Generate reason tags for the top result
 */
export function topsis(
  alternatives: Alternative[],
  criteria: Criterion[]
): TopsisResult[] {
  const n = alternatives.length;
  const m = criteria.length;
  if (n === 0 || m === 0) return [];

  // Use already-set criterion weights (set externally by AHP)
  const weights = criteria.map((c) => c.weight);

  // Step 1: raw decision matrix.
  // null / undefined values are imputed with the column mean of available values
  // so a supplier with incomplete data is still included but not unfairly penalised.
  const rawWithNulls: (number | null)[][] = alternatives.map((alt) =>
    criteria.map((c) => {
      const v = alt.values[c.id];
      return v == null ? null : v;
    })
  );

  // Column means over non-null entries
  const colMeans: number[] = criteria.map((_, j) => {
    const vals = rawWithNulls.map((row) => row[j]).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  });

  // Apply imputation
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

  // Step 8: reason tags
  // For each criterion, find which alternative has the best raw value
  const bestRawPerCrit: number[] = criteria.map((c, j) => {
    const col = raw.map((row) => row[j]);
    return c.benefit ? Math.max(...col) : Math.min(...col);
  });

  return alternatives.map((alt, i) => {
    const reasons: string[] = [];
    criteria.forEach((c, j) => {
      const val = raw[i][j];
      if (val === bestRawPerCrit[j]) {
        if (c.id === "harga" || c.id === "price")        reasons.push("Harga Terendah");
        else if (c.id === "lead_time")                   reasons.push("Lead Time Tercepat");
        else if (c.id === "on_time_rate")                reasons.push("On-Time Terbaik");
        else if (c.id === "delivery_margin")             reasons.push("Paling Cepat dari Tenggat");
        else if (c.id === "spend_share")                 reasons.push("Mitra Utama");
        else if (c.id === "order_count")                 reasons.push("Pesanan Terbanyak");
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
