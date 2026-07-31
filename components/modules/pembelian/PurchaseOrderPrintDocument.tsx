import type { PurchaseOrderPrintDetail } from "@/lib/services/purchase-order-print.service";

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

// ─── Komponen ─────────────────────────────────────────────────────────────────
// Dipakai di dua tempat:
//  1. app/pembelian/po/[id]/print/page.tsx   — tampilan cetak di layar
//  2. lib/pdf/purchaseOrderPdf.tsx            — di-render off-screen lalu
//     ditangkap html2canvas untuk dijadikan lampiran PDF email ke supplier
//
// Semua class di-prefix "pop-" (Purchase Order Print) supaya aman dipasang
// di tengah halaman lain tanpa bentrok dengan class Tailwind/komponen lain.
// Gaya visual sengaja disamakan dengan InvoicePrintDocument (modul Sales)
// supaya dokumen lintas-modul terasa satu identitas perusahaan.

interface Props {
  data: PurchaseOrderPrintDetail;
}

export function PurchaseOrderPrintDocument({ data }: Props) {
  const { header, supplier, details } = data;

  const itemsTotal = details.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const taxAmount = Number(header.tax_amount ?? 0);
  const grandTotal = Number(header.total_amount ?? itemsTotal + taxAmount);

  return (
    <div className="pop-root">
      <style>{`
        .pop-root, .pop-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .pop-root {
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #fff;
        }
        .pop-page { width: 210mm; min-height: 297mm; background: #fff; padding: 13mm 14mm; }
        .pop-brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .pop-brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .pop-company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .pop-company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .pop-company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .pop-doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .pop-doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .pop-doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .pop-info-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; margin-top: 18px; }
        .pop-panel { border: 1px solid #dbe3ea; border-radius: 10px; overflow: hidden; }
        .pop-panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .pop-panel-body { padding: 11px 12px; }
        .pop-supplier-name { color: #0d1b2a; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .pop-muted { color: #64748b; line-height: 1.5; }
        .pop-meta-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 4px 0; }
        .pop-meta-label { color: #64748b; }
        .pop-meta-value { color: #172033; font-weight: 700; text-align: right; }
        .pop-table { border-collapse: collapse; margin-top: 18px; width: 100%; }
        .pop-table thead th { background: #0d1b2a; color: #fff; font-size: 10px; letter-spacing: .6px; padding: 9px 8px; text-align: left; text-transform: uppercase; }
        .pop-table tbody td { border-bottom: 1px solid #e6edf3; color: #26384d; padding: 9px 8px; vertical-align: top; }
        .pop-right { text-align: right; }
        .pop-center { text-align: center; }
        .pop-product-code { color: #94a3b8; font-size: 10px; margin-top: 3px; }
        .pop-bottom-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-top: 18px; }
        .pop-note { background: #f8fafc; border: 1px solid #dbe3ea; border-radius: 10px; color: #334155; line-height: 1.6; padding: 12px; }
        .pop-note strong { color: #0d1b2a; display: block; font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .pop-summary { border: 1px solid #dbe3ea; border-radius: 10px; padding: 10px 12px; }
        .pop-summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .pop-summary-row span:first-child { color: #64748b; }
        .pop-summary-row span:last-child { color: #172033; font-weight: 700; }
        .pop-grand { border-top: 2px solid #0d1b2a; margin-top: 6px; padding-top: 9px; }
        .pop-grand span { color: #0d1b2a !important; font-size: 15px; font-weight: 900 !important; }
        .pop-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 36px; text-align: center; }
        .pop-signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .pop-footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
      `}</style>

      <main className="pop-page">
        <section className="pop-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="pop-brand-logo" />
          <div>
            <div className="pop-company-title">TRINOVA</div>
            <div className="pop-company-sub">Enterprise Resource Planning</div>
            <div className="pop-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              purchasing@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="pop-doc-box">
            <div className="pop-doc-title">Purchase Order</div>
            <div className="pop-doc-number">{header.po_number}</div>
          </div>
        </section>

        <section className="pop-info-grid">
          <div className="pop-panel">
            <div className="pop-panel-title">Ditujukan Kepada</div>
            <div className="pop-panel-body">
              <div className="pop-supplier-name">{supplier?.supplier_name || "-"}</div>
              <div className="pop-muted">
                {supplier?.alamat || "-"}<br />
                {supplier?.email || "-"} {supplier?.no_telp_bisnis ? `| ${supplier.no_telp_bisnis}` : ""}
              </div>
            </div>
          </div>
          <div className="pop-panel">
            <div className="pop-panel-title">Informasi Dokumen</div>
            <div className="pop-panel-body">
              <PopMeta label="Tanggal" value={formatDate(header.order_date)} />
              <PopMeta label="Ekspektasi Kirim" value={formatDate(header.expected_date)} />
              <PopMeta label="Status" value={String(header.status || "-")} />
              {header.nomor_faktur_pajak && (
                <PopMeta label="No. Faktur Pajak" value={header.nomor_faktur_pajak} />
              )}
            </div>
          </div>
        </section>

        <table className="pop-table">
          <thead>
            <tr>
              <th style={{ width: "36%" }}>Barang</th>
              <th className="pop-center" style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "10%" }}>Satuan</th>
              <th className="pop-right" style={{ width: "16%" }}>Harga</th>
              <th className="pop-right" style={{ width: "12%" }}>Pajak</th>
              <th className="pop-right" style={{ width: "16%" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {details.map((item, index) => (
              <tr key={`${item.productId}-${index}`}>
                <td>
                  <strong>{index + 1}. {item.productName || `Produk #${item.productId}`}</strong>
                  <div className="pop-product-code">{item.productCode || "-"}</div>
                </td>
                <td className="pop-center">{formatNumber(item.quantity)}</td>
                <td>{item.uomCode || "-"}</td>
                <td className="pop-right">{formatNumber(item.price)}</td>
                <td className="pop-right">{formatNumber(item.taxAmount ?? 0)}</td>
                <td className="pop-right"><strong>{formatNumber(item.subtotal)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="pop-bottom-grid">
          <div className="pop-note">
            <strong>Catatan</strong>
            {header.transaction_detail || header.transaction_name || "Mohon konfirmasi ketersediaan barang dan perkiraan tanggal kirim."}
          </div>
          <div className="pop-summary">
            <PopSummary label="Subtotal Barang" value={formatNumber(itemsTotal)} />
            <PopSummary
              label={`Pajak${header.tax_percentage ? ` (${header.tax_percentage}%)` : ""}`}
              value={formatNumber(taxAmount)}
            />
            <div className="pop-summary-row pop-grand">
              <span>Total PO</span>
              <span>Rp {formatNumber(grandTotal)}</span>
            </div>
          </div>
        </section>

        <section className="pop-signatures">
          <div>
            <p>Dibuat oleh,</p>
            <div className="pop-signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Disetujui oleh,</p>
            <div className="pop-signature-line">{supplier?.supplier_name || "Supplier"}</div>
          </div>
        </section>

        <div className="pop-footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP. Mohon konfirmasi penerimaan Purchase Order ini.
        </div>
      </main>
    </div>
  );
}

function PopMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="pop-meta-row">
      <div className="pop-meta-label">{label}</div>
      <div className="pop-meta-value">{value}</div>
    </div>
  );
}

function PopSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="pop-summary-row">
      <span>{label}</span>
      <span>Rp {value}</span>
    </div>
  );
}
