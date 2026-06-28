"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  salesInvoiceService,
  type SalesInvoiceFullDetail,
} from "@/lib/services/sales-invoice.service";

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

export default function SalesInvoicePrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<SalesInvoiceFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    salesInvoiceService
      .getFullDetailById(id)
      .then(setData)
      .catch((err) => {
        console.error("Gagal memuat print faktur:", err);
        setError("Gagal memuat dokumen faktur.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="screen-state">Memuat dokumen...</div>;
  if (error || !data) return <div className="screen-state error">{error || "Data faktur tidak ditemukan."}</div>;

  const grossTotal = data.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #edf1f5; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
        .screen-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; }
        .screen-state.error { color: #dc2626; }
        .toolbar { position: fixed; right: 18px; top: 18px; z-index: 10; display: flex; flex-direction: column; gap: 8px; }
        .toolbar button { border: 0; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; padding: 9px 18px; }
        .btn-print { background: #0d1b2a; color: #e8d08a; }
        .btn-close { background: #ffffff; color: #334155; border: 1px solid #dbe3ea !important; }
        .page { width: 210mm; min-height: 297mm; margin: 18px auto; background: #fff; padding: 13mm 14mm; box-shadow: 0 24px 70px rgba(15, 23, 42, .15); }
        .brand { display: grid; grid-template-columns: 92px 1fr 190px; gap: 18px; align-items: start; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .brand-logo { width: 82px; height: 82px; object-fit: contain; }
        .company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; line-height: 1; }
        .company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; margin-top: 7px; text-transform: uppercase; }
        .company-address { color: #526273; font-size: 10px; line-height: 1.5; margin-top: 8px; }
        .doc-box { border: 1px solid #d7e0e8; border-radius: 10px; padding: 12px; text-align: right; }
        .doc-title { color: #0d1b2a; font-size: 19px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .info-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 14px; margin-top: 18px; }
        .panel { border: 1px solid #dbe3ea; border-radius: 10px; overflow: hidden; }
        .panel-title { background: #f5f7fa; border-bottom: 1px solid #dbe3ea; color: #526273; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 8px 10px; text-transform: uppercase; }
        .panel-body { padding: 11px 12px; }
        .customer-name { color: #0d1b2a; font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .muted { color: #64748b; line-height: 1.5; }
        .meta-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 4px 0; }
        .meta-label { color: #64748b; }
        .meta-value { color: #172033; font-weight: 700; text-align: right; }
        table { border-collapse: collapse; margin-top: 18px; width: 100%; }
        thead th { background: #0d1b2a; color: #fff; font-size: 10px; letter-spacing: .6px; padding: 9px 8px; text-align: left; text-transform: uppercase; }
        tbody td { border-bottom: 1px solid #e6edf3; color: #26384d; padding: 9px 8px; vertical-align: top; }
        .right { text-align: right; }
        .center { text-align: center; }
        .product-code { color: #94a3b8; font-size: 10px; margin-top: 3px; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-top: 18px; }
        .terbilang { background: #f8fafc; border: 1px solid #dbe3ea; border-radius: 10px; color: #334155; line-height: 1.6; padding: 12px; }
        .terbilang strong { color: #0d1b2a; display: block; font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .summary { border: 1px solid #dbe3ea; border-radius: 10px; padding: 10px 12px; }
        .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .summary-row span:first-child { color: #64748b; }
        .summary-row span:last-child { color: #172033; font-weight: 700; }
        .grand { border-top: 2px solid #0d1b2a; margin-top: 6px; padding-top: 9px; }
        .grand span { color: #0d1b2a !important; font-size: 15px; font-weight: 900 !important; }
        .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 36px; text-align: center; }
        .signature-line { border-top: 1px solid #0d1b2a; color: #526273; font-weight: 700; margin-top: 58px; padding-top: 8px; }
        .footer-note { border-top: 1px solid #dbe3ea; color: #94a3b8; font-size: 9px; margin-top: 26px; padding-top: 10px; text-align: center; }
        @page { size: A4; margin: 0; }
        @media print { body { background: #fff; } .toolbar { display: none !important; } .page { box-shadow: none; margin: 0; min-height: 297mm; width: 210mm; } }
      `}</style>

      <div className="toolbar">
        <button className="btn-print" onClick={() => window.print()}>Print / Save PDF</button>
        <button className="btn-close" onClick={() => window.close()}>Tutup</button>
      </div>

      <main className="page">
        <section className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="brand-logo" />
          <div>
            <div className="company-title">TRINOVA</div>
            <div className="company-sub">Enterprise Resource Planning</div>
            <div className="company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              billing@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="doc-box">
            <div className="doc-title">Faktur Penjualan</div>
            <div className="doc-number">{data.invoiceNumber}</div>
          </div>
        </section>

        <section className="info-grid">
          <div className="panel">
            <div className="panel-title">Ditagihkan Kepada</div>
            <div className="panel-body">
              <div className="customer-name">{data.customerName || "-"}</div>
              <div className="muted">Catatan: {data.notes || "-"}</div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">Informasi Dokumen</div>
            <div className="panel-body">
              <Meta label="Tanggal" value={formatDate(data.invoiceDate)} />
              <Meta label="Jatuh Tempo" value={formatDate(data.dueDate)} />
              <Meta label="No SO" value={data.salesOrderNumber || "-"} />
              <Meta label="No Kirim" value={data.deliveryOrderNumber || "-"} />
              <Meta label="Status" value={String(data.status || "-")} />
            </div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Barang</th>
              <th className="center" style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "10%" }}>Satuan</th>
              <th className="right" style={{ width: "15%" }}>Harga</th>
              <th className="right" style={{ width: "12%" }}>Diskon</th>
              <th className="right" style={{ width: "10%" }}>PPN</th>
              <th className="right" style={{ width: "15%" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={item.id}>
                <td>
                  <strong>{index + 1}. {item.productName || item.description}</strong>
                  <div className="product-code">{item.productCode || "-"}</div>
                </td>
                <td className="center">{formatNumber(item.quantity)}</td>
                <td>{item.uomName || "-"}</td>
                <td className="right">{formatNumber(item.price)}</td>
                <td className="right">{formatNumber(item.discount)}</td>
                <td className="right">{formatNumber(item.tax)}</td>
                <td className="right"><strong>{formatNumber(item.subtotal)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="bottom-grid">
          <div className="terbilang">
            <strong>Terbilang</strong>
            {terbilang(data.grandTotal)}
          </div>
          <div className="summary">
            <Summary label="Subtotal" value={formatNumber(grossTotal)} />
            <Summary label="Diskon" value={formatNumber(data.discountTotal)} />
            <Summary label="PPN" value={formatNumber(data.taxTotal)} />
            <Summary label="Uang Muka" value={formatNumber(data.downPaymentAmount)} />
            <Summary label="Biaya Kirim" value={formatNumber(data.shippingCost)} />
            <div className="summary-row grand">
              <span>Total Faktur</span>
              <span>Rp {formatNumber(data.grandTotal)}</span>
            </div>
            <Summary label="Dibayar" value={formatNumber(data.paidAmount)} />
            <Summary label="Sisa Tagihan" value={formatNumber(data.remainingAmount)} />
          </div>
        </section>

        <section className="signatures">
          <div>
            <p>Dibuat oleh,</p>
            <div className="signature-line">TRINOVA</div>
          </div>
          <div>
            <p>Diterima oleh,</p>
            <div className="signature-line">Customer</div>
          </div>
        </section>

        <div className="footer-note">
          Dokumen ini dicetak otomatis dari Trinova ERP. Simpan bukti pembayaran bersama faktur ini.
        </div>
      </main>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-row">
      <div className="meta-label">{label}</div>
      <div className="meta-value">{value}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <span>Rp {value}</span>
    </div>
  );
}
