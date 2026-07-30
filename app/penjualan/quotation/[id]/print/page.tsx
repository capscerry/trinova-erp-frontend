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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">
        Memuat dokumen...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-red-500">
        {error ?? "Data tidak ditemukan"}
      </div>
    );
  }

  return (
    <>
      {/* ── Print/Toolbar CSS — tampilan dokumen sendiri sudah ada di dalam
           QuotationPrintDocument (class ber-prefix "qpd-"), di sini tinggal
           gaya layar (toolbar, background abu-abu) & override saat @media print. ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Arial&display=swap');

        html, body { margin: 0; padding: 0; }

        .toolbar {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 100;
        }
        .toolbar button {
          padding: 8px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-print  { background: #1e3a5f; color: #fff; }
        .btn-close  { background: #ef4444; color: #fff; }
        .btn-print:hover { background: #2d5a8e; }
        .btn-close:hover { background: #dc2626; }

        @media print {
          .toolbar { display: none !important; }
          body { margin: 0; }
          .qpd-page {
            width: 100%;
            padding: 8mm 10mm;
            margin: 0;
          }
        }

        @media screen {
          body { background: #e5e7eb; }
          .qpd-page {
            box-shadow: 0 4px 24px rgba(0,0,0,0.15);
            margin: 20px auto 40px;
          }
        }
      `}</style>

      {/* ── Toolbar (hanya layar) ─────────────────────────────────────────── */}
      <div className="toolbar">
        <button className="btn-print" onClick={() => window.print()}>
          🖨️ Cetak / Save PDF
        </button>
        <button className="btn-close" onClick={() => window.close()}>
          ✕ Tutup
        </button>
      </div>

      {/* ── Halaman Dokumen ───────────────────────────────────────────────── */}
      <QuotationPrintDocument data={data} />
    </>
  );
}
