"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  salesOrderService,
  type SalesOrderDetail,
  type SalesOrderDetailItem,
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

// Konversi angka ke terbilang (Bahasa Indonesia)
function terbilang(n: number): string {
  const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
    "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas",
    "enam belas", "tujuh belas", "delapan belas", "sembilan belas"];

  function convert(num: number): string {
    if (num < 20) return satuan[num];
    if (num < 100) return satuan[Math.floor(num / 10) * 10 - 10 + 10] === satuan[0]
      ? satuan[Math.floor(num / 10)] + " puluh" + (num % 10 ? " " + satuan[num % 10] : "")
      : satuan[Math.floor(num / 10)] + " puluh" + (num % 10 ? " " + satuan[num % 10] : "");
    if (num < 200) return "seratus" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 1000) return satuan[Math.floor(num / 100)] + " ratus" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 2000) return "seribu" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 1000000) return convert(Math.floor(num / 1000)) + " ribu" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 1000000000) return convert(Math.floor(num / 1000000)) + " juta" + (num % 1000000 ? " " + convert(num % 1000000) : "");
    return convert(Math.floor(num / 1000000000)) + " miliar" + (num % 1000000000 ? " " + convert(num % 1000000000) : "");
  }

  if (n === 0) return "nol";
  const result = convert(Math.floor(n));
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function SalesOrderPrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    salesOrderService
      .getById(id)
      .then(setData)
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">
        Memuat dokumen...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-red-500">
        {error ?? "Data tidak ditemukan"}
      </div>
    );
  }

  const subTotal = data.items?.reduce((s, i) => s + i.totalPrice, 0) ?? 0;
  const ppn = data.items ? Math.round(subTotal * 0.11) : 0; // asumsi PPN 11% — sesuaikan jika ada field dari API
  const grandTotal = data.total ?? subTotal;
  const terbilangText = terbilang(grandTotal);

  return (
    <>
      {/* ── Print CSS ────────────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Arial&display=swap');

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

        /* Toolbar — hanya muncul di layar, tidak di print */
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
        .btn-print  { background: #1e3a5f; color: #fff; }
        .btn-close  { background: #ef4444; color: #fff; }
        .btn-print:hover { background: #2d5a8e; }
        .btn-close:hover { background: #dc2626; }

        /* Kop Surat */
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
          border: 1px solid #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #999;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .header-company h1 {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .header-company p {
          font-size: 10px;
          color: #444;
          margin-top: 2px;
        }

        /* Judul Dokumen */
        .doc-title {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0 8px;
          text-decoration: underline;
        }

        /* Grid Kepada + Info Kanan */
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
        .info-left .label {
          font-size: 10px;
          margin-bottom: 4px;
          text-decoration: underline;
        }
        .info-left .value {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
        }
        .info-right {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .info-cell {
          padding: 5px 8px;
          border-bottom: 1px dashed #999;
          border-right: 1px dashed #999;
        }
        .info-cell:nth-child(2n) { border-right: none; }
        .info-cell:nth-last-child(-n+2) { border-bottom: none; }
        .info-cell .cell-label {
          font-size: 9px;
          color: #555;
          margin-bottom: 2px;
        }
        .info-cell .cell-value {
          font-size: 11px;
          font-weight: 600;
        }

        /* Tabel Produk */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 11px;
        }
        .items-table th {
          background: #f0f0f0;
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: center;
          font-weight: bold;
        }
        .items-table td {
          border: 1px solid #000;
          padding: 3px 6px;
        }
        .items-table td.right { text-align: right; }
        .items-table td.center { text-align: center; }
        .items-table tbody tr:nth-child(even) { background: #fafafa; }

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

        /* Bagian bawah: Keterangan + Summary */
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 12px;
          margin-bottom: 16px;
        }
        .keterangan-box {
          border: 1px solid #999;
          min-height: 80px;
          padding: 6px 8px;
          font-size: 10px;
          color: #555;
          position: relative;
        }
        .keterangan-label {
          font-size: 10px;
          margin-bottom: 4px;
        }

        /* Summary total */
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .summary-table td {
          border: 1px solid #999;
          padding: 4px 8px;
        }
        .summary-table td:last-child { text-align: right; font-weight: 600; }
        .summary-table tr.grand-total td {
          font-weight: bold;
          font-size: 12px;
          border: 1.5px solid #000;
        }

        /* TTD */
        .ttd-row {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }
        .ttd-box {
          text-align: center;
          width: 140px;
        }
        .ttd-box .ttd-title {
          font-size: 10px;
          margin-bottom: 40px;
        }
        .ttd-box .ttd-line {
          border-top: 1px solid #000;
          font-size: 10px;
          padding-top: 2px;
        }

        /* Print media */
        @media print {
          .toolbar { display: none !important; }
          body { margin: 0; }
          .page {
            width: 100%;
            padding: 8mm 10mm;
            margin: 0;
          }
        }

        @media screen {
          body { background: #e5e7eb; }
          .page {
            box-shadow: 0 4px 24px rgba(0,0,0,0.15);
            margin: 20px auto 40px;
          }
        }
      `}</style>

      {/* ── Toolbar (hanya layar) ─────────────────────────────────────────── */}
      <div className="toolbar">
        <button className="btn-print" onClick={() => window.print()}>
          🖨️ Cetak / Save PDF
        </button>
        <button className="btn-close" onClick={() => window.close()}>
          ✕ Tutup
        </button>
      </div>

      {/* ── Halaman Dokumen ───────────────────────────────────────────────── */}
      <div className="page">

        {/* Kop Surat */}
        <div className="header">
          <div className="header-logo">LOGO</div>
          <div className="header-company">
            <h1>PT Hang Song Machinery Indonesia</h1>
            <p>Kab. Bekasi Jawa Barat, Indonesia</p>
            <p>Telp: (021) 000-0000 | Email: info@company.com</p>
          </div>
        </div>

        {/* Judul */}
        <div className="doc-title">Pesanan Penjualan</div>

        {/* Info Grid: Kepada + Detail SO */}
        <div className="info-grid">
          {/* Kiri: Kepada */}
          <div className="info-left">
            <div className="label">Kepada</div>
            <div className="value">
              {data.pelanggan || "—"}
              {data.alamat && (
                <div style={{ fontWeight: "normal", marginTop: 4, fontSize: 10, color: "#444" }}>
                  {data.alamat}
                </div>
              )}
            </div>
          </div>

          {/* Kanan: Grid info 2x3 */}
          <div className="info-right">
            <div className="info-cell">
              <div className="cell-label">Tanggal</div>
              <div className="cell-value">{formatDate(data.tanggal)}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">Nomor</div>
              <div className="cell-value">{data.nomor}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">Syarat Pembayaran</div>
              <div className="cell-value">—</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">FOB</div>
              <div className="cell-value">—</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">PO No</div>
              <div className="cell-value">{data.poNumber || "—"}</div>
            </div>
            <div className="info-cell">
              <div className="cell-label">Tanggal Pengiriman</div>
              <div className="cell-value">{formatDate(data.tanggalKirim)}</div>
            </div>
          </div>
        </div>

        {/* Tabel Produk */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: "12%" }}>Kode Barang</th>
              <th style={{ width: "38%" }}>Nama Barang</th>
              <th style={{ width: "8%" }}>Kts.</th>
              <th style={{ width: "20%" }}>@Harga</th>
              <th style={{ width: "10%" }}>Diskon</th>
              <th style={{ width: "12%" }}>Total Harga</th>
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((item: SalesOrderDetailItem, idx: number) => (
              <tr key={idx}>
                <td className="center">{(item as any).productCode || (idx + 1).toString().padStart(6, "0")}</td>
                <td>{item.productName}</td>
                <td className="center">{item.productQty}</td>
                <td className="right">{formatRupiah(item.productPrice)}</td>
                <td className="right">{item.productDiscount > 0 ? item.productDiscount : 0}</td>
                <td className="right">{formatRupiah(item.totalPrice)}</td>
              </tr>
            ))}
            {/* Baris kosong agar tabel tidak terlalu pendek */}
            {(data.items?.length ?? 0) < 5 &&
              Array.from({ length: 5 - (data.items?.length ?? 0) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td>&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Terbilang */}
        <div className="terbilang-row">
          <span className="terbilang-label">Terbilang :</span>
          <div className="terbilang-value">{terbilangText} rupiah</div>
        </div>

        {/* Footer: Keterangan + Summary */}
        <div className="footer-grid">
          {/* Keterangan */}
          <div>
            <div className="keterangan-label">Keterangan :</div>
            <div className="keterangan-box">
              {data.keterangan || ""}
            </div>
          </div>

          {/* Summary */}
          <table className="summary-table">
            <tbody>
              <tr>
                <td>Sub Total</td>
                <td>{formatRupiah(subTotal)}</td>
              </tr>
              <tr>
                <td>Diskon</td>
                <td>0</td>
              </tr>
              <tr>
                <td>PPN (11%)</td>
                <td>{formatRupiah(ppn)}</td>
              </tr>
              <tr>
                <td>Biaya Lain-lain</td>
                <td>0</td>
              </tr>
              <tr className="grand-total">
                <td>Total</td>
                <td>{formatRupiah(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
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