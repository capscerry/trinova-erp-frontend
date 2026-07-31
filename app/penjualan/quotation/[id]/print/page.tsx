"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  salesQuotationService,
  type SalesQuotationDetail,
} from "@/lib/services/penjualan.service";
import { QuotationPrintDocument } from "@/components/modules/penjualan/QuotationPrintDocument";

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function SalesQuotationPrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<SalesQuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    salesQuotationService
      .getFullDetailById(id)
      .then(setData)
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="screen-state">Memuat dokumen...</div>;
  if (error || !data) return <div className="screen-state error">{error || "Data tidak ditemukan"}</div>;

  return (
    <>
      {/* Tampilan dokumen sendiri sudah ada di QuotationPrintDocument (class
          ber-prefix "qpd-"). Di sini tinggal gaya layar (toolbar, background
          abu-abu) & override saat @media print. */}
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { background: #edf1f5; font-family: Arial, Helvetica, sans-serif; }
        .screen-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; }
        .screen-state.error { color: #dc2626; }
        .toolbar { position: fixed; right: 18px; top: 18px; z-index: 10; display: flex; flex-direction: column; gap: 8px; }
        .toolbar button { border: 0; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; padding: 9px 18px; }
        .btn-print { background: #0d1b2a; color: #e8d08a; }
        .btn-close { background: #ffffff; color: #334155; border: 1px solid #dbe3ea !important; }
        .qpd-page { margin: 18px auto; box-shadow: 0 24px 70px rgba(15, 23, 42, .15); }
        @page { size: A4; margin: 0; }
        @media print {
          body { background: #fff; }
          .toolbar { display: none !important; }
          .qpd-page { box-shadow: none; margin: 0; min-height: 297mm; width: 210mm; }
        }
      `}</style>

      <div className="toolbar">
        <button className="btn-print" onClick={() => window.print()}>Print / Save PDF</button>
        <button className="btn-close" onClick={() => window.close()}>Tutup</button>
      </div>

      <QuotationPrintDocument data={data} />
    </>
  );
}
