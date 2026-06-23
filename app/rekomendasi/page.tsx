"use client";

import { useState, useCallback } from "react";
import {
  Brain,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
} from "lucide-react";

import { AppShell } from "@/components/layout";
import { Button, Card, PageHeader, Tooltip } from "@/components/ui";
import { AhpCriteriaPanel } from "@/components/modules/rekomendasi/AhpCriteriaPanel";
import { TopsisResultsPanel } from "@/components/modules/rekomendasi/TopsisResultsPanel";
import { topsis } from "@/lib/ahp-topsis";
import { cn } from "@/lib/utils";

import type { Criterion } from "@/components/modules/rekomendasi/AhpCriteriaPanel";
import type {
  Alternative,
  TopsisResult,
} from "@/components/modules/rekomendasi/TopsisResultsPanel";

const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: "harga",
    label: "Harga",
    description: "Harga penawaran per unit produk",
    weight: 30,
    benefit: false, // lower price = better
  },
  {
    id: "kualitas",
    label: "Kualitas Produk",
    description: "Skor kualitas berdasarkan inspeksi (0–100)",
    weight: 25,
    benefit: true,
  },
  {
    id: "waktu",
    label: "Waktu Pengiriman",
    description: "Estimasi hari pengiriman dari pemesanan",
    weight: 20,
    benefit: false, // shorter = better
  },
  {
    id: "reputasi",
    label: "Reputasi Supplier",
    description: "Skor reputasi & riwayat transaksi (0–100)",
    weight: 15,
    benefit: true,
  },
  {
    id: "layanan",
    label: "Layanan Purna Jual",
    description: "Kemampuan after-sales & garansi (0–100)",
    weight: 10,
    benefit: true,
  },
];

const DEFAULT_ALTERNATIVES: Alternative[] = [
  {
    id: "s1",
    name: "PT Maju Jaya Sentosa",
    code: "SUP-001",
    values: { harga: 45000, kualitas: 88, waktu: 7, reputasi: 82, layanan: 75 },
  },
  {
    id: "s2",
    name: "CV Berkah Abadi",
    code: "SUP-002",
    values: { harga: 42000, kualitas: 75, waktu: 10, reputasi: 70, layanan: 80 },
  },
  {
    id: "s3",
    name: "PT Global Sumber Daya",
    code: "SUP-003",
    values: { harga: 48000, kualitas: 92, waktu: 5, reputasi: 90, layanan: 88 },
  },
  {
    id: "s4",
    name: "UD Nusantara Mandiri",
    code: "SUP-004",
    values: { harga: 40000, kualitas: 70, waktu: 14, reputasi: 65, layanan: 60 },
  },
  {
    id: "s5",
    name: "PT Sinergi Prima",
    code: "SUP-005",
    values: { harga: 50000, kualitas: 95, waktu: 4, reputasi: 93, layanan: 92 },
  },
];

let _altCounter = 6;
function newAltId() {
  return `alt-${_altCounter++}`;
}

