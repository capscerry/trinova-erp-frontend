import type { UangMuka } from "@/lib/services/penjualan.service";

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
// Dipakai di app/penjualan/uang-muka/[id]/print/page.tsx. Class di-prefix
// "ump-" (Uang Muka Print). Gaya visual disamakan persis dengan
// InvoicePrintDocument/PurchaseOrderPrintDocument/SalesOrderPrintDocument.

interface Props {
  data: UangMuka;
}

export function UangMukaPrintDocument({ data }: Props) {
  const nominal = data.nominalUangMuka ?? 0;
  const tax = data.taxAmount ?? 0;
  const total = data.totalAmount ?? 0;

  return (
    <div className="ump-root">
      <style>{`
        .ump-root, .ump-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .ump-root {
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #fff;
        }
        .ump-page { width: 210mm; min-height: 297mm; background: #fff; padding: 13mm 14mm; }
        .ump-brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .ump-brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .ump-company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .ump-company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .ump-company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .ump-doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .ump-doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .ump-doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .ump-info-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; margin-top: 18px; }
        .ump-panel { border: 1px solid #dbe3ea; border-radius: 10px; overflow: hidden; }
        .ump-panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .ump-panel-body { padding: 11px 12px; }
        .ump-customer-name { color: #0d1b2a; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .ump-muted { color: #64748b; line-height: 1.5; }
        .ump-meta-row { display: grid; grid-template-columns: 108px 1fr; gap: 8px; padding: 4px 0; }
        .ump-meta-label { color: #64748b; }
        .ump-meta-value { color: #172033; font-weight: 700; text-align: right; }
        .ump-table { border-collapse: collapse; margin-top: 18px; width: 100%; }
        .ump-table thead th { background: #0d1b2a; color: #fff; font-size: 10px; letter-spacing: .6px; padding: 9px 8px; text-align: left; text-transform: uppercase; }
        .ump-table tbody td { border-bottom: 1px solid #e6edf3; color: #26384d; padding: 9px 8px; vertical-align: top; }
        .ump-right { text-align: right; }
        .ump-grand-row td { border-top: 2px solid #0d1b2a; border-bottom: none; color: #0d1b2a; font-size: 13px; font-weight: 900; padding-top: 11px; }
        .ump-bottom-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-top: 18px; }
        .ump-terbilang { background: #f8fafc; border: 1px solid #dbe3ea; border-radius: 10px; color: #334155; line-height: 1.6; padding: 12px; }
        .ump-terbilang strong { color: #0d1b2a; display: block; font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .ump-note { border: 1px solid #dbe3ea; border-radius: 10px; padding: 10px 12px; }
        .ump-note-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .ump-note-row span:first-child { color: #64748b; }
        .ump-note-row span:last-child { color: #172033; font-weight: 700; }
        .ump-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 36px; text-align: center; }
        .ump-signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .ump-footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
      `}</style>

      <main className="ump-page">
        <section className="ump-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="ump-brand-logo" />
          <div>
            <div className="ump-company-title">TRINOVA</div>
            <div className="ump-company-sub">Enterprise Resource Planning</div>
            <div className="ump-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              billing@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="ump-doc-box">
            <div className="ump-doc-title">Faktur Uang Muka</div>
            <div className="ump-doc-number">{data.noFaktur}</div>
          </div>
        </section>

        <section className="ump-info-grid">
          <div className="ump-panel">
            <div className="ump-panel-title">Ditagihkan Kepada</div>
            <div className="ump-panel-body">
              <div className="ump-customer-name">{data.customerName || "-"}</div>
              <div className="ump-muted">{data.alamat || "-"}</div>
            </div>
          </div>
          <div className="ump-panel">
            <div className="ump-panel-title">Informasi Dokumen</div>
            <div className="ump-panel-body">
              <UmpMeta label="Tanggal" value={formatDate(data.tanggal)} />
              <UmpMeta label="No SO" value={data.nomorSo || "-"} />
              <UmpMeta label="No PO" value={data.noPO || "-"} />
              <UmpMeta label="Syarat Bayar" value={data.syaratPembayaran || "-"} />
              <UmpMeta label="Status" value={String(data.status || "-")} />
            </div>
          </div>
        </section>

        <table className="ump-table">
          <thead>
            <tr>
              <th style={{ width: "70%" }}>Keterangan</th>
              <th className="ump-right" style={{ width: "30%" }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Uang Muka atas pesanan {data.nomorSo || "-"}</td>
              <td className="ump-right">{formatNumber(nominal)}</td>
            </tr>
            <tr>
              <td>PPN {data.isTaxable ? "(11%)" : "(0%)"}</td>
              <td className="ump-right">{formatNumber(tax)}</td>
            </tr>
            <tr className="ump-grand-row">
              <td>Total Tagihan</td>
              <td className="ump-right">Rp {formatNumber(total)}</td>
            </tr>
          </tbody>
        </table>

        <section className="ump-bottom-grid">
          <div className="ump-terbilang">
            <strong>Terbilang</strong>
            {terbilang(total)}
          </div>
          <div className="ump-note">
            <div className="ump-note-row">
              <span>Status Pajak</span>
              <span>{data.isTaxable ? "Kena Pajak" : "Tidak Kena Pajak"}</span>
            </div>
            <div className="ump-note-row">
              <span>Harga</span>
              <span>{data.isTaxIncluded ? "Termasuk pajak" : "Belum termasuk pajak"}</span>
            </div>
            {data.keterangan && (
              <div className="ump-note-row">
                <span>Keterangan</span>
                <span>{data.keterangan}</span>
              </div>
            )}
          </div>
        </section>

        <section className="ump-signatures">
          <div>
            <p>Dibuat oleh,</p>
            <div className="ump-signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Diterima oleh,</p>
            <div className="ump-signature-line">Customer</div>
          </div>
        </section>

        <div className="ump-footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP. Simpan bukti pembayaran bersama faktur ini.
        </div>
      </main>
    </div>
  );
}

function UmpMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="ump-meta-row">
      <div className="ump-meta-label">{label}</div>
      <div className="ump-meta-value">{value}</div>
    </div>
  );
}
