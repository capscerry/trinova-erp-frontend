import type { SalesOrderDetail, SalesOrderDetailItem } from "@/lib/services/penjualan.service";

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
// Dipakai di app/penjualan/order/[id]/print/page.tsx — tampilan cetak Sales
// Order. Class di-prefix "sop-" (Sales Order Print). Gaya visual disamakan
// persis dengan InvoicePrintDocument/PurchaseOrderPrintDocument/
// QuotationPrintDocument supaya seluruh dokumen lintas-modul terasa satu
// identitas perusahaan.

interface Props {
  data: SalesOrderDetail;
}

export function SalesOrderPrintDocument({ data }: Props) {
  // total (data.total) adalah grand total final dari API -- sudah dikurangi
  // diskon, ditambah pajak. grossTotal direkonstruksi untuk baris "Subtotal".
  const grossTotal = data.total + data.discountTotal - data.taxTotal;

  return (
    <div className="sop-root">
      <style>{`
        .sop-root, .sop-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .sop-root {
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #fff;
        }
        .sop-page { width: 210mm; min-height: 297mm; background: #fff; padding: 13mm 14mm; }
        .sop-brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .sop-brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .sop-company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .sop-company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .sop-company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .sop-doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .sop-doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .sop-doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .sop-info-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; margin-top: 18px; }
        .sop-panel { border: 1px solid #dbe3ea; border-radius: 10px; overflow: hidden; }
        .sop-panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .sop-panel-body { padding: 11px 12px; }
        .sop-customer-name { color: #0d1b2a; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .sop-muted { color: #64748b; line-height: 1.5; }
        .sop-meta-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 4px 0; }
        .sop-meta-label { color: #64748b; }
        .sop-meta-value { color: #172033; font-weight: 700; text-align: right; }
        .sop-table { border-collapse: collapse; margin-top: 18px; width: 100%; }
        .sop-table thead th { background: #0d1b2a; color: #fff; font-size: 10px; letter-spacing: .6px; padding: 9px 8px; text-align: left; text-transform: uppercase; }
        .sop-table tbody td { border-bottom: 1px solid #e6edf3; color: #26384d; padding: 9px 8px; vertical-align: top; }
        .sop-right { text-align: right; }
        .sop-center { text-align: center; }
        .sop-product-code { color: #94a3b8; font-size: 10px; margin-top: 3px; }
        .sop-bottom-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-top: 18px; }
        .sop-terbilang { background: #f8fafc; border: 1px solid #dbe3ea; border-radius: 10px; color: #334155; line-height: 1.6; padding: 12px; }
        .sop-terbilang strong { color: #0d1b2a; display: block; font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .sop-summary { border: 1px solid #dbe3ea; border-radius: 10px; padding: 10px 12px; }
        .sop-summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .sop-summary-row span:first-child { color: #64748b; }
        .sop-summary-row span:last-child { color: #172033; font-weight: 700; }
        .sop-grand { border-top: 2px solid #0d1b2a; margin-top: 6px; padding-top: 9px; }
        .sop-grand span { color: #0d1b2a !important; font-size: 15px; font-weight: 900 !important; }
        .sop-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 36px; text-align: center; }
        .sop-signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .sop-footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
      `}</style>

      <main className="sop-page">
        <section className="sop-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="sop-brand-logo" />
          <div>
            <div className="sop-company-title">TRINOVA</div>
            <div className="sop-company-sub">Enterprise Resource Planning</div>
            <div className="sop-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              sales@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="sop-doc-box">
            <div className="sop-doc-title">Pesanan Penjualan</div>
            <div className="sop-doc-number">{data.nomor}</div>
          </div>
        </section>

        <section className="sop-info-grid">
          <div className="sop-panel">
            <div className="sop-panel-title">Ditujukan Kepada</div>
            <div className="sop-panel-body">
              <div className="sop-customer-name">{data.pelanggan || "-"}</div>
              <div className="sop-muted">{data.alamat || "-"}</div>
            </div>
          </div>
          <div className="sop-panel">
            <div className="sop-panel-title">Informasi Dokumen</div>
            <div className="sop-panel-body">
              <SopMeta label="Tanggal" value={formatDate(data.tanggal)} />
              <SopMeta label="No PO" value={data.poNumber || "-"} />
              <SopMeta label="No Quotation" value={data.quotationNumber || "-"} />
              <SopMeta label="Status" value={String(data.status || "-")} />
            </div>
          </div>
        </section>

        <table className="sop-table">
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Barang</th>
              <th className="sop-center" style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "10%" }}>Satuan</th>
              <th className="sop-right" style={{ width: "16%" }}>Harga</th>
              <th className="sop-right" style={{ width: "12%" }}>Diskon</th>
              <th className="sop-right" style={{ width: "18%" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((item: SalesOrderDetailItem, index: number) => (
              <tr key={`${item.productId ?? index}-${index}`}>
                <td>
                  <strong>{index + 1}. {item.productName}</strong>
                  <div className="sop-product-code">{item.productCode || "-"}</div>
                </td>
                <td className="sop-center">{formatNumber(item.productQty)}</td>
                <td>{item.uomCode || "-"}</td>
                <td className="sop-right">{formatNumber(item.productPrice)}</td>
                <td className="sop-right">{item.productDiscount > 0 ? `${item.productDiscount}%` : "-"}</td>
                <td className="sop-right"><strong>{formatNumber(item.totalPrice)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="sop-bottom-grid">
          <div className="sop-terbilang">
            <strong>Terbilang</strong>
            {terbilang(data.total)}
          </div>
          <div className="sop-summary">
            <SopSummary label="Subtotal" value={formatNumber(grossTotal)} />
            <SopSummary label="Diskon" value={formatNumber(data.discountTotal)} />
            <SopSummary label="PPN" value={formatNumber(data.taxTotal)} />
            <div className="sop-summary-row sop-grand">
              <span>Total Pesanan</span>
              <span>Rp {formatNumber(data.total)}</span>
            </div>
          </div>
        </section>

        <section className="sop-signatures">
          <div>
            <p>Dibuat oleh,</p>
            <div className="sop-signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Disetujui oleh,</p>
            <div className="sop-signature-line">Customer</div>
          </div>
        </section>

        <div className="sop-footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP. Mohon konfirmasi pesanan ini sebelum diproses.
        </div>
      </main>
    </div>
  );
}

function SopMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="sop-meta-row">
      <div className="sop-meta-label">{label}</div>
      <div className="sop-meta-value">{value}</div>
    </div>
  );
}

function SopSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="sop-summary-row">
      <span>{label}</span>
      <span>Rp {value}</span>
    </div>
  );
}
