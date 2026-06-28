"use client";

import { useEffect, useState } from "react";
import {
  X,
  ReceiptText,
  Building2,
  Calendar,
  BadgeCheck,
  Wallet,
  CreditCard,
  Hash,
} from "lucide-react";
import { getPaymentsByInvoice } from "@/lib/services/purchase-payment.service";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  age: number;
  dp_paid: number;
  outstanding_amount: number;
  transaction_name?: string;
  transaction_detail?: string;
}

interface Payment {
  purchase_payment_id: number;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  status: string;
  notes?: string;
}

interface PurchaseInvoiceDetailModalProps {
  open: boolean;
  onClose: () => void;
  invoice: PurchaseInvoice | null;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(d));

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const formatINVNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^INV-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `INV-${digits.padStart(10, "0")}`;
};

const formatPAYNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^PAY-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `PAY-${digits.padStart(10, "0")}`;
};

const STATUS_STYLE: Record<string, string> = {
  Paid:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Unpaid:    "bg-amber-50 text-amber-700 border border-amber-200",
  Cancelled: "bg-rose-50 text-rose-600 border border-rose-200",
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PurchaseInvoiceDetailModal({
  open,
  onClose,
  invoice,
}: PurchaseInvoiceDetailModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !invoice) return;

    const fetchPayments = async () => {
      setLoading(true);
      try {
        const res = await getPaymentsByInvoice(Number(invoice.id));
        const list = Array.isArray(res) ? res : res.data ?? [];
        // Client-side guard: only keep payments that belong to this invoice
        const filtered = list.filter(
          (p: any) =>
            p.purchase_invoice_id == null ||
            Number(p.purchase_invoice_id) === Number(invoice.id)
        );
        setPayments(filtered);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [open, invoice]);

  if (!open || !invoice) return null;

  // Sum only the payments that were fetched for this invoice
  const totalPaymentsMade = payments.reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0
  );
  // Outstanding = total - what has actually been paid (payments + dp)
  const computedOutstanding = Math.max(
    0,
    invoice.total_amount - invoice.dp_paid - totalPaymentsMade
  );

  return (
    <>
      {/* BACKDROP */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">

          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px]">
                Detail Purchase Invoice
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {formatINVNumber(invoice.invoice_number)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">

            {/* ── INVOICE INFO GRID ── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Informasi Invoice
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={<ReceiptText size={13} />} label="Invoice Number" value={formatINVNumber(invoice.invoice_number)} />
                <InfoCard icon={<Calendar size={13} />}    label="Invoice Date"   value={formatDate(invoice.invoice_date)} />
                <InfoCard icon={<Building2 size={13} />}   label="Supplier"       value={`Supplier ${invoice.supplier_name}`} />
                <InfoCard icon={<Hash size={13} />}        label="Umur (Hari)"    value={String(invoice.age)} />
              </div>
            </div>

            {/* ── STATUS BADGE ── */}
            <div className="flex items-center gap-3">
              <BadgeCheck size={15} className="text-slate-400 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </span>
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[invoice.status] ?? "bg-slate-100 text-slate-600"}`}
              >
                {invoice.status}
              </span>
            </div>

            {/* ── PAYMENT SUMMARY CARDS ── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Ringkasan Pembayaran
              </p>
              <div className="grid grid-cols-4 gap-3">
                <SummaryCard label="Invoice Total"    value={formatRupiah(invoice.total_amount)} />
                <SummaryCard label="DP Dibayar"       value={formatRupiah(invoice.dp_paid)} />
                <SummaryCard label="Payment Dibayar"  value={formatRupiah(totalPaymentsMade)} highlight />
                <SummaryCard label="Outstanding"      value={formatRupiah(computedOutstanding)} dim={computedOutstanding === 0} />
              </div>
            </div>

            {/* ── PAYMENT HISTORY ── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Riwayat Pembayaran
              </p>

              {loading ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Memuat data pembayaran...
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center">
                  <Wallet size={20} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Belum ada pembayaran tercatat</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          No. Pembayaran
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          Tanggal
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-400 uppercase tracking-wide">
                          Metode
                        </th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-400 uppercase tracking-wide">
                          Jumlah
                        </th>
                        <th className="px-4 py-2.5 text-center font-semibold text-slate-400 uppercase tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr
                          key={p.purchase_payment_id ?? i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-navy-700">
                            {p.payment_number ? formatPAYNumber(p.payment_number) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {p.payment_date ? formatDate(p.payment_date) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <CreditCard size={11} className="text-slate-400" />
                              {p.payment_method ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {formatRupiah(Number(p.amount ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[p.status] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* TOTAL ROW */}
                    <tfoot>
                      <tr className="bg-navy-900">
                        <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                          Total Dibayar
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gold-400">
                          {formatRupiah(
                            payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
                          )}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>

                  {/* NOTES — shown if any payment has notes */}
                  {payments.some(p => p.notes?.trim()) && (
                    <div className="border-t border-slate-200 px-4 py-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Catatan</p>
                      {payments
                        .filter(p => p.notes?.trim())
                        .map((p, i) => (
                          <p key={i} className="text-xs text-slate-600">
                            <span className="font-semibold text-navy-700">{formatPAYNumber(p.payment_number)}:</span>{" "}
                            {p.notes}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── TRANSACTION INFO ── */}
            {(invoice.transaction_name || invoice.transaction_detail) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Transaction Info
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {invoice.transaction_name && (
                    <InfoCard
                      icon={<ReceiptText size={13} />}
                      label="Transaction Name"
                      value={invoice.transaction_name}
                    />
                  )}
                  {invoice.transaction_detail && (
                    <div className="border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                        <ReceiptText size={13} />
                        Transaction Detail
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {invoice.transaction_detail}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  dim,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="bg-navy-900 rounded-xl p-3.5">
      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold leading-tight">
        {label}
      </p>
      <p className={`mt-1.5 text-sm font-bold ${highlight ? "text-emerald-400" : dim ? "text-slate-500" : "text-gold-400"}`}>
        {value}
      </p>
    </div>
  );
}
