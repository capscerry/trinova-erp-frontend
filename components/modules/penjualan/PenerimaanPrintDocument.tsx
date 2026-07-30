import type { PenerimaanPenjualan } from "@/lib/services/penjualan.service";

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
// Dipakai di app/penjualan/penerimaan-penjualan/[id]/print/page.tsx. Class
// di-prefix "pnp-" (Penerimaan Print). Gaya visual disamakan persis dengan
// InvoicePrintDocument/PurchaseOrderPrintDocument/SalesOrderPrintDocument.

interface Props {
  data: PenerimaanPenjualan;
}

export function PenerimaanPrintDocument({ data }: Props) {
  return (
    <div className="pnp-root">
      <style>{`
        .pnp-root, .pnp-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .pnp-root {
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #fff;
        }
        .pnp-page { width: 210mm; min-height: 297mm; background: #fff; padding: 13mm 14mm; }
        .pnp-brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .pnp-brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .pnp-company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .pnp-company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .pnp-company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .pnp-doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .pnp-doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .pnp-doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .pnp-panel { border: 1px solid #dbe3ea; border-radius: 10px; margin-top: 18px; overflow: hidden; }
        .pnp-panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .pnp-panel-body { padding: 4px 12px; }
        .pnp-row { display: flex; justify-content: space-between; border-bottom: 1px solid #edf2f7; padding: 9px 0; }
        .pnp-row:last-child { border-bottom: 0; }
        .pnp-row span:first-child { color: #64748b; }
        .pnp-row span:last-child { color: #172033; font-weight: 700; }
        .pnp-amount { background: #0d1b2a; border-radius: 10px; color: #e8d08a; font-size: 22px; font-weight: 900; margin-top: 18px; padding: 18px; text-align: right; }
        .pnp-terbilang { background: #f8fafc; border: 1px solid #dbe3ea; border-radius: 10px; color: #334155; line-height: 1.6; margin-top: 16px; padding: 12px; }
        .pnp-terbilang strong { color: #0d1b2a; display: block; font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .pnp-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 40px; text-align: center; }
        .pnp-signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .pnp-footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
      `}</style>

      <main className="pnp-page">
        <section className="pnp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="pnp-brand-logo" />
          <div>
            <div className="pnp-company-title">TRINOVA</div>
            <div className="pnp-company-sub">Enterprise Resource Planning</div>
            <div className="pnp-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              billing@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="pnp-doc-box">
            <div className="pnp-doc-title">Bukti Penerimaan</div>
            <div className="pnp-doc-number">{data.noBukti}</div>
          </div>
        </section>

        <div className="pnp-panel">
          <div className="pnp-panel-title">Detail Pembayaran</div>
          <div className="pnp-panel-body">
            <div className="pnp-row"><span>Tanggal Bayar</span><span>{formatDate(data.tanggalBayar)}</span></div>
            <div className="pnp-row"><span>Terima Dari</span><span>{data.pelanggan || "-"}</span></div>
            <div className="pnp-row"><span>Bank</span><span>{data.bank || "-"}</span></div>
            <div className="pnp-row"><span>Referensi SO</span><span>{data.salesOrderNumber || (data.salesOrderId ? String(data.salesOrderId) : "-")}</span></div>
            <div className="pnp-row"><span>Referensi Uang Muka</span><span>{data.uangMukaNumber || (data.uangMukaId ? String(data.uangMukaId) : "-")}</span></div>
          </div>
        </div>

        <div className="pnp-amount">Rp {formatNumber(data.nilaiPembayaran)}</div>

        <div className="pnp-terbilang">
          <strong>Terbilang</strong>
          {terbilang(data.nilaiPembayaran)}
        </div>

        <section className="pnp-signatures">
          <div>
            <p>Dibuat oleh,</p>
            <div className="pnp-signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Diterima oleh,</p>
            <div className="pnp-signature-line">Customer</div>
          </div>
        </section>

        <div className="pnp-footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP sebagai bukti sah penerimaan pembayaran.
        </div>
      </main>
    </div>
  );
}
