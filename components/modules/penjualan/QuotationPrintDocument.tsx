import type { SalesQuotationDetail } from "@/lib/services/penjualan.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

// ─── Komponen ─────────────────────────────────────────────────────────────────
// Dipakai di dua tempat:
//  1. app/penjualan/quotation/[id]/print/page.tsx  — tampilan cetak di layar
//  2. lib/pdf/quotationPdf.tsx                      — di-render off-screen lalu
//     ditangkap html2canvas untuk dijadikan lampiran PDF email
//
// Semua class di-prefix "qpd-" (Quotation Print Document) -- root page tetap
// pakai class ".qpd-page" karena lib/pdf/quotationPdf.tsx mencarinya lewat
// selector itu. Gaya visual disamakan persis dengan InvoicePrintDocument/
// PurchaseOrderPrintDocument/SalesOrderPrintDocument supaya seluruh dokumen
// lintas-modul terasa satu identitas perusahaan.

interface Props {
  data: SalesQuotationDetail;
}

export function QuotationPrintDocument({ data }: Props) {
  const grossTotal = data.subtotal + data.discountTotal - data.taxTotal;

  return (
    <div className="qpd-root">
      <style>{`
        .qpd-root, .qpd-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .qpd-root {
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #fff;
        }
        .qpd-page { width: 210mm; min-height: 297mm; background: #fff; padding: 13mm 14mm; }
        .qpd-brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .qpd-brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .qpd-company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .qpd-company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .qpd-company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .qpd-doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .qpd-doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .qpd-doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .qpd-info-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; margin-top: 18px; }
        .qpd-panel { border: 1px solid #dbe3ea; border-radius: 10px; overflow: hidden; }
        .qpd-panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .qpd-panel-body { padding: 11px 12px; }
        .qpd-customer-name { color: #0d1b2a; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .qpd-muted { color: #64748b; line-height: 1.5; }
        .qpd-meta-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 4px 0; }
        .qpd-meta-label { color: #64748b; }
        .qpd-meta-value { color: #172033; font-weight: 700; text-align: right; }
        .qpd-table { border-collapse: collapse; margin-top: 18px; width: 100%; }
        .qpd-table thead th { background: #0d1b2a; color: #fff; font-size: 10px; letter-spacing: .6px; padding: 9px 8px; text-align: left; text-transform: uppercase; }
        .qpd-table tbody td { border-bottom: 1px solid #e6edf3; color: #26384d; padding: 9px 8px; vertical-align: top; }
        .qpd-right { text-align: right; }
        .qpd-center { text-align: center; }
        .qpd-product-code { color: #94a3b8; font-size: 10px; margin-top: 3px; }
        .qpd-bottom-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-top: 18px; }
        .qpd-terbilang { background: #f8fafc; border: 1px solid #dbe3ea; border-radius: 10px; color: #334155; line-height: 1.6; padding: 12px; }
        .qpd-terbilang strong { color: #0d1b2a; display: block; font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .qpd-summary { border: 1px solid #dbe3ea; border-radius: 10px; padding: 10px 12px; }
        .qpd-summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .qpd-summary-row span:first-child { color: #64748b; }
        .qpd-summary-row span:last-child { color: #172033; font-weight: 700; }
        .qpd-grand { border-top: 2px solid #0d1b2a; margin-top: 6px; padding-top: 9px; }
        .qpd-grand span { color: #0d1b2a !important; font-size: 15px; font-weight: 900 !important; }
        .qpd-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 36px; text-align: center; }
        .qpd-signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .qpd-footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
      `}</style>

      <main className="qpd-page">
        <section className="qpd-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="qpd-brand-logo" />
          <div>
            <div className="qpd-company-title">TRINOVA</div>
            <div className="qpd-company-sub">Enterprise Resource Planning</div>
            <div className="qpd-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              sales@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="qpd-doc-box">
            <div className="qpd-doc-title">Penawaran Penjualan</div>
            <div className="qpd-doc-number">{data.nomor}</div>
          </div>
        </section>

        <section className="qpd-info-grid">
          <div className="qpd-panel">
            <div className="qpd-panel-title">Ditujukan Kepada</div>
            <div className="qpd-panel-body">
              <div className="qpd-customer-name">{data.pelanggan || "-"}</div>
              <div className="qpd-muted">{data.alamat || "-"}</div>
            </div>
          </div>
          <div className="qpd-panel">
            <div className="qpd-panel-title">Informasi Dokumen</div>
            <div className="qpd-panel-body">
              <QpdMeta label="Tanggal" value={formatDate(data.tanggal)} />
              <QpdMeta label="Status" value={String(data.status || "-")} />
              <QpdMeta label="Pajak" value={data.kenaPajak ? "Sudah termasuk PPN" : "Belum termasuk PPN"} />
            </div>
          </div>
        </section>

        <table className="qpd-table">
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Barang</th>
              <th className="qpd-center" style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "10%" }}>Satuan</th>
              <th className="qpd-right" style={{ width: "16%" }}>Harga</th>
              <th className="qpd-right" style={{ width: "12%" }}>Diskon</th>
              <th className="qpd-right" style={{ width: "18%" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((item, index) => (
              <tr key={`${item.productId ?? index}-${index}`}>
                <td>
                  <strong>{index + 1}. {item.productName}</strong>
                  <div className="qpd-product-code">{item.productCode || "-"}</div>
                </td>
                <td className="qpd-center">{formatNumber(item.qty)}</td>
                <td>{item.satuan || "-"}</td>
                <td className="qpd-right">{formatNumber(item.harga)}</td>
                <td className="qpd-right">{item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}</td>
                <td className="qpd-right"><strong>{formatNumber(item.totalHarga)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="qpd-bottom-grid">
          <div className="qpd-terbilang">
            <strong>Terbilang</strong>
            {terbilang(data.subtotal)}
          </div>
          <div className="qpd-summary">
            <QpdSummary label="Subtotal" value={formatNumber(grossTotal)} />
            <QpdSummary label="Diskon" value={formatNumber(data.discountTotal)} />
            <QpdSummary label="PPN" value={formatNumber(data.taxTotal)} />
            <div className="qpd-summary-row qpd-grand">
              <span>Total Penawaran</span>
              <span>Rp {formatNumber(data.subtotal)}</span>
            </div>
          </div>
        </section>

        <section className="qpd-signatures">
          <div>
            <p>Dibuat oleh,</p>
            <div className="qpd-signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Disetujui oleh,</p>
            <div className="qpd-signature-line">Customer</div>
          </div>
        </section>

        <div className="qpd-footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP. Penawaran ini berlaku sesuai syarat & ketentuan yang berlaku.
        </div>
      </main>
    </div>
  );
}

function QpdMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="qpd-meta-row">
      <div className="qpd-meta-label">{label}</div>
      <div className="qpd-meta-value">{value}</div>
    </div>
  );
}

function QpdSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="qpd-summary-row">
      <span>{label}</span>
      <span>Rp {value}</span>
    </div>
  );
}
