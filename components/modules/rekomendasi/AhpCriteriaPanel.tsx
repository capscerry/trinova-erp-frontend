"use client";

import { useState } from "react";
import { Info, RefreshCw, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Tooltip } from "@/components/ui";
import {
  ahpWeightsFromMatrix,
  defaultPairwiseMatrix,
  SAATY_SCALE,
  type AhpResult,
  type Criterion,
} from "@/lib/ahp-topsis";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AhpCriteriaPanelProps {
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
  onRun: () => void;
  isLoading?: boolean;
}

// ─── Saaty fraction display ───────────────────────────────────────────────────

function formatSaaty(v: number): string {
  if (v >= 1) return String(Math.round(v));
  // reciprocal — find denominator
  const denom = Math.round(1 / v);
  return `1/${denom}`;
}

// ─── CR badge ────────────────────────────────────────────────────────────────

function CrBadge({ cr, isConsistent }: { cr: number; isConsistent: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border",
        isConsistent
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-red-50 border-red-200 text-red-600"
      )}
    >
      {isConsistent ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
      CR = {(cr * 100).toFixed(1)}%
      {isConsistent ? " ✓ Konsisten" : " ✗ Tidak Konsisten"}
    </span>
  );
}

// ─── Weight bar row ───────────────────────────────────────────────────────────

