import type { Criterion } from "@/components/modules/rekomendasi/AhpCriteriaPanel";
import type {
  Alternative,
  TopsisResult,
} from "@/components/modules/rekomendasi/TopsisResultsPanel";

export function ahpWeights(criteria: Criterion[]): number[] {
  const total = criteria.reduce((s, c) => s + c.weight, 0);
  if (total === 0) return criteria.map(() => 0);
  return criteria.map((c) => c.weight / total);
}


export function topsis(
  alternatives: Alternative[],
  criteria: Criterion[]
): TopsisResult[] {
  const n = alternatives.length;
  const m = criteria.length;
  if (n === 0 || m === 0) return [];

  const weights = ahpWeights(criteria);

  // Step 1: build raw matrix [n × m]
  const raw: number[][] = alternatives.map((alt) =>
    criteria.map((c) => alt.values[c.id] ?? 0)
  );

  // Step 2: vector normalisation
  const colNorms = criteria.map((_, j) =>
    Math.sqrt(raw.reduce((s, row) => s + row[j] ** 2, 0))
  );

  const normalised: number[][] = raw.map((row) =>
    row.map((val, j) => (colNorms[j] === 0 ? 0 : val / colNorms[j]))
  );

  // Step 3: weighted normalised matrix
  const weighted: number[][] = normalised.map((row) =>
    row.map((val, j) => val * weights[j])
  );

  // Step 4: ideal best (A+) and worst (A-)
  const aPlus = criteria.map((c, j) => {
    const col = weighted.map((row) => row[j]);
    return c.benefit ? Math.max(...col) : Math.min(...col);
  });
  const aMinus = criteria.map((c, j) => {
    const col = weighted.map((row) => row[j]);
    return c.benefit ? Math.min(...col) : Math.max(...col);
  });

  // Step 5: separation measures
  const dPlus  = weighted.map((row) =>
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

  // Step 7: rank (highest score = rank 1)
  const sorted = [...scores]
    .map((s, i) => ({ i, s }))
    .sort((a, b) => b.s - a.s);

  const rankMap: number[] = new Array(n);
  sorted.forEach(({ i }, rank) => { rankMap[i] = rank + 1; });

  return alternatives.map((alt, i) => ({
    alternativeId: alt.id,
    name: alt.name,
    code: alt.code,
    score: scores[i],
    rank: rankMap[i],
    dPlus: dPlus[i],
    dMinus: dMinus[i],
    normalizedValues: Object.fromEntries(
      criteria.map((c, j) => [c.id, normalised[i][j]])
    ),
  }));
}