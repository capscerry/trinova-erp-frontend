import type { SalesQuotationDetail } from "@/lib/services/penjualan.service";

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
    if (num < 100) return satuan[Math.floor(num / 10)] + " puluh" + (num % 10 ? " " + satuan[num % 10] : "");
    if (num < 200) return "seratus" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 1000) return satuan[Math.floor(num / 100)] + " ratus" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 2000) return "seribu" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 1000000) return convert(Math.floor(num / 1000)) + " ribu" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 1000000000) return convert(Math.floor(num / 1000000)) + " juta" + (num % 1000000 ? " " + convert(num % 1000000) : "");
    return convert(Math.floor(num / 1000000000)) + " miliar" + (num % 1000000000 ? " " + convert(num % 1000000000) : "");
  }

  if (n === 0) return "nol";
  const result = convert(Math.floor(n));
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ─── Komponen ─────────────────────────────────────────────────────────────────
// Dipakai di dua tempat:
//  1. app/penjualan/quotation/[id]/print/page.tsx  — tampilan cetak di layar
//  2. lib/pdf/quotationPdf.ts                       — di-render off-screen lalu
//     ditangkap html2canvas untuk dijadikan lampiran PDF email
//
// Semua class di-prefix "qpd-" (Quotation Print Document) supaya aman dipasang
// di tengah halaman lain tanpa bentrok dengan class Tailwind/komponen lain.

interface Props {
  data: SalesQuotationDetail;
}

export function QuotationPrintDocument({ data }: Props) {
  const grandTotal = data.subtotal;
  const grossAmount = data.subtotal + data.discountTotal - data.taxTotal;
  const terbilangText = terbilang(grandTotal);

  const taxStatusText = data.kenaPajak
    ? "Sudah termasuk PPN"
    : "Belum termasuk PPN (Tidak dikenakan)";

  return (
    <div className="qpd-root">
      <style>{`
        .qpd-root, .qpd-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .qpd-root {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #000;
          background: #fff;
        }
        .qpd-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 10mm 12mm;
          background: #fff;
        }
        .qpd-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }
        .qpd-header-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .qpd-header-company h1 {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .qpd-header-company p {
          font-size: 10px;
          color: #444;
          margin-top: 2px;
        }
        .qpd-doc-title {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0 8px;
          text-decoration: underline;
        }
        .qpd-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          margin-bottom: 10px;
          border: 1px solid #000;
        }
        .qpd-info-left {
          padding: 6px 8px;
          border-right: 1px solid #000;
        }
        .qpd-info-left .qpd-label {
          font-size: 10px;
          margin-bottom: 4px;
          text-decoration: underline;
        }
        .qpd-info-left .qpd-value {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
        }
        .qpd-info-right {
          display: grid;
          grid-template-columns: 1fr;
        }
        .qpd-info-cell {
          padding: 5px 8px;
          border-bottom: 1px dashed #999;
        }
        .qpd-info-cell:last-child { border-bottom: none; }
        .qpd-info-cell .qpd-cell-label {
          font-size: 9px;
          color: #555;
          margin-bottom: 2px;
        }
        .qpd-info-cell .qpd-cell-value {
          font-size: 11px;
          font-weight: 600;
        }
        .qpd-tax-status {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 3px;
          margin-top: 2px;
        }
        .qpd-tax-status.qpd-included {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #166534;
        }
        .qpd-tax-status.qpd-excluded {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #92400e;
        }
        .qpd-items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 11px;
        }
        .qpd-items-table th {
          background: #f0f0f0;
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: center;
          font-weight: bold;
        }
        .qpd-items-table td {
          border: 1px solid #000;
          padding: 3px 6px;
        }
        .qpd-items-table td.qpd-right { text-align: right; }
        .qpd-items-table td.qpd-center { text-align: center; }
        .qpd-items-table tbody tr:nth-child(even) { background: #fafafa; }
        .qpd-terbilang-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 11px;
        }
        .qpd-terbilang-label { white-space: nowrap; font-weight: 600; }
        .qpd-terbilang-value {
          flex: 1;
          border: 1px solid #999;
          padding: 4px 8px;
          background: #fafafa;
        }
        .qpd-footer-grid {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 12px;
          margin-bottom: 16px;
        }
        .qpd-keterangan-box {
          border: 1px solid #999;
          min-height: 80px;
          padding: 6px 8px;
          font-size: 10px;
          color: #555;
          position: relative;
        }
        .qpd-keterangan-label {
          font-size: 10px;
          margin-bottom: 4px;
        }
        .qpd-summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .qpd-summary-table td {
          border: 1px solid #999;
          padding: 4px 8px;
        }
        .qpd-summary-table td:last-child { text-align: right; font-weight: 600; }
        .qpd-summary-table tr.qpd-grand-total td {
          font-weight: bold;
          font-size: 12px;
          border: 1.5px solid #000;
        }
        .qpd-ttd-row {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }
        .qpd-ttd-box {
          text-align: center;
          width: 140px;
        }
        .qpd-ttd-box .qpd-ttd-title {
          font-size: 10px;
          margin-bottom: 40px;
        }
        .qpd-ttd-box .qpd-ttd-line {
          border-top: 1px solid #000;
          font-size: 10px;
          padding-top: 2px;
        }
      `}</style>

      <div className="qpd-page">
        {/* Kop Surat */}
        <div className="qpd-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="qpd-header-logo" />
          <div className="qpd-header-company">
            <h1>PT Hang Song Machinery Indonesia</h1>
            <p>Kab. Bekasi Jawa Barat, Indonesia</p>
            <p>Telp: (021) 000-0000 | Email: info@company.com</p>
          </div>
        </div>

        {/* Judul */}
        <div className="qpd-doc-title">Penawaran Penjualan</div>

        {/* Info Grid: Kepada + Detail SQ */}
        <div className="qpd-info-grid">
          <div className="qpd-info-left">
            <div className="qpd-label">Kepada</div>
            <div className="qpd-value">{data.pelanggan || "—"}</div>
          </div>

          <div className="qpd-info-right">
            <div className="qpd-info-cell">
              <div className="qpd-cell-label">Tanggal</div>
              <div className="qpd-cell-value">{formatDate(data.tanggal)}</div>
            </div>
            <div className="qpd-info-cell">
              <div className="qpd-cell-label">Nomor</div>
              <div className="qpd-cell-value">{data.nomor}</div>
            </div>
            <div className="qpd-info-cell">
              <div className="qpd-cell-label">Status Pajak</div>
              <div className="qpd-cell-value">
                <span className={`qpd-tax-status ${data.kenaPajak ? "qpd-included" : "qpd-excluded"}`}>
                  {taxStatusText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Produk */}
        <table className="qpd-items-table">
          <thead>
            <tr>
              <th style={{ width: "13%" }}>Kode Barang</th>
              <th style={{ width: "32%" }}>Nama Barang</th>
              <th style={{ width: "8%" }}>Kts.</th>
              <th style={{ width: "9%" }}>Satuan</th>
              <th style={{ width: "13%" }}>@Harga</th>
              <th style={{ width: "10%" }}>Diskon</th>
              <th style={{ width: "15%" }}>Total Harga</th>
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((item, idx) => (
              <tr key={idx}>
                <td className="qpd-center">{item.productCode || (idx + 1).toString().padStart(6, "0")}</td>
                <td>{item.productName}</td>
                <td className="qpd-center">{item.qty}</td>
                <td className="qpd-center">{item.satuan}</td>
                <td className="qpd-right">{formatRupiah(item.harga)}</td>
                <td className="qpd-center">{item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}</td>
                <td className="qpd-right">{formatRupiah(item.totalHarga)}</td>
              </tr>
            ))}
            {(data.items?.length ?? 0) < 5 &&
              Array.from({ length: 5 - (data.items?.length ?? 0) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td>&nbsp;</td>
                  <td></td>
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
        <div className="qpd-terbilang-row">
          <span className="qpd-terbilang-label">Terbilang :</span>
          <div className="qpd-terbilang-value">{terbilangText} rupiah</div>
        </div>

        {/* Footer: Keterangan + Summary */}
        <div className="qpd-footer-grid">
          <div>
            <div className="qpd-keterangan-label">Keterangan :</div>
            <div className="qpd-keterangan-box">{data.keterangan || ""}</div>
          </div>

          <div>
            <table className="qpd-summary-table">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td>{formatRupiah(grossAmount)}</td>
                </tr>
                {data.discountTotal > 0 && (
                  <tr>
                    <td>Diskon</td>
                    <td>-{formatRupiah(data.discountTotal)}</td>
                  </tr>
                )}
                {data.kenaPajak && (
                  <tr>
                    <td>PPN</td>
                    <td>{formatRupiah(data.taxTotal)}</td>
                  </tr>
                )}
                <tr className="qpd-grand-total">
                  <td>Total</td>
                  <td>{formatRupiah(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: "9px", color: "#666", marginTop: "4px", textAlign: "right" }}>
              * Total di atas {data.kenaPajak ? "sudah termasuk PPN" : "belum termasuk PPN"}
            </p>
          </div>
        </div>

        {/* TTD */}
        <div className="qpd-ttd-row">
          <div className="qpd-ttd-box">
            <div className="qpd-ttd-title">Disetujui,</div>
            <div className="qpd-ttd-line">( _________________ )</div>
          </div>
          <div className="qpd-ttd-box">
            <div className="qpd-ttd-title">Diperiksa,</div>
            <div className="qpd-ttd-line">( _________________ )</div>
          </div>
          <div className="qpd-ttd-box">
            <div className="qpd-ttd-title">Dibuat oleh,</div>
            <div className="qpd-ttd-line">( _________________ )</div>
          </div>
        </div>
      </div>
    </div>
  );
}
