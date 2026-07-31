"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PURCHASE_PRINT_CSS } from "@/lib/print/purchasePrintStyles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DPData {
  purchase_down_payment_id?: number;
  dp_number: string;
  po_number: string;
  supplier_name?: string;
  supplier_id?: number;
  purchase_order_id?: number;
  payment_date: string;
  payment_type?: string;
  amount: number;
  po_total?: number;
  status?: string;
  notes?: string;
  created_at?: string;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (v?: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(d);
};

const fmtDP = (raw: string | number) => {
  const str = String(raw ?? "");
  const digits = str.replace(/^DP-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `DP-${digits.padStart(10, "0")}`;
};

function terbilang(n: number): string {
  const words = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  const convert = (num: number): string => {
    if (num < 12) return words[num];
    if (num < 20) return `${convert(num - 10)} belas`;
    if (num < 100) return `${convert(Math.floor(num / 10))} puluh${num % 10 ? ` ${convert(num % 10)}` : ""}`;
    if (num < 200) return `seratus${num % 100 ? ` ${convert(num % 100)}` : ""}`;
    if (num < 1000) return `${convert(Math.floor(num / 100))} ratus${num % 100 ? ` ${convert(num % 100)}` : ""}`;
    if (num < 2000) return `seribu${num % 1000 ? ` ${convert(num % 1000)}` : ""}`;
    if (num < 1000000) return `${convert(Math.floor(num / 1000))} ribu${num % 1000 ? ` ${convert(num % 1000)}` : ""}`;
    if (num < 1000000000) return `${convert(Math.floor(num / 1000000))} juta${num % 1000000 ? ` ${convert(num % 1000000)}` : ""}`;
    return `${convert(Math.floor(num / 1000000000))} miliar${num % 1000000000 ? ` ${convert(num % 1000000000)}` : ""}`;
  };
  if (!n) return "Nol rupiah";
  const result = convert(Math.floor(n));
  return `${result.charAt(0).toUpperCase()}${result.slice(1)} rupiah`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DownPaymentPrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<DPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/purchase-down-payment/${id}`)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setData(raw);
      })
      .catch((err) => {
        console.error("Gagal memuat DP untuk print:", err);
        setError("Gagal memuat dokumen Down Payment.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="pp-screen-state">Memuat dokumen...</div>;
  if (error || !data) return <div className="pp-screen-state error">{error || "Data Down Payment tidak ditemukan."}</div>;

  const amount    = Number(data.amount ?? 0);
  const poTotal   = Number(data.po_total ?? 0);
  const outstanding = Math.max(0, poTotal - amount);

  return (
    <>
      <style>{PURCHASE_PRINT_CSS}</style>

      <div className="pp-toolbar">
        <button className="pp-btn-print" onClick={() => window.print()}>⎙ Cetak / Save PDF</button>
        <button className="pp-btn-close" onClick={() => window.close()}>✕ Tutup</button>
      </div>

      <main className="pp-page">

        {/* ── Brand Header ── */}
        <section className="pp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="pp-brand-logo" />
          <div>
            <div className="pp-company-name">TRINOVA</div>
            <div className="pp-company-sub">Enterprise Resource Planning</div>
            <div className="pp-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              purchasing@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="pp-doc-box">
            <div className="pp-doc-title">Down Payment</div>
            <div className="pp-doc-number">{fmtDP(data.dp_number)}</div>
            {data.status && <div className="pp-doc-status">{data.status}</div>}
          </div>
        </section>

        {/* ── Info Grid ── */}
        <section className="pp-info-grid">
          <div className="pp-panel">
            <div className="pp-panel-title">Supplier</div>
            <div className="pp-panel-body">
              <div className="pp-entity-name">{data.supplier_name || "-"}</div>
              {data.payment_type && (
                <div className="pp-muted">Metode: {data.payment_type}</div>
              )}
              {data.notes?.trim() && (
                <div className="pp-muted" style={{ marginTop: 6 }}>{data.notes}</div>
              )}
            </div>
          </div>
          <div className="pp-panel">
            <div className="pp-panel-title">Informasi Dokumen</div>
            <div className="pp-panel-body">
              <div className="pp-meta-row"><div className="pp-meta-label">Tgl Bayar</div><div className="pp-meta-value">{fmtDate(data.payment_date)}</div></div>
              <div className="pp-meta-row"><div className="pp-meta-label">No. DP</div><div className="pp-meta-value">{fmtDP(data.dp_number)}</div></div>
              <div className="pp-meta-row"><div className="pp-meta-label">No. PO</div><div className="pp-meta-value">{data.po_number || "-"}</div></div>
              {data.nomor_faktur_pajak && (
                <div className="pp-meta-row"><div className="pp-meta-label">No. Faktur Pajak</div><div className="pp-meta-value">{data.nomor_faktur_pajak}</div></div>
              )}
            </div>
          </div>
        </section>

        {/* ── Payment Details Table ── */}
        <table className="pp-table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Keterangan</th>
              <th className="pp-right" style={{ width: "30%" }}>Nilai (Rp)</th>
              <th style={{ width: "30%" }}>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {poTotal > 0 && (
              <tr>
                <td>Total Nilai PO</td>
                <td className="pp-right">{fmt(poTotal)}</td>
                <td style={{ color: "#94a3b8" }}>—</td>
              </tr>
            )}
            <tr>
              <td><strong>Uang Muka Dibayar</strong></td>
              <td className="pp-right"><strong>{fmt(amount)}</strong></td>
              <td style={{ color: "#94a3b8" }}>{data.payment_type || "—"}</td>
            </tr>
            {poTotal > 0 && (
              <tr>
                <td>Sisa PO (Outstanding)</td>
                <td className="pp-right">{fmt(outstanding)}</td>
                <td style={{ color: "#94a3b8" }}>—</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Jumlah Dibayar</strong></td>
              <td className="pp-right"><strong>Rp {fmt(amount)}</strong></td>
              <td />
            </tr>
          </tfoot>
        </table>

        {/* ── Amount Banner + Terbilang ── */}
        <div className="pp-amount-banner">
          Rp {fmt(amount)}
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="pp-terbilang">
            <strong>Terbilang</strong>
            {terbilang(amount)}
          </div>
        </div>

        {/* ── Transaction info ── */}
        {(data.transaction_name || data.transaction_detail) && (
          <div className="pp-full-panel" style={{ marginTop: 16 }}>
            <div style={{ color: "#526273", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Keterangan Transaksi
            </div>
            {data.transaction_name && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: "#64748b", fontSize: 10 }}>Nama: </span>
                <strong style={{ color: "#172033" }}>{data.transaction_name}</strong>
              </div>
            )}
            {data.transaction_detail && (
              <div style={{ color: "#334155", lineHeight: 1.6 }}>{data.transaction_detail}</div>
            )}
          </div>
        )}

        {/* ── Signatures ── */}
        <section className="pp-signatures">
          <div>
            <div className="pp-signature-label">Dibuat oleh,</div>
            <div className="pp-signature-line">TRINOVA</div>
          </div>
          <div>
            <div className="pp-signature-label">Disetujui oleh,</div>
            <div className="pp-signature-line">Finance</div>
          </div>
          <div>
            <div className="pp-signature-label">Diterima oleh,</div>
            <div className="pp-signature-line">{data.supplier_name || "Supplier"}</div>
          </div>
        </section>

        <div className="pp-footer">
          Dokumen ini dicetak otomatis dari Trinova ERP. Down Payment {fmtDP(data.dp_number)} — {fmtDate(data.payment_date)}.
        </div>

      </main>
    </>
  );
}
