"use client";

import { useState } from "react";
import { Info, RefreshCw, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Tooltip } from "@/components/ui";
import {
  ahpWeightsFromMatrix,
  defaultPairwiseMatrix,
  applyPreset,
  PRIORITY_PRESETS,
  SAATY_SCALE,
  type AhpResult,
  type Criterion,
  type PresetKey,
} from "@/lib/ahp-topsis";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AhpCriteriaPanelProps {
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
  onRun: () => void;
  isLoading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSaaty(v: number): string {
  if (v >= 1) return String(Math.round(v));
  const denom = Math.round(1 / v);
  return `1/${denom}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CrBadge({ isConsistent }: { isConsistent: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border",
      isConsistent
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-red-50 border-red-200 text-red-600"
    )}>
      {isConsistent ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
      {isConsistent ? "Consistent" : "Needs Review"}
    </span>
  );
}

function WeightRow({ label, weight, benefit }: { label: string; weight: number; benefit: boolean }) {
  const pct = Math.round(weight * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-semibold text-slate-700 w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            benefit
              ? "bg-linear-to-r from-green-400 to-green-600"
              : "bg-linear-to-r from-rose-400 to-rose-600"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-bold tabular-nums text-navy-900 w-10 text-right shrink-0">
        {pct}%
      </span>
      <span className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0",
        benefit ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-600"
      )}>
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

  const [matrix, setMatrix] = useState<number[][]>(() => defaultPairwiseMatrix(n));
  const [ahpResult, setAhpResult] = useState<AhpResult | null>(null);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(true);
  const [resultOpen, setResultOpen] = useState(true);

  const safeMatrix =
    matrix.length === n && matrix[0]?.length === n
      ? matrix
      : defaultPairwiseMatrix(n);

  // ── Handlers ────────────────────────────────────────────────────────────

  function setCell(i: number, j: number, raw: string) {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) return;
    const next = safeMatrix.map((row) => [...row]);
    next[i][j] = parsed;
    next[j][i] = 1 / parsed;
    setMatrix(next);
    setActivePreset(null); // user customised — deselect preset
  }

  function runAhp(m: number[][]) {
    const result = ahpWeightsFromMatrix(m);
    setAhpResult(result);
    onChange(criteria.map((c, i) => ({ ...c, weight: result.weights[i] })));
    setResultOpen(true);
  }

  function handleCompute() {
    runAhp(safeMatrix);
  }

  function handleEqualize() {
    const eq = defaultPairwiseMatrix(n);
    setMatrix(eq);
    setActivePreset(null);
    runAhp(eq);
  }

  function handleSelectPreset(key: PresetKey) {
    if (activePreset === key) return; // already active
    const { result, matrix: presetMatrix } = applyPreset(key);
    setMatrix(presetMatrix);
    setAhpResult(result);
    setActivePreset(key);
    setResultOpen(true);
    onChange(criteria.map((c, i) => ({ ...c, weight: result.weights[i] })));
  }

  const canRun = ahpResult?.isConsistent === true && !isLoading;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Panel header ────────────────────────────────────────────────── */}
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
              Pilih preset prioritas atau atur matriks secara manual
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

      {/* ── Priority preset selector ─────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
          Preset Prioritas
        </p>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_PRESETS.map((preset) => {
            const isActive = activePreset === preset.key;
            const colors: Record<string, { inactive: string; active: string }> = {
              rose:  { inactive: "bg-white border-rose-200  text-rose-600  hover:bg-rose-50",  active: "bg-rose-600  text-white border-rose-600"  },
              amber: { inactive: "bg-white border-amber-300 text-amber-700 hover:bg-amber-50", active: "bg-amber-500 text-white border-amber-500" },
              blue:  { inactive: "bg-white border-blue-200  text-blue-600  hover:bg-blue-50",  active: "bg-blue-600  text-white border-blue-600"  },
              slate: { inactive: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50", active: "bg-slate-600 text-white border-slate-600" },
            };
            const c = colors[preset.color];
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleSelectPreset(preset.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  isActive ? c.active : c.inactive
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Description + top-weight hints for active preset */}
        {activePreset && (() => {
          const preset = PRIORITY_PRESETS.find((p) => p.key === activePreset)!;
          const topWeights = Object.entries(preset.approxWeights)
            .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
            .slice(0, 3);
          return (
            <div className="mt-2.5 flex items-start gap-2">
              <p className="text-[11px] text-slate-500 leading-snug flex-1">
                {preset.description}
              </p>
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                {topWeights.map(([cid, w]) => {
                  const crit = criteria.find((c) => c.id === cid);
                  return (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-900/10 text-navy-900 text-[10px] font-semibold border border-navy-900/10"
                    >
                      {crit?.label ?? cid} {w}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Info banner ─────────────────────────────────────────────────── */}
      {showInfo && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-700 leading-relaxed space-y-1">
          <p>
            <strong>Skala Saaty:</strong> 1 = sama penting &nbsp;|&nbsp;
            3 = sedikit lebih penting &nbsp;|&nbsp; 5 = lebih penting &nbsp;|&nbsp;
            7 = sangat penting &nbsp;|&nbsp; 9 = mutlak lebih penting.
            Nilai pecahan (1/3, 1/5, …) berarti kebalikannya.
          </p>
          <p>
            <strong>Tipe:</strong>{" "}
            <span className="text-green-700 font-semibold">↑ Benefit</span> = lebih besar lebih baik. &nbsp;
            <span className="text-rose-600 font-semibold">↓ Cost</span> = lebih kecil lebih baik.
          </p>
        </div>
      )}

      {/* ── Pairwise matrix ──────────────────────────────────────────────── */}
      <button
        className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setMatrixOpen((v) => !v)}
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Matriks Perbandingan Berpasangan
          {activePreset && (
            <span className="ml-2 font-normal text-slate-400 normal-case tracking-normal">
              (diisi dari preset — bisa diedit manual)
            </span>
          )}
        </span>
        {matrixOpen
          ? <ChevronUp size={14} className="text-slate-400" />
          : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {matrixOpen && (
        <div className="overflow-x-auto px-5 py-4">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr>
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
                  <td className="pr-3 py-2 font-semibold text-slate-700 text-[12px] truncate max-w-[120px]">
                    {rowC.label}
                  </td>
                  {criteria.map((colC, j) => {
                    if (i === j) {
                      return (
                        <td key={colC.id} className="px-1 py-2 text-center">
                          <span className="inline-block w-16 text-center text-slate-300 font-bold bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                            1
                          </span>
                        </td>
                      );
                    }
                    if (j < i) {
                      const reciprocal = safeMatrix[i][j];
                      return (
                        <td key={colC.id} className="px-1 py-2 text-center">
                          <span className="inline-block w-16 text-center text-slate-400 bg-slate-50/80 rounded-lg px-2 py-1.5 border border-slate-100 font-mono">
                            {formatSaaty(reciprocal)}
                          </span>
                        </td>
                      );
                    }
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

      {/* ── AHP Result ──────────────────────────────────────────────────── */}
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
              <CrBadge isConsistent={ahpResult.isConsistent} />
              {resultOpen
                ? <ChevronUp size={14} className="text-slate-400" />
                : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          </button>

          {resultOpen && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-center">
                <div className={cn(
                  "border rounded-xl p-4 text-center min-w-[160px]",
                  ahpResult.isConsistent
                    ? "bg-green-50 border-green-100"
                    : "bg-red-50 border-red-100"
                )}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif mb-2">
                    AHP Validation
                  </p>
                  <p className={cn(
                    "text-[15px] font-bold font-serif leading-none flex items-center justify-center gap-1.5",
                    ahpResult.isConsistent ? "text-green-600" : "text-red-500"
                  )}>
                    {ahpResult.isConsistent
                      ? <><CheckCircle size={15} /> Consistent</>
                      : <><AlertTriangle size={15} /> Needs Review</>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {ahpResult.isConsistent
                      ? "Pairwise comparison verified"
                      : "Adjust matrix or select a preset"}
                  </p>
                </div>
              </div>

              {!ahpResult.isConsistent && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-red-700">
                    Penilaian tidak konsisten. Tinjau kembali matriks atau pilih preset yang sudah tervalidasi.
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Bobot Normalised
                </p>
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

      {/* ── Footer / Run button ─────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">
          {ahpResult
            ? ahpResult.isConsistent
              ? "Bobot siap digunakan. Klik Jalankan Analisis untuk memulai pipeline 3 langkah."
              : "Perbaiki matriks atau pilih preset lain agar CR < 10%."
            : "Pilih preset di atas atau klik Hitung Bobot AHP untuk memulai."}
        </p>
        <Button variant="primary" size="md" onClick={onRun} disabled={!canRun}>
          {isLoading
            ? <><RefreshCw size={13} className="animate-spin" /> Menjalankan Pipeline…</>
            : <><Zap size={13} /> Jalankan Analisis →</>}
        </Button>
      </div>
    </div>
  );
}
