"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  uangMukaService,
  type UangMuka,
} from "@/lib/services/penjualan.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

function terbilang(n: number): string {
  const satuan = [
    "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
    "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas",
    "enam belas", "tujuh belas", "delapan belas", "sembilan belas",
  ];
  function convert(num: number): string {
    if (num < 20) return satuan[num];
    if (num < 100) return satuan[Math.floor(num / 10)] + " puluh" + (num % 10 ? " " + satuan[num % 10] : "");
    if (num < 200) return "seratus" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 1000) return satuan[Math.floor(num / 100)] + " ratus" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 2000) return "seribu" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 1000000) return convert(Math.floor(num / 1000)) + " ribu" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 1000000000) return convert(Math.floor(num / 1000000)) + " juta" + (num % 1000000 ? " " + convert(num % 1000000) : "");
    return convert(Math.floor(num / 1000000000)) + " miliar" + (num % 1000000000 ? " " + convert(num % 1000000000) : "");
  }
  if (n === 0) return "Nol";
  const result = convert(Math.floor(n));
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UangMukaPrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<UangMuka | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    uangMukaService
      .getById(id)
      .then(setData)
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 14, color: "#666" }}>
        Memuat dokumen...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 14, color: "#ef4444" }}>
        {error ?? "Data tidak ditemukan"}
      </div>
    );
  }

  const subTotal = data.nominalUangMuka ?? 0;
  const ppn = data.taxAmount ?? 0;
  const total = data.totalAmount ?? 0;
  const terbilangText = terbilang(total);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #000;
          background: #fff;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 10mm 12mm;
          background: #fff;
        }

        /* Toolbar */
        .toolbar {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 100;
        }
        .toolbar button {
          padding: 8px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-print { background: #1e3a5f; color: #fff; }
        .btn-close  { background: #ef4444; color: #fff; }
        .btn-print:hover { background: #2d5a8e; }
        .btn-close:hover { background: #dc2626; }

        /* Kop */
        .header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }
        .header-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .header-company h1 {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .header-company p { font-size: 10px; color: #444; margin-top: 2px; }

        /* Judul */
        .doc-title {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0 8px;
          text-decoration: underline;
        }

        /* Info grid */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          margin-bottom: 10px;
          border: 1px solid #000;
        }
        .info-left {
          padding: 6px 8px;
          border-right: 1px solid #000;
        }
        .info-left .label { font-size: 10px; margin-bottom: 4px; text-decoration: underline; }
        .info-left .value { font-size: 11px; font-weight: 600; line-height: 1.4; }
        .info-right { display: grid; grid-template-columns: 1fr 1fr; }
        .info-cell {
          padding: 5px 8px;
          border-bottom: 1px dashed #999;
          border-right: 1px dashed #999;
        }
        .info-cell:nth-child(2n) { border-right: none; }
        .info-cell:nth-last-child(-n+2) { border-bottom: none; }
        .info-cell .cell-label { font-size: 9px; color: #555; margin-bottom: 2px; }
        .info-cell .cell-value { font-size: 11px; font-weight: 600; }

        /* Tabel ringkasan */
        .summary-section {
          margin-bottom: 8px;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 8px;
        }
        .summary-table th {
          background: #f0f0f0;
          border: 1px solid #000;
          padding: 4px 8px;
          text-align: left;
          font-weight: bold;
        }
        .summary-table td {
          border: 1px solid #000;
          padding: 4px 8px;
        }
        .summary-table td.right { text-align: right; }
        .summary-table tr.total-row td {
          font-weight: bold;
          background: #f8f8f8;
        }

        /* Terbilang */
        .terbilang-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 11px;
        }
        .terbilang-label { white-space: nowrap; font-weight: 600; }
        .terbilang-value {
          flex: 1;
          border: 1px solid #999;
          padding: 4px 8px;
          background: #fafafa;
        }

        /* Footer keterangan + TTD */
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 12px;
          margin-bottom: 16px;
        }
        .keterangan-label { font-size: 10px; margin-bottom: 4px; }
        .keterangan-box {
          border: 1px solid #999;
          min-height: 70px;
          padding: 6px 8px;
          font-size: 10px;
          color: #555;
        }

        /* Syarat pembayaran */
        .syarat-box {
          border: 1px solid #ccc;
          padding: 5px 8px;
          font-size: 10px;
          margin-bottom: 8px;
          background: #fafafa;
        }

        /* TTD */
        .ttd-row {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }
        .ttd-box { text-align: center; width: 140px; }
        .ttd-box .ttd-title { font-size: 10px; margin-bottom: 40px; }
        .ttd-box .ttd-line { border-top: 1px solid #000; font-size: 10px; padding-top: 2px; }

        /* Print */
        @media print {
          .toolbar { display: none !important; }
          body { margin: 0; }
          .page { width: 100%; padding: 8mm 10mm; margin: 0; }
        }
        @media screen {
          body { background: #e5e7eb; }
          .page { box-shadow: 0 4px 24px rgba(0,0,0,0.15); margin: 20px auto 40px; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn-print" onClick={() => window.print()}>
          🖨️ Cetak / Save PDF
        </button>
        <button className="btn-close" onClick={() => window.close()}>
          ✕ Tutup
        </button>
      </div>

      {/* Halaman Dokumen */}
      <div className="page">

        {/* Kop Surat */}
        <div className="header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="header-logo" />
          <div className="header-company">
            <h1>PT Hang Song Machinery Indonesia</h1>
            <p>Kab. Bekasi Jawa Barat, Indonesia</p>
            <p>Telp: (021) 000-0000 | Email: info@company.com</p>
          </div>
        </div>

        {/* Judul */}
        <div className="doc-title">Faktur Uang Muka</div>

        {/* Info Grid */}
        <div className="info-grid">
          <div className="info-left">
            <div className="label">Kepada</div>
            <div className="value">
              {data.customerName || "—"}
              {data.alamat && (
                <div style={{ fontWeight: "normal", marginTop: 4, fontSize: 10, color: "#444" }}>
                  {data.alamat}
                </div>
              )}
            </div>
          </div>
          <div className="info-right">
            <div className="info-cell">
              <div className="cell-label">Tanggal</div>
              <div className="cell-value">{formatDate(data.tanggal)}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">No Faktur</div>
              <div className="cell-value">{data.noFaktur}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">No Sales Order</div>
              <div className="cell-value">{data.nomorSo || "—"}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">No PO</div>
              <div className="cell-value">{data.noPO || "—"}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">Syarat Pembayaran</div>
              <div className="cell-value">{data.syaratPembayaran || "—"}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">Status Pajak</div>
              <div className="cell-value">{data.isTaxable ? "Kena Pajak" : "Tidak Kena Pajak"}</div>
            </div>
          </div>
        </div>

        {/* Tabel Ringkasan Pembayaran */}
        <div className="summary-section">
          <table className="summary-table">
            <thead>
              <tr>
                <th style={{ width: "60%" }}>Keterangan</th>
                <th style={{ width: "40%", textAlign: "right" }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Uang Muka atas pesanan {data.nomorSo || "-"}</td>
                <td className="right">{formatRupiah(subTotal)}</td>
              </tr>
              <tr>
                <td>PPN {data.isTaxable ? "(11%)" : "(0%)"}</td>
                <td className="right">{formatRupiah(ppn)}</td>
              </tr>
              <tr className="total-row">
                <td>Total Tagihan</td>
                <td className="right">{formatRupiah(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terbilang */}
        <div className="terbilang-row">
          <span className="terbilang-label">Terbilang :</span>
          <div className="terbilang-value">{terbilangText} rupiah</div>
        </div>

        {/* Footer */}
        <div className="footer-grid">
          <div>
            <div className="keterangan-label">Keterangan :</div>
            <div className="keterangan-box">{data.keterangan || ""}</div>
          </div>
          <div style={{ fontSize: 10, paddingTop: 18 }}>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Informasi Tambahan</div>
            <div style={{ border: "1px solid #ccc", padding: "6px 8px", background: "#fafafa", lineHeight: 1.8 }}>
              <div>Harga: {data.isTaxIncluded ? "Sudah termasuk pajak" : "Belum termasuk pajak"}</div>
            </div>
          </div>
        </div>

        {/* TTD */}
        <div className="ttd-row">
          <div className="ttd-box">
            <div className="ttd-title">Disetujui,</div>
            <div className="ttd-line">( _________________ )</div>
          </div>
          <div className="ttd-box">
            <div className="ttd-title">Diperiksa,</div>
            <div className="ttd-line">( _________________ )</div>
          </div>
          <div className="ttd-box">
            <div className="ttd-title">Dibuat oleh,</div>
            <div className="ttd-line">( _________________ )</div>
          </div>
        </div>

      </div>
    </>
  );
}
