"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PURCHASE_PRINT_CSS } from "@/lib/print/purchasePrintStyles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GRItem {
  goods_receipt_detail_id?: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  uom_code?: string;
  price?: number;
  subtotal?: number;
}

interface GRData {
  goods_receipt_id: number;
  receipt_number: string;
  receipt_date: string;
  purchase_order_id?: number;
  po_number?: string;
  supplier_name?: string;
  supplier_id?: number;
  received_by?: string;
  status?: string;
  total_amount?: number;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
  items?: GRItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (v?: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(d);
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GRPrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<GRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/goods-receipt/${id}`)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setData(raw);
      })
      .catch((err) => {
        console.error("Gagal memuat GR untuk print:", err);
        setError("Gagal memuat dokumen Goods Receipt.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="pp-screen-state">Memuat dokumen...</div>;
  if (error || !data) return <div className="pp-screen-state error">{error || "Data Goods Receipt tidak ditemukan."}</div>;

  const items: GRItem[] = data.items ?? [];
  const itemsTotal = items.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);

  return (
    <>
      <style>{PURCHASE_PRINT_CSS}</style>

      <div className="pp-toolbar">
        <button className="pp-btn-print" onClick={() => window.print()}>⎙ Cetak / Save PDF</button>
        <button className="pp-btn-close" onClick={() => window.close()}>✕ Tutup</button>
      </div>

      <main className="pp-page">

        {/* ── Brand Header ── */}
        <section className="pp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trinova-logo.png" alt="Trinova" className="pp-brand-logo" />
          <div>
            <div className="pp-company-name">TRINOVA</div>
            <div className="pp-company-sub">Enterprise Resource Planning</div>
            <div className="pp-company-address">
              Jl. Trinova Business Center No. 1<br />
              Jakarta, Indonesia<br />
              purchasing@trinova.co.id | +62 21 0000 0000
            </div>
          </div>
          <div className="pp-doc-box">
            <div className="pp-doc-title">Goods Receipt</div>
            <div className="pp-doc-number">{data.receipt_number}</div>
            {data.status && <div className="pp-doc-status">{data.status}</div>}
          </div>
        </section>

        {/* ── Info Grid ── */}
        <section className="pp-info-grid">
          <div className="pp-panel">
            <div className="pp-panel-title">Informasi Penerimaan</div>
            <div className="pp-panel-body">
              <div className="pp-entity-name">{data.supplier_name || "-"}</div>
              <div className="pp-muted">
                {data.received_by ? `Diterima oleh: ${data.received_by}` : ""}
              </div>
            </div>
          </div>
          <div className="pp-panel">
            <div className="pp-panel-title">Informasi Dokumen</div>
            <div className="pp-panel-body">
              <div className="pp-meta-row"><div className="pp-meta-label">Tgl Terima</div><div className="pp-meta-value">{fmtDate(data.receipt_date)}</div></div>
              <div className="pp-meta-row"><div className="pp-meta-label">No. Receipt</div><div className="pp-meta-value">{data.receipt_number}</div></div>
              <div className="pp-meta-row"><div className="pp-meta-label">No. PO</div><div className="pp-meta-value">{data.po_number || "-"}</div></div>
              {data.nomor_faktur_pajak && (
                <div className="pp-meta-row"><div className="pp-meta-label">No. Faktur Pajak</div><div className="pp-meta-value">{data.nomor_faktur_pajak}</div></div>
              )}
            </div>
          </div>
        </section>

        {/* ── Items Table ── */}
        <table className="pp-table">
          <thead>
            <tr>
              <th style={{ width: "4%" }}>#</th>
              <th style={{ width: "36%" }}>Barang</th>
              <th className="pp-center" style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "10%" }}>Satuan</th>
              <th className="pp-right" style={{ width: "18%" }}>Harga Satuan</th>
              <th className="pp-right" style={{ width: "18%" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: "24px 8px" }}>
                  Tidak ada item
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.goods_receipt_detail_id ?? idx}>
                  <td className="pp-center">{idx + 1}</td>
                  <td>
                    <strong>{item.product_name || `Produk #${item.product_id}`}</strong>
                    {item.product_code && <div className="pp-sub-text">{item.product_code}</div>}
                  </td>
                  <td className="pp-center">{fmt(item.quantity)}</td>
                  <td>{item.uom_code || "-"}</td>
                  <td className="pp-right">{item.price != null ? `Rp ${fmt(item.price)}` : "-"}</td>
                  <td className="pp-right"><strong>{item.subtotal != null ? `Rp ${fmt(item.subtotal)}` : "-"}</strong></td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="pp-right">Total Penerimaan</td>
                <td className="pp-right">Rp {fmt(itemsTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* ── Note + Summary ── */}
        <section className="pp-bottom-grid">
          <div className="pp-note">
            <strong>Catatan</strong>
            {data.transaction_detail || data.transaction_name || "Barang diterima sesuai Purchase Order terkait. Mohon periksa kesesuaian jumlah dan kondisi barang."}
          </div>
          <div className="pp-summary">
            <div className="pp-summary-row pp-grand">
              <span>Total Nilai GR</span>
              <span>Rp {fmt(data.total_amount ?? itemsTotal)}</span>
            </div>
          </div>
        </section>

        {/* ── Signatures ── */}
        <section className="pp-signatures">
          <div>
            <div className="pp-signature-label">Dibuat oleh,</div>
            <div className="pp-signature-line">TRINOVA</div>
          </div>
          <div>
            <div className="pp-signature-label">Diperiksa oleh,</div>
            <div className="pp-signature-line">Gudang</div>
          </div>
          <div>
            <div className="pp-signature-label">Diterima dari,</div>
            <div className="pp-signature-line">{data.supplier_name || "Supplier"}</div>
          </div>
        </section>

        <div className="pp-footer">
          Dokumen ini dicetak otomatis dari Trinova ERP. Goods Receipt {data.receipt_number} — {fmtDate(data.receipt_date)}.
        </div>

      </main>
    </>
  );
}
