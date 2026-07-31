import type { SalesInvoiceFullDetail } from "@/lib/services/sales-invoice.service";

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
//  1. app/penjualan/invoice/[id]/print/page.tsx  — tampilan cetak di layar
//  2. lib/pdf/invoicePdf.tsx                      — di-render off-screen lalu
//     ditangkap html2canvas untuk dijadikan lampiran PDF email
//
// Semua class di-prefix "sip-" (Sales Invoice Print) supaya aman dipasang
// di tengah halaman lain tanpa bentrok dengan class Tailwind/komponen lain.

interface Props {
  data: SalesInvoiceFullDetail;
}

export function InvoicePrintDocument({ data }: Props) {
  const grossTotal = data.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.price),
    0
  );

  return (
    <div className="sip-root">
      <style>{`
        .sip-root, .sip-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .sip-root {
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #fff;
        }
        .sip-page { width: 210mm; min-height: 297mm; background: #fff; padding: 13mm 14mm; }
        .sip-brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .sip-brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .sip-company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .sip-company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .sip-company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .sip-doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .sip-doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .sip-doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .sip-info-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; margin-top: 18px; }
        .sip-panel { border: 1px solid #dbe3ea; border-radius: 10px; overflow: hidden; }
        .sip-panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .sip-panel-body { padding: 11px 12px; }
        .sip-customer-name { color: #0d1b2a; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .sip-muted { color: #64748b; line-height: 1.5; }
        .sip-meta-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 4px 0; }
        .sip-meta-label { color: #64748b; }
        .sip-meta-value { color: #172033; font-weight: 700; text-align: right; }
        .sip-table { border-collapse: collapse; margin-top: 18px; width: 100%; }
        .sip-table thead th { background: #0d1b2a; color: #fff; font-size: 10px; letter-spacing: .6px; padding: 9px 8px; text-align: left; text-transform: uppercase; }
        .sip-table tbody td { border-bottom: 1px solid #e6edf3; color: #26384d; padding: 9px 8px; vertical-align: top; }
        .sip-right { text-align: right; }
        .sip-center { text-align: center; }
        .sip-product-code { color: #94a3b8; font-size: 10px; margin-top: 3px; }
        .sip-bottom-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-top: 18px; }
        .sip-terbilang { background: #f8fafc; border: 1px solid #dbe3ea; border-radius: 10px; color: #334155; line-height: 1.6; padding: 12px; }
        .sip-terbilang strong { color: #0d1b2a; display: block; font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .sip-summary { border: 1px solid #dbe3ea; border-radius: 10px; padding: 10px 12px; }
        .sip-summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .sip-summary-row span:first-child { color: #64748b; }
        .sip-summary-row span:last-child { color: #172033; font-weight: 700; }
        .sip-grand { border-top: 2px solid #0d1b2a; margin-top: 6px; padding-top: 9px; }
        .sip-grand span { color: #0d1b2a !important; font-size: 15px; font-weight: 900 !important; }
        .sip-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 36px; text-align: center; }
        .sip-signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .sip-footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
      `}</style>

      <main className="sip-page">
        <section className="sip-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="sip-brand-logo" />
          <div>
            <div className="sip-company-title">TRINOVA</div>
            <div className="sip-company-sub">Enterprise Resource Planning</div>
            <div className="sip-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              billing@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="sip-doc-box">
            <div className="sip-doc-title">Faktur Penjualan</div>
            <div className="sip-doc-number">{data.invoiceNumber}</div>
          </div>
        </section>

        <section className="sip-info-grid">
          <div className="sip-panel">
            <div className="sip-panel-title">Ditagihkan Kepada</div>
            <div className="sip-panel-body">
              <div className="sip-customer-name">{data.customerName || "-"}</div>
              <div className="sip-muted">Catatan: {data.notes || "-"}</div>
            </div>
          </div>
          <div className="sip-panel">
            <div className="sip-panel-title">Informasi Dokumen</div>
            <div className="sip-panel-body">
              <SipMeta label="Tanggal" value={formatDate(data.invoiceDate)} />
              <SipMeta label="Jatuh Tempo" value={formatDate(data.dueDate)} />
              <SipMeta label="No SO" value={data.salesOrderNumber || "-"} />
              <SipMeta label="No Kirim" value={data.deliveryOrderNumber || "-"} />
              <SipMeta label="Status" value={String(data.status || "-")} />
            </div>
          </div>
        </section>

        <table className="sip-table">
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Barang</th>
              <th className="sip-center" style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "10%" }}>Satuan</th>
              <th className="sip-right" style={{ width: "15%" }}>Harga</th>
              <th className="sip-right" style={{ width: "12%" }}>Diskon</th>
              <th className="sip-right" style={{ width: "10%" }}>PPN</th>
              <th className="sip-right" style={{ width: "15%" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={item.id}>
                <td>
                  <strong>{index + 1}. {item.productName || item.description}</strong>
                  <div className="sip-product-code">{item.productCode || "-"}</div>
                </td>
                <td className="sip-center">{formatNumber(item.quantity)}</td>
                <td>{item.uomName || "-"}</td>
                <td className="sip-right">{formatNumber(item.price)}</td>
                <td className="sip-right">{formatNumber(item.discount)}</td>
                <td className="sip-right">{formatNumber(item.tax)}</td>
                <td className="sip-right"><strong>{formatNumber(item.subtotal)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="sip-bottom-grid">
          <div className="sip-terbilang">
            <strong>Terbilang</strong>
            {terbilang(data.grandTotal)}
          </div>
          <div className="sip-summary">
            <SipSummary label="Subtotal" value={formatNumber(grossTotal)} />
            <SipSummary label="Diskon" value={formatNumber(data.discountTotal)} />
            <SipSummary label="PPN" value={formatNumber(data.taxTotal)} />
            <SipSummary label="Uang Muka" value={formatNumber(data.downPaymentAmount)} />
            <SipSummary label="Biaya Kirim" value={formatNumber(data.shippingCost)} />
            <div className="sip-summary-row sip-grand">
              <span>Total Faktur</span>
              <span>Rp {formatNumber(data.grandTotal)}</span>
            </div>
            <SipSummary label="Dibayar" value={formatNumber(data.paidAmount)} />
            <SipSummary label="Sisa Tagihan" value={formatNumber(data.remainingAmount)} />
          </div>
        </section>

        <section className="sip-signatures">
          <div>
            <p>Dibuat oleh,</p>
            <div className="sip-signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Diterima oleh,</p>
            <div className="sip-signature-line">Customer</div>
          </div>
        </section>

        <div className="sip-footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP. Simpan bukti pembayaran bersama faktur ini.
        </div>
      </main>
    </div>
  );
}

function SipMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="sip-meta-row">
      <div className="sip-meta-label">{label}</div>
      <div className="sip-meta-value">{value}</div>
    </div>
  );
}

function SipSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="sip-summary-row">
      <span>{label}</span>
      <span>Rp {value}</span>
    </div>
  );
}
