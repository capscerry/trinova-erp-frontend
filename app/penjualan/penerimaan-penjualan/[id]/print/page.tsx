"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  penerimaanPenjualanService,
  type PenerimaanPenjualan,
} from "@/lib/services/penjualan.service";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(date);
};

export default function PenerimaanPrintPage() {
  const id = useParams()?.id as string;
  const [data, setData] = useState<PenerimaanPenjualan | null>(null);

  useEffect(() => {
    if (!id) return;
    penerimaanPenjualanService.getById(id).then(setData);
  }, [id]);

  if (!data) return <div className="screen-state">Memuat dokumen...</div>;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #edf1f5; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
        .screen-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #64748b; }
        .toolbar { position: fixed; right: 18px; top: 18px; display: flex; flex-direction: column; gap: 8px; }
        .toolbar button { border: 0; border-radius: 8px; cursor: pointer; font-weight: 700; padding: 9px 18px; }
        .btn-print { background: #0d1b2a; color: #e8d08a; }
        .btn-close { background: #fff; color: #334155; border: 1px solid #dbe3ea !important; }
        .page { width: 210mm; min-height: 297mm; margin: 18px auto; background: #fff; padding: 13mm 14mm; box-shadow: 0 24px 70px rgba(15,23,42,.15); }
        .brand { display: grid; grid-template-columns: 82px 1fr 220px; gap: 18px; border-bottom: 3px solid #0d1b2a; padding-bottom: 16px; }
        .brand-logo { width: 76px; height: 76px; object-fit: contain; }
        .company-title { color: #0d1b2a; font-size: 25px; font-weight: 800; letter-spacing: 5px; }
        .company-sub { color: #c9a84c; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .doc-box { border: 1px solid #dbe3ea; border-radius: 10px; padding: 12px; text-align: right; }
        .doc-title { color: #0d1b2a; font-size: 18px; font-weight: 800; text-transform: uppercase; }
        .doc-number { color: #c9a84c; font-size: 12px; font-weight: 800; margin-top: 6px; }
        .panel { border: 1px solid #dbe3ea; border-radius: 10px; margin-top: 18px; padding: 14px; }
        .row { display: flex; justify-content: space-between; border-bottom: 1px solid #edf2f7; padding: 10px 0; }
        .row:last-child { border-bottom: 0; }
        .row span:first-child { color: #64748b; }
        .row span:last-child { color: #172033; font-weight: 800; }
        .amount { background: #0d1b2a; border-radius: 12px; color: #e8d08a; font-size: 22px; font-weight: 900; margin-top: 18px; padding: 18px; text-align: right; }
        .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 90px; margin-top: 52px; text-align: center; }
        .signature-line { border-top: 1px solid #0d1b2a; margin-top: 58px; padding-top: 8px; font-weight: 700; }
        @page { size: A4; margin: 0; }
        @media print { body { background: #fff; } .toolbar { display: none; } .page { margin: 0; box-shadow: none; } }
      `}</style>
      <div className="toolbar"><button className="btn-print" onClick={() => window.print()}>Print / Save PDF</button><button className="btn-close" onClick={() => window.close()}>Tutup</button></div>
      <main className="page">
        <section className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="brand-logo" />
          <div><div className="company-title">TRINOVA</div><div className="company-sub">Enterprise Resource Planning</div></div>
          <div className="doc-box"><div className="doc-title">Bukti Penerimaan</div><div className="doc-number">{data.noBukti}</div></div>
        </section>
        <section className="panel">
          <Meta label="Tanggal Bayar" value={formatDate(data.tanggalBayar)} />
          <Meta label="Terima Dari" value={data.pelanggan || "-"} />
          <Meta label="Bank" value={data.bank || "-"} />
          <Meta label="Referensi SO" value={data.salesOrderId ? String(data.salesOrderId) : "-"} />
          <Meta label="Referensi Uang Muka" value={data.uangMukaId ? String(data.uangMukaId) : "-"} />
        </section>
        <div className="amount">Rp {formatRupiah(data.nilaiPembayaran)}</div>
        <section className="signatures"><div><p>Dibuat oleh,</p><div className="signature-line">TRINOVA</div></div><div><p>Diterima oleh,</p><div className="signature-line">Customer</div></div></section>
      </main>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="row"><span>{label}</span><span>{value}</span></div>;
}
