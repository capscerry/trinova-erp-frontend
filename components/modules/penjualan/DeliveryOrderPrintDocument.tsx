import type { PengirimanPenjualanFullDetail } from "@/lib/services/pengiriman-penjualan.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
// Dipakai di app/penjualan/pengiriman-penjualan/[id]/print/page.tsx. Class
// di-prefix "dop-" (Delivery Order Print). Gaya visual disamakan persis
// dengan InvoicePrintDocument/PurchaseOrderPrintDocument/
// SalesOrderPrintDocument.

interface Props {
  data: PengirimanPenjualanFullDetail;
}

export function DeliveryOrderPrintDocument({ data }: Props) {
  return (
    <div className="dop-root">
      <style>{`
        .dop-root, .dop-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .dop-root {
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #fff;
        }
        .dop-page { width: 210mm; min-height: 297mm; background: #fff; padding: 13mm 14mm; }
        .dop-brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .dop-brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .dop-company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .dop-company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .dop-company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .dop-doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .dop-doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .dop-doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .dop-info-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; margin-top: 18px; }
        .dop-panel { border: 1px solid #dbe3ea; border-radius: 10px; overflow: hidden; }
        .dop-panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .dop-panel-body { padding: 11px 12px; }
        .dop-customer-name { color: #0d1b2a; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .dop-muted { color: #64748b; line-height: 1.5; }
        .dop-meta-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 4px 0; }
        .dop-meta-label { color: #64748b; }
        .dop-meta-value { color: #172033; font-weight: 700; text-align: right; }
        .dop-table { border-collapse: collapse; margin-top: 18px; width: 100%; }
        .dop-table thead th { background: #0d1b2a; color: #fff; font-size: 10px; letter-spacing: .6px; padding: 9px 8px; text-align: left; text-transform: uppercase; }
        .dop-table tbody td { border-bottom: 1px solid #e6edf3; color: #26384d; padding: 9px 8px; vertical-align: top; }
        .dop-right { text-align: right; }
        .dop-product-code { color: #94a3b8; font-size: 10px; margin-top: 3px; }
        .dop-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 44px; text-align: center; }
        .dop-signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .dop-footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
      `}</style>

      <main className="dop-page">
        <section className="dop-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="dop-brand-logo" />
          <div>
            <div className="dop-company-title">TRINOVA</div>
            <div className="dop-company-sub">Enterprise Resource Planning</div>
            <div className="dop-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              logistik@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="dop-doc-box">
            <div className="dop-doc-title">Surat Jalan</div>
            <div className="dop-doc-number">{data.noSuratJalan}</div>
          </div>
        </section>

        <section className="dop-info-grid">
          <div className="dop-panel">
            <div className="dop-panel-title">Dikirim Kepada</div>
            <div className="dop-panel-body">
              <div className="dop-customer-name">{data.pelanggan || "-"}</div>
              <div className="dop-muted">{data.alamatPengiriman || "-"}</div>
            </div>
          </div>
          <div className="dop-panel">
            <div className="dop-panel-title">Informasi Dokumen</div>
            <div className="dop-panel-body">
              <DopMeta label="Tanggal" value={formatDate(data.tanggalKirim)} />
              <DopMeta label="No SO" value={data.noSo || "-"} />
              <DopMeta label="No PO" value={data.noPO || "-"} />
              <DopMeta label="Pengiriman" value={data.shippingType || "-"} />
              <DopMeta label="Status" value={String(data.status || "-")} />
            </div>
          </div>
        </section>

        <table className="dop-table">
          <thead>
            <tr>
              <th style={{ width: "46%" }}>Barang</th>
              <th style={{ width: "18%" }}>Satuan</th>
              <th className="dop-right" style={{ width: "18%" }}>Qty Pesan</th>
              <th className="dop-right" style={{ width: "18%" }}>Qty Kirim</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={`${item.productId}-${item.productCode ?? index}`}>
                <td>
                  <strong>{item.productName}</strong>
                  <div className="dop-product-code">{item.productCode || "-"}</div>
                </td>
                <td>{item.satuan || "-"}</td>
                <td className="dop-right">{item.qtyDipesan}</td>
                <td className="dop-right"><strong>{item.qtyDikirim}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="dop-signatures">
          <div>
            <p>Dikirim oleh,</p>
            <div className="dop-signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Diterima oleh,</p>
            <div className="dop-signature-line">Customer</div>
          </div>
        </section>

        <div className="dop-footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP. Mohon periksa kesesuaian barang saat penerimaan.
        </div>
      </main>
    </div>
  );
}

function DopMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="dop-meta-row">
      <div className="dop-meta-label">{label}</div>
      <div className="dop-meta-value">{value}</div>
    </div>
  );
}
