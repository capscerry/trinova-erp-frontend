"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PURCHASE_PRINT_CSS } from "@/lib/print/purchasePrintStyles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceData {
  purchase_invoice_id?: number;
  invoice_number: string;
  invoice_date: string;
  supplier_id?: number;
  supplier_name?: string;
  goods_receipt_id?: number;
  total_amount: number;
  status?: string;
  dp_paid?: number;
  payment_paid?: number;
  outstanding_amount?: number;
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

const fmtINV = (raw: string | number) => {
  const str = String(raw ?? "");
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
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

export default function PurchaseInvoicePrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/purchase-invoice/${id}`)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setData(raw);
      })
      .catch((err) => {
        console.error("Gagal memuat invoice untuk print:", err);
        setError("Gagal memuat dokumen Purchase Invoice.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="pp-screen-state">Memuat dokumen...</div>;
  if (error || !data) return <div className="pp-screen-state error">{error || "Data Purchase Invoice tidak ditemukan."}</div>;

  const total        = Number(data.total_amount ?? 0);
  const dpPaid       = Number(data.dp_paid ?? 0);
  const paymentPaid  = Number(data.payment_paid ?? 0);
  const outstanding  = Number(data.outstanding_amount ?? Math.max(0, total - dpPaid - paymentPaid));
  const taxAmount    = Math.round(total / 1.11 * 0.11);
  const subtotal     = total - taxAmount;

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
            <div className="pp-doc-title">Purchase Invoice</div>
            <div className="pp-doc-number">{fmtINV(data.invoice_number)}</div>
            {data.status && <div className="pp-doc-status">{data.status}</div>}
          </div>
        </section>

        {/* ── Info Grid ── */}
        <section className="pp-info-grid">
          <div className="pp-panel">
            <div className="pp-panel-title">Dari Supplier</div>
            <div className="pp-panel-body">
              <div className="pp-entity-name">{data.supplier_name || "-"}</div>
              {data.nomor_faktur_pajak && (
                <div className="pp-muted">No. Faktur Pajak: {data.nomor_faktur_pajak}</div>
              )}
              {data.transaction_name && (
                <div className="pp-muted" style={{ marginTop: 4 }}>{data.transaction_name}</div>
              )}
            </div>
          </div>
          <div className="pp-panel">
            <div className="pp-panel-title">Informasi Dokumen</div>
            <div className="pp-panel-body">
              <div className="pp-meta-row"><div className="pp-meta-label">Tgl Invoice</div><div className="pp-meta-value">{fmtDate(data.invoice_date)}</div></div>
              <div className="pp-meta-row"><div className="pp-meta-label">No. Invoice</div><div className="pp-meta-value">{fmtINV(data.invoice_number)}</div></div>
              {data.goods_receipt_id && (
                <div className="pp-meta-row"><div className="pp-meta-label">Ref. GR</div><div className="pp-meta-value">#{data.goods_receipt_id}</div></div>
              )}
            </div>
          </div>
        </section>

        {/* ── Payment Summary Table ── */}
        <table className="pp-table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Keterangan</th>
              <th className="pp-right" style={{ width: "30%" }}>Nilai (Rp)</th>
              <th className="pp-right" style={{ width: "30%" }}>Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Subtotal (sebelum pajak)</td>
              <td className="pp-right">{fmt(subtotal)}</td>
              <td className="pp-right" style={{ color: "#94a3b8" }}>—</td>
            </tr>
            <tr>
              <td>PPN (11%)</td>
              <td className="pp-right">{fmt(taxAmount)}</td>
              <td className="pp-right" style={{ color: "#94a3b8" }}>—</td>
            </tr>
            <tr>
              <td><strong>Total Invoice</strong></td>
              <td className="pp-right"><strong>{fmt(total)}</strong></td>
              <td className="pp-right" style={{ color: "#94a3b8" }}>—</td>
            </tr>
            {dpPaid > 0 && (
              <tr>
                <td>Down Payment Dibayar</td>
                <td className="pp-right" style={{ color: "#0d9488" }}>- {fmt(dpPaid)}</td>
                <td className="pp-right" style={{ color: "#94a3b8" }}>DP</td>
              </tr>
            )}
            {paymentPaid > 0 && (
              <tr>
                <td>Pembayaran Tercatat</td>
                <td className="pp-right" style={{ color: "#0d9488" }}>- {fmt(paymentPaid)}</td>
                <td className="pp-right" style={{ color: "#94a3b8" }}>PAY</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Sisa Tagihan (Outstanding)</strong></td>
              <td className="pp-right"><strong>Rp {fmt(outstanding)}</strong></td>
              <td />
            </tr>
          </tfoot>
        </table>

        {/* ── Terbilang + Summary ── */}
        <section className="pp-bottom-grid">
          <div className="pp-terbilang">
            <strong>Terbilang</strong>
            {terbilang(total)}
          </div>
          <div className="pp-summary">
            <div className="pp-summary-row"><span>Subtotal</span><span>Rp {fmt(subtotal)}</span></div>
            <div className="pp-summary-row"><span>PPN (11%)</span><span>Rp {fmt(taxAmount)}</span></div>
            {dpPaid > 0 && <div className="pp-summary-row"><span>DP Dibayar</span><span style={{ color: "#0d9488" }}>- Rp {fmt(dpPaid)}</span></div>}
            {paymentPaid > 0 && <div className="pp-summary-row"><span>Payment Dibayar</span><span style={{ color: "#0d9488" }}>- Rp {fmt(paymentPaid)}</span></div>}
            <div className="pp-summary-row pp-grand">
              <span>Outstanding</span>
              <span>Rp {fmt(outstanding)}</span>
            </div>
          </div>
        </section>

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
            <div className="pp-signature-label">Diterima dari,</div>
            <div className="pp-signature-line">{data.supplier_name || "Supplier"}</div>
          </div>
        </section>

        <div className="pp-footer">
          Dokumen ini dicetak otomatis dari Trinova ERP. Purchase Invoice {fmtINV(data.invoice_number)} — {fmtDate(data.invoice_date)}.
        </div>

      </main>
    </>
  );
}
