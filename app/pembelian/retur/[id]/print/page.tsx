"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PURCHASE_PRINT_CSS } from "@/lib/print/purchasePrintStyles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReturnItem {
  product_id: number;
  product_name?: string;
  qty_return: number;
  unit_price?: number;
  subtotal?: number;
}

interface ReturnData {
  purchase_return_id: number;
  purchase_return_number: string;
  return_date: string;
  supplier_name?: string;
  supplier_id?: number;
  goods_receipt_id?: number;
  purchase_order_number?: string;
  settlement_option?: string;
  status?: string;
  total_amount: number;
  closing_condition?: string;
  notes?: string;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
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

export default function PurchaseReturnPrintPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<ReturnData | null>(null);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        // Fetch main return record
        const res = await api.get(`/purchase-return/${id}`);
        const raw: ReturnData = res.data?.data ?? res.data;
        setData(raw);

        // Parse line items from transaction_detail (serialised JSON array)
        if (raw.transaction_detail) {
          try {
            const parsed = JSON.parse(raw.transaction_detail);
            if (Array.isArray(parsed) && parsed.length > 0 && "product_id" in parsed[0]) {
              setItems(parsed as ReturnItem[]);
              return;
            }
          } catch {
            // not JSON — items stay empty, handled below
          }
        }

        // Fallback: dedicated details endpoint
        try {
          const detRes = await api.get(`/purchase-return/${id}/details`);
          const detRaw = detRes.data?.data ?? detRes.data;
          if (Array.isArray(detRaw)) setItems(detRaw);
        } catch {
          // endpoint may not exist — silently skip
        }
      } catch (err) {
        console.error("Gagal memuat return untuk print:", err);
        setError("Gagal memuat dokumen Purchase Return.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) return <div className="pp-screen-state">Memuat dokumen...</div>;
  if (error || !data) return <div className="pp-screen-state error">{error || "Data Purchase Return tidak ditemukan."}</div>;

  const itemsTotal = items.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
  const displayTotal = Number(data.total_amount ?? itemsTotal);

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
            <div className="pp-doc-title">Purchase Return</div>
            <div className="pp-doc-number">{data.purchase_return_number}</div>
            {data.status && <div className="pp-doc-status">{data.status}</div>}
          </div>
        </section>

        {/* ── Info Grid ── */}
        <section className="pp-info-grid">
          <div className="pp-panel">
            <div className="pp-panel-title">Supplier</div>
            <div className="pp-panel-body">
              <div className="pp-entity-name">{data.supplier_name || "-"}</div>
              {data.settlement_option && (
                <div className="pp-muted">Penyelesaian: {data.settlement_option}</div>
              )}
            </div>
          </div>
          <div className="pp-panel">
            <div className="pp-panel-title">Informasi Dokumen</div>
            <div className="pp-panel-body">
              <div className="pp-meta-row"><div className="pp-meta-label">Tgl Retur</div><div className="pp-meta-value">{fmtDate(data.return_date)}</div></div>
              <div className="pp-meta-row"><div className="pp-meta-label">No. Retur</div><div className="pp-meta-value">{data.purchase_return_number}</div></div>
              <div className="pp-meta-row"><div className="pp-meta-label">No. PO</div><div className="pp-meta-value">{data.purchase_order_number || "-"}</div></div>
              {data.goods_receipt_id && (
                <div className="pp-meta-row"><div className="pp-meta-label">Ref. GR</div><div className="pp-meta-value">#{data.goods_receipt_id}</div></div>
              )}
              {data.nomor_faktur_pajak && (
                <div className="pp-meta-row"><div className="pp-meta-label">No. Faktur Pajak</div><div className="pp-meta-value">{data.nomor_faktur_pajak}</div></div>
              )}
            </div>
          </div>
        </section>

        {/* ── Items Table ── */}
        {items.length > 0 && (
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ width: "4%" }}>#</th>
                <th style={{ width: "44%" }}>Barang</th>
                <th className="pp-center" style={{ width: "12%" }}>Qty Return</th>
                <th className="pp-right" style={{ width: "20%" }}>Harga Satuan</th>
                <th className="pp-right" style={{ width: "20%" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={`${item.product_id}-${idx}`}>
                  <td className="pp-center">{idx + 1}</td>
                  <td><strong>{item.product_name || `Produk #${item.product_id}`}</strong></td>
                  <td className="pp-center">{item.qty_return}</td>
                  <td className="pp-right">{item.unit_price != null ? `Rp ${fmt(item.unit_price)}` : "-"}</td>
                  <td className="pp-right"><strong>{item.subtotal != null ? `Rp ${fmt(item.subtotal)}` : "-"}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pp-right">Total Nilai Retur</td>
                <td className="pp-right">Rp {fmt(itemsTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* ── Settlement + Summary ── */}
        <section className="pp-bottom-grid" style={{ marginTop: 18 }}>
          <div className="pp-note">
            <strong>Kondisi Penyelesaian</strong>
            {data.closing_condition || data.notes || "Retur barang ke supplier sesuai perjanjian yang berlaku."}
          </div>
          <div className="pp-summary">
            <div className="pp-summary-row"><span>Settlement</span><span>{data.settlement_option || "-"}</span></div>
            <div className="pp-summary-row pp-grand">
              <span>Total Retur</span>
              <span>Rp {fmt(displayTotal)}</span>
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
            <div className="pp-signature-label">Disetujui oleh,</div>
            <div className="pp-signature-line">Gudang</div>
          </div>
          <div>
            <div className="pp-signature-label">Diterima oleh,</div>
            <div className="pp-signature-line">{data.supplier_name || "Supplier"}</div>
          </div>
        </section>

        <div className="pp-footer">
          Dokumen ini dicetak otomatis dari Trinova ERP. Purchase Return {data.purchase_return_number} — {fmtDate(data.return_date)}.
        </div>

      </main>
    </>
  );
}
