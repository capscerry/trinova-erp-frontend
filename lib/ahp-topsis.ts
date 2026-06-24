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

  // Step 1: raw matrix
  const raw: number[][] = alternatives.map((alt) =>
    criteria.map((c) => alt.values[c.id] ?? 0)
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
        else if (c.id === "claim_rate")                  reasons.push("Claim Rate Terendah");
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