function WeightRow({ label, weight, benefit }: { label: string; weight: number; benefit: boolean }) {
  const pct = Math.round(weight * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-semibold text-slate-700 w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            benefit ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-rose-400 to-rose-600"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-bold tabular-nums text-navy-900 w-10 text-right shrink-0">{pct}%</span>
      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0", benefit ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-600")}>
        {benefit ? "↑ B" : "↓ C"}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AhpCriteriaPanel({
  criteria,
  onChange,
  onRun,
  isLoading = false,
}: AhpCriteriaPanelProps) {
  const n = criteria.length;

  // Pairwise matrix state: n×n, upper-triangle only (lower is auto-reciprocal)
  const [matrix, setMatrix] = useState<number[][]>(() => defaultPairwiseMatrix(n));
  const [ahpResult, setAhpResult] = useState<AhpResult | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(true);
  const [resultOpen, setResultOpen] = useState(true);

  // Recompute if criteria length changes
  const safeMatrix =
    matrix.length === n && matrix[0]?.length === n
      ? matrix
      : defaultPairwiseMatrix(n);

  function setCell(i: number, j: number, raw: string) {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) return;
    const next = safeMatrix.map((row) => [...row]);
    next[i][j] = parsed;
    next[j][i] = 1 / parsed;
    setMatrix(next);
  }

  function handleCompute() {
    const result = ahpWeightsFromMatrix(safeMatrix);
    setAhpResult(result);
    // Update criteria weights
    onChange(
      criteria.map((c, i) => ({ ...c, weight: result.weights[i] }))
    );
  }

  function handleEqualize() {
    const eq = defaultPairwiseMatrix(n);
    setMatrix(eq);
    const result = ahpWeightsFromMatrix(eq);
    setAhpResult(result);
    onChange(criteria.map((c, i) => ({ ...c, weight: result.weights[i] })));
  }

  const canRun = ahpResult?.isConsistent === true && !isLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Panel header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-900 to-navy-600 flex items-center justify-center">
            <span className="text-gold-400 text-[10px] font-extrabold">AHP</span>
          </div>
          <div>
            <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">
              Pembobotan Kriteria (AHP)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bandingkan kepentingan antar kriteria secara berpasangan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            title="Petunjuk AHP"
          >
            <Info size={13} />
          </button>
          <Button variant="secondary" size="sm" onClick={handleEqualize}>
            <RefreshCw size={11} /> Samakan
          </Button>
        </div>
      </div>

      {/* ── Info banner ────────────────────────────────────────────────────── */}
      {showInfo && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-700 leading-relaxed space-y-1">
          <p>
            <strong>Skala Saaty:</strong> 1 = sama penting &nbsp;|&nbsp; 3 = sedikit lebih penting &nbsp;|&nbsp;
            5 = lebih penting &nbsp;|&nbsp; 7 = sangat penting &nbsp;|&nbsp; 9 = mutlak lebih penting.
            Nilai pecahan (1/3, 1/5, …) berarti kebalikannya.
          </p>
          <p>
            <strong>Consistency Ratio (CR)</strong> harus &lt; 10% agar pembobotan dianggap konsisten.
            Klik <em>Hitung Bobot AHP</em> untuk melihat hasilnya.
          </p>
          <p>
            <strong>Tipe Kriteria:</strong> <span className="text-green-700 font-semibold">↑ Benefit</span> = nilai lebih besar lebih baik (contoh: On-Time Rate). &nbsp;
            <span className="text-rose-600 font-semibold">↓ Cost</span> = nilai lebih kecil lebih baik (contoh: Harga, Lead Time).
          </p>
        </div>
      )}

      {/* ── Pairwise matrix ─────────────────────────────────────────────────── */}
      <button
        className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setMatrixOpen((v) => !v)}
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Matriks Perbandingan Berpasangan
        </span>
        {matrixOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {matrixOpen && (
        <div className="overflow-x-auto px-5 py-4">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr>
                {/* top-left empty corner */}
                <th className="w-32 pb-2" />
                {criteria.map((c) => (
                  <th key={c.id} className="pb-2 px-1 text-center font-bold text-slate-500 min-w-[80px]">
                    <span className="block truncate max-w-[76px]">{c.label}</span>
                    <span className={cn("text-[9px] font-bold", c.benefit ? "text-green-500" : "text-rose-400")}>
                      {c.benefit ? "↑ Benefit" : "↓ Cost"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {criteria.map((rowC, i) => (
                <tr key={rowC.id} className="hover:bg-slate-50/50">
                  {/* Row label */}
                  <td className="pr-3 py-2 font-semibold text-slate-700 text-[12px] truncate max-w-[120px]">
                    {rowC.label}
                  </td>

                  {criteria.map((colC, j) => {
                    if (i === j) {
                      // Diagonal = 1, not editable
                      return (
                        <td key={colC.id} className="px-1 py-2 text-center">
                          <span className="inline-block w-16 text-center text-slate-300 font-bold bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                            1
                          </span>
                        </td>
                      );
                    }

                    if (j < i) {
                      // Lower triangle: show reciprocal (read-only, derived)
                      const reciprocal = safeMatrix[i][j]; // already stored as 1/upper
                      return (
                        <td key={colC.id} className="px-1 py-2 text-center">
                          <span className="inline-block w-16 text-center text-slate-400 bg-slate-50/80 rounded-lg px-2 py-1.5 border border-slate-100 font-mono">
                            {formatSaaty(reciprocal)}
                          </span>
                        </td>
                      );
                    }

                    // Upper triangle: editable select
                    const val = safeMatrix[i][j];
                    return (
                      <td key={colC.id} className="px-1 py-2 text-center">
                        <select
                          value={val}
                          onChange={(e) => setCell(i, j, e.target.value)}
                          className="w-16 text-center text-[11px] font-semibold text-navy-900 bg-white border border-slate-200 rounded-lg px-1 py-1.5 outline-none focus:border-gold-500 transition-colors cursor-pointer"
                        >
                          {SAATY_SCALE.map((s) => (
                            <option key={s.label} value={s.value}>
                              {formatSaaty(s.value)}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Compute button */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Isi sel <span className="font-semibold text-navy-900">baris ÷ kolom</span> — berapa kali baris lebih penting dari kolom?
            </p>
            <Button variant="secondary" size="sm" onClick={handleCompute}>
              Hitung Bobot AHP →
            </Button>
          </div>
        </div>
      )}

      {/* ── AHP Result ─────────────────────────────────────────────────────── */}
      {ahpResult && (
        <>
          <button
            className="w-full flex items-center justify-between px-5 py-3 border-t border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
            onClick={() => setResultOpen((v) => !v)}
          >
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Hasil Pembobotan AHP
            </span>
            <div className="flex items-center gap-2">
              <CrBadge cr={ahpResult.cr} isConsistent={ahpResult.isConsistent} />
              {resultOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          </button>

          {resultOpen && (
            <div className="px-5 py-4 space-y-3">
              {/* CR / λmax info */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "λmax", value: ahpResult.lambdaMax.toFixed(4), sub: "Eigenvalue Utama" },
                  { label: "CI",   value: ahpResult.ci.toFixed(4),         sub: "Consistency Index" },
                  { label: "CR",   value: `${(ahpResult.cr * 100).toFixed(2)}%`, sub: "Consistency Ratio" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif mb-1">{stat.label}</p>
                    <p className={cn(
                      "text-lg font-bold font-serif leading-none",
                      stat.label === "CR"
                        ? ahpResult.isConsistent ? "text-green-600" : "text-red-500"
                        : "text-navy-900"
                    )}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {!ahpResult.isConsistent && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-red-700">
                    CR ≥ 10% — penilaian tidak konsisten. Tinjau kembali matriks perbandingan dan kurangi inkonsistensi
                    sebelum melanjutkan analisis.
                  </p>
                </div>
              )}

              {/* Weight bars */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bobot Normalised</p>
                {criteria.map((c, i) => (
                  <WeightRow
                    key={c.id}
                    label={c.label}
                    weight={ahpResult.weights[i]}
                    benefit={c.benefit}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Footer / Run button ─────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">
          {ahpResult
            ? ahpResult.isConsistent
              ? "Bobot siap digunakan. Klik Jalankan Analisis untuk lanjut ke TOPSIS."
              : "Perbaiki matriks agar CR < 10% sebelum menjalankan analisis."
            : "Klik Hitung Bobot AHP terlebih dahulu untuk mendapatkan bobot kriteria."}
        </p>
        <Button variant="primary" size="md" onClick={onRun} disabled={!canRun}>
          {isLoading ? (
            <><RefreshCw size={13} className="animate-spin" /> Menghitung…</>
          ) : (
            "Jalankan Analisis →"
          )}
        </Button>
      </div>
    </div>
  );
}