export default function RekomendasiPage() {
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [alternatives, setAlternatives] = useState<Alternative[]>(DEFAULT_ALTERNATIVES);
  const [results, setResults] = useState<TopsisResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [altPanelOpen, setAltPanelOpen] = useState(true);
  const [hasRun, setHasRun] = useState(false);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    await new Promise((r) => setTimeout(r, 600));
    const ranked = topsis(alternatives, criteria);
    ranked.sort((a, b) => a.rank - b.rank);
    setResults(ranked);
    setHasRun(true);
    setIsRunning(false);
  }, [alternatives, criteria]);

  function addAlternative() {
    const id = newAltId();
    setAlternatives((prev) => [
      ...prev,
      {
        id,
        name: `Alternatif Baru`,
        code: `SUP-00${prev.length + 1}`,
        values: Object.fromEntries(criteria.map((c) => [c.id, 0])),
      },
    ]);
  }

  function removeAlternative(id: string) {
    setAlternatives((prev) => prev.filter((a) => a.id !== id));
  }

  function updateAltField(
    altId: string,
    field: "name" | "code",
    value: string
  ) {
    setAlternatives((prev) =>
      prev.map((a) => (a.id === altId ? { ...a, [field]: value } : a))
    );
  }

  function updateAltValue(altId: string, critId: string, raw: string) {
    const val = parseFloat(raw) || 0;
    setAlternatives((prev) =>
      prev.map((a) =>
        a.id === altId ? { ...a, values: { ...a.values, [critId]: val } } : a
      )
    );
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function exportCsv() {
    if (results.length === 0) return;
    const header = ["Rank", "Kode", "Nama", "Nilai Kecocokan", "Jarak Terbaik", "Jarak Terburuk"].join(",");
    const rows = results.map((r) =>
      [r.rank, r.code ?? "", r.name, r.score.toFixed(6), r.dPlus.toFixed(6), r.dMinus.toFixed(6)].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekomendasi-topsis-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell
      title="Rekomendasi AI"
      subtitle="Bandingkan dan temukan pilihan terbaik berdasarkan kriteria bisnis Anda"
    >
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="Rekomendasi AI"
        subtitle="Setiap pilihan dinilai dan diranking berdasarkan kriteria yang Anda tentukan"
      >
        {hasRun && results.length > 0 && (
          <Button variant="secondary" size="md" onClick={exportCsv}>
            <Download size={14} />
            Export CSV
          </Button>
        )}
      </PageHeader>

      {/* ── Method info banner ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-6">
        <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="text-[12px] text-blue-700 leading-relaxed">
          <strong>Cara kerja:</strong> Setiap pilihan diberi nilai berdasarkan seberapa dekat
          ia dengan kondisi ideal terbaik dan terjauh dari kondisi terburuk, dengan mempertimbangkan
          bobot kepentingan tiap kriteria. Pilihan dengan <strong>nilai kecocokan tertinggi</strong> adalah rekomendasi utama.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        {/* ── Left column ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* AHP Criteria */}
          <AhpCriteriaPanel
            criteria={criteria}
            onChange={setCriteria}
            onRun={handleRun}
            isLoading={isRunning}
          />

          {/* Alternatives input table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100"
              onClick={() => setAltPanelOpen((v) => !v)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Brain size={13} className="text-slate-500" />
                </div>
                <div className="text-left">
                  <h2 className="font-serif font-bold text-navy-900 text-[15px] leading-none">
                    Data Pilihan
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {alternatives.length} pilihan terdaftar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    addAlternative();
                  }}
                >
                  <Plus size={11} />
                  Tambah
                </Button>
                {altPanelOpen ? (
                  <ChevronUp size={15} className="text-slate-400" />
                ) : (
                  <ChevronDown size={15} className="text-slate-400" />
                )}
              </div>
            </button>

            {altPanelOpen && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-widest text-slate-400 text-[10px] border-b border-slate-100 font-serif min-w-[160px]">
                        Nama
                      </th>
                      <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest text-slate-400 text-[10px] border-b border-slate-100 font-serif w-[90px]">
                        Kode
                      </th>
                      {criteria.map((c) => (
                        <th
                          key={c.id}
                          className="px-3 py-2.5 text-center font-bold uppercase tracking-widest text-slate-400 text-[10px] border-b border-slate-100 font-serif min-w-[90px]"
                        >
                          <Tooltip
                            term={c.label}
                            label={`${c.description} — ${c.benefit ? "Lebih tinggi lebih baik (Benefit)" : "Lebih rendah lebih baik (Cost)"}`}
                          />
                          <span className={cn("ml-1 text-[8px]", c.benefit ? "text-green-500" : "text-rose-400")}>
                            {c.benefit ? "↑" : "↓"}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 w-10 border-b border-slate-100" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {alternatives.map((alt) => (
                      <tr key={alt.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-2.5">
                          <input
                            value={alt.name}
                            onChange={(e) =>
                              updateAltField(alt.id, "name", e.target.value)
                            }
                            className="w-full bg-transparent text-[13px] font-semibold text-navy-900 font-serif outline-none border-b border-transparent focus:border-gold-500 transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={alt.code ?? ""}
                            onChange={(e) =>
                              updateAltField(alt.id, "code", e.target.value)
                            }
                            className="w-full bg-transparent text-[12px] font-mono text-slate-500 outline-none border-b border-transparent focus:border-gold-500 transition-colors"
                          />
                        </td>
                        {criteria.map((c) => (
                          <td key={c.id} className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              value={alt.values[c.id] ?? 0}
                              onChange={(e) =>
                                updateAltValue(alt.id, c.id, e.target.value)
                              }
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[12px] tabular-nums text-slate-700 outline-none focus:border-gold-500 transition-colors"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => removeAlternative(alt.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Run shortcut at bottom of alt panel */}
            {altPanelOpen && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRun}
                  disabled={
                    isRunning ||
                    criteria.reduce((s, c) => s + c.weight, 0) !== 100
                  }
                >
                  {isRunning ? (
                    <>
                      <RefreshCw size={11} className="animate-spin" />
                      Menghitung…
                    </>
                  ) : (
                    "Jalankan Analisis →"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* TOPSIS results */}
          <TopsisResultsPanel
            results={results}
            isLoading={isRunning}
          />

          {/* Summary card — only shown after at least one run */}
          {hasRun && results.length > 0 && !isRunning && (
            <Card title="Ringkasan Analisis">
              <div className="flex flex-col gap-3">
                {/* Top recommendation highlight */}
                <div className="bg-gradient-to-br from-navy-900 to-navy-700 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-navy-900 text-base font-extrabold">1</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-gold-400 font-bold mb-0.5">
                      Rekomendasi Terbaik
                    </p>
                    <p className="text-white font-bold font-serif text-[15px] leading-tight truncate">
                      {results[0].name}
                    </p>
                    <p className="text-slate-400 text-[11px] font-mono">
                      {results[0].code} &mdash;{" "}
                      <Tooltip
                        term="Kecocokan"
                        label="Nilai Kecocokan (Ci) — seberapa dekat pilihan ini ke kondisi ideal terbaik di semua kriteria. Mendekati 1 = terbaik."
                        className="text-slate-400"
                      />:{" "}
                      <strong className="text-gold-400">
                        {results[0].score.toFixed(4)}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Criteria weights summary */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-serif">
                    Bobot Kriteria Aktif
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {criteria.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1.5 text-[11px]"
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          c.benefit ? "bg-green-400" : "bg-rose-400"
                        )} />
                        <Tooltip
                          term={c.label}
                          label={
                            c.benefit
                              ? `Menguntungkan (Benefit) — nilai lebih tinggi lebih baik. Bobot: ${c.weight}%.`
                              : `Diminimalkan (Cost) — nilai lebih rendah lebih baik. Bobot: ${c.weight}%.`
                          }
                          className="font-semibold text-slate-600 font-serif"
                        />
                        <span className="text-slate-400">{c.weight}%</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Pilihan",
                      value: String(results.length),
                      sub: "dievaluasi",
                    },
                    {
                      label: "Kriteria",
                      value: String(criteria.length),
                      sub: "dibobot",
                    },
                    {
                      label: "Nilai Tertinggi",
                      value: results[0].score.toFixed(3),
                      sub: "nilai kecocokan (Ci)",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center"
                    >
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-serif mb-1">
                        {s.label}
                      </p>
                      <p className="text-xl font-bold text-navy-900 font-serif leading-none">
                        {s.value}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
