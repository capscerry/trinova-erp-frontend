"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PURCHASE_PRINT_CSS } from "@/lib/print/purchasePrintStyles";
import { getPurchasePaymentById } from "@/lib/services/purchase-payment.service";

interface PaymentData {
  purchase_payment_id: number;
  payment_number: string;
  invoice_number?: string;
  supplier_name?: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  status?: string;
  notes?: string;
  transaction_name?: string;
  transaction_detail?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (v?: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
};

const fmtPAY = (raw: string | number) => {
  const str = String(raw ?? "");
  const digits = str.replace(/^PAY-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `PAY-${digits.padStart(10, "0")}`;
};

const fmtINV = (raw?: string | number) => {
  if (!raw) return "-";
  const str = String(raw);
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
};

function terbilang(n: number): string {
  const words = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];

  const convert = (num: number): string => {
    if (num < 12) return words[num];
    if (num < 20) return `${convert(num - 10)} belas`;
    if (num < 100)
      return `${convert(Math.floor(num / 10))} puluh${
        num % 10 ? ` ${convert(num % 10)}` : ""
      }`;
    if (num < 200)
      return `seratus${num % 100 ? ` ${convert(num % 100)}` : ""}`;
    if (num < 1000)
      return `${convert(Math.floor(num / 100))} ratus${
        num % 100 ? ` ${convert(num % 100)}` : ""
      }`;
    if (num < 2000)
      return `seribu${num % 1000 ? ` ${convert(num % 1000)}` : ""}`;
    if (num < 1000000)
      return `${convert(Math.floor(num / 1000))} ribu${
        num % 1000 ? ` ${convert(num % 1000)}` : ""
      }`;
    if (num < 1000000000)
      return `${convert(Math.floor(num / 1000000))} juta${
        num % 1000000 ? ` ${convert(num % 1000000)}` : ""
      }`;

    return `${convert(Math.floor(num / 1000000000))} miliar${
      num % 1000000000 ? ` ${convert(num % 1000000000)}` : ""
    }`;
  };

  if (!n) return "Nol rupiah";

  const result = convert(Math.floor(n));
  return `${result.charAt(0).toUpperCase()}${result.slice(1)} rupiah`;
}

export default function PurchasePaymentPrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    getPurchasePaymentById(Number(id))
      .then(setData)
      .catch((err) => {
        console.error("Gagal memuat Purchase Payment:", err);
        setError("Gagal memuat dokumen Purchase Payment.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return <div className="pp-screen-state">Memuat dokumen...</div>;

  if (error || !data)
    return (
      <div className="pp-screen-state error">
        {error || "Data Purchase Payment tidak ditemukan."}
      </div>
    );

  return (
    <>
      <style>{PURCHASE_PRINT_CSS}</style>

      <div className="pp-toolbar">
        <button
          className="pp-btn-print"
          onClick={() => window.print()}
        >
          ⎙ Cetak / Save PDF
        </button>

        <button
          className="pp-btn-close"
          onClick={() => window.close()}
        >
          ✕ Tutup
        </button>
      </div>

      <main className="pp-page">

        {/* ── Brand Header ── */}
        <section className="pp-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            src="/trinova-logo.png"
            alt="Trinova"
            className="pp-brand-logo"
        />

        <div>
            <div className="pp-company-name">TRINOVA</div>
            <div className="pp-company-sub">
            Enterprise Resource Planning
            </div>

            <div className="pp-company-address">
            Jl. Trinova Business Center No. 1
            <br />
            Jakarta, Indonesia
            <br />
            purchasing@trinova.co.id | +62 21 0000 0000
            </div>
        </div>

        <div className="pp-doc-box">
            <div className="pp-doc-title">
            Purchase Payment
            </div>

            <div className="pp-doc-number">
            {fmtPAY(data.payment_number)}
            </div>

            {data.status && (
            <div className="pp-doc-status">
                {data.status}
            </div>
            )}
        </div>
        </section>
        {/* ── Info Grid ── */}
        <section className="pp-info-grid">
        <div className="pp-panel">
            <div className="pp-panel-title">Informasi Pembayaran</div>

            <div className="pp-panel-body">
            <div className="pp-entity-name">
                {data.supplier_name || "-"}
            </div>

            <div className="pp-muted">
                Purchase Invoice: {fmtINV(data.invoice_number)}
            </div>

            <div className="pp-muted">
                Metode Pembayaran: {data.payment_method || "-"}
            </div>

            {data.notes?.trim() && (
                <div
                className="pp-muted"
                style={{ marginTop: 6 }}
                >
                {data.notes}
                </div>
            )}
            </div>
        </div>

        <div className="pp-panel">
            <div className="pp-panel-title">
            Informasi Dokumen
            </div>

            <div className="pp-panel-body">
            <div className="pp-meta-row">
                <div className="pp-meta-label">
                Tgl Bayar
                </div>

                <div className="pp-meta-value">
                {fmtDate(data.payment_date)}
                </div>
            </div>

            <div className="pp-meta-row">
                <div className="pp-meta-label">
                No. Payment
                </div>

                <div className="pp-meta-value">
                {fmtPAY(data.payment_number)}
                </div>
            </div>

            <div className="pp-meta-row">
                <div className="pp-meta-label">
                No. Invoice
                </div>

                <div className="pp-meta-value">
                {fmtINV(data.invoice_number)}
                </div>
            </div>

            <div className="pp-meta-row">
                <div className="pp-meta-label">
                Status
                </div>

                <div className="pp-meta-value">
                {data.status || "-"}
                </div>
            </div>
            </div>
        </div>
        </section>
        {/* ── Payment Details ── */}
        <table className="pp-table" style={{ marginTop: 18 }}>
        <thead>
            <tr>
            <th style={{ width: "40%" }}>Keterangan</th>
            <th className="pp-right" style={{ width: "30%" }}>
                Nilai (Rp)
            </th>
            <th style={{ width: "30%" }}>
                Catatan
            </th>
            </tr>
        </thead>

        <tbody>
        <tr>
            <td>
            <strong>Purchase Payment</strong>
            </td>

            <td className="pp-right">
            <strong>Rp {fmt(data.amount)}</strong>
            </td>

            <td style={{ color: "#94a3b8" }}>
            {data.payment_method || "-"}
            </td>
        </tr>

        <tr>
            <td>
            Purchase Invoice
            </td>

            <td className="pp-right">
            —
            </td>

            <td style={{ color: "#94a3b8" }}>
            Referensi Invoice {fmtINV(data.invoice_number)}
            </td>
        </tr>
        </tbody>

        <tfoot>
            <tr>
            <td>
                <strong>Jumlah Dibayar</strong>
            </td>

            <td className="pp-right">
                <strong>Rp {fmt(data.amount)}</strong>
            </td>

            <td />
            </tr>
        </tfoot>
        </table>
        {/* ── Amount Banner ── */}
        <div className="pp-amount-banner">
        <div
            style={{
            fontSize: "11px",
            opacity: 0.85,
            }}
        >
            JUMLAH PEMBAYARAN
        </div>

        <div
            style={{
            fontSize: "30px",
            fontWeight: 900,
            marginTop: "8px",
            letterSpacing: ".5px",
            }}
        >
            Rp {fmt(data.amount)}
        </div>
        </div>

        <div style={{ marginTop: 12 }}>
        <div className="pp-terbilang">
            <strong>Terbilang</strong>
            {terbilang(data.amount)}
        </div>
        </div>
        {/* ── Note + Summary ── */}
        <section className="pp-bottom-grid">
        <div className="pp-note">
            <strong>Catatan</strong>

            {data.notes ||
            data.transaction_detail ||
            data.transaction_name ||
            "Pembayaran telah diproses sesuai Purchase Invoice terkait."}
        </div>

        <div className="pp-summary">
            <div className="pp-summary-row">
            <span>Metode</span>
            <span>{data.payment_method || "-"}</span>
            </div>

            <div className="pp-summary-row">
            <span>Status</span>
            <span>{data.status || "-"}</span>
            </div>

            <div className="pp-summary-row pp-grand">
            <span>Total Pembayaran</span>
            <span>Rp {fmt(data.amount)}</span>
            </div>
        </div>
        </section>
        {/* ── Transaction Info ── */}
        {(data.transaction_name || data.transaction_detail) && (
        <div className="pp-full-panel" style={{ marginTop: 16 }}>
            <div
            style={{
                color: "#526273",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 8,
            }}
            >
            Keterangan Transaksi
            </div>

            {data.transaction_name && (
            <div style={{ marginBottom: 4 }}>
                <span style={{ color: "#64748b", fontSize: 10 }}>
                Nama:
                </span>{" "}
                <strong>{data.transaction_name}</strong>
            </div>
            )}

            {data.transaction_detail && (
            <div
                style={{
                color: "#334155",
                lineHeight: 1.6,
                }}
            >
                {data.transaction_detail}
            </div>
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
            <div className="pp-signature-line">
            {data.supplier_name || "Supplier"}
            </div>
        </div>
        </section>
        <div className="pp-footer">
        Dokumen ini dicetak otomatis dari Trinova ERP.
        Purchase Payment {fmtPAY(data.payment_number)} — {fmtDate(data.payment_date)}.
        </div>

      </main>
    </>
  );
}