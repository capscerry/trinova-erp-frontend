"use client";

import {
  X,
  ReceiptText,
  Building2,
  Calendar,
  Wallet,
  BadgeCheck,
  Hash,
  Clock,
} from "lucide-react";

interface PurchaseDownPaymentDetailData {
  purchase_down_payment_id?: number;

  dp_number: string;

  po_number: string;

  supplier_name: string;

  supplier_id?: number;

  purchase_order_id?: number;

  payment_date: string;

  payment_type: string;

  amount: number;

  po_total: number;

  status: string;

  notes?: string;

  created_at?: string;
}

interface PurchaseDownPaymentDetailModalProps {
  open: boolean;

  onClose: () => void;

  data: PurchaseDownPaymentDetailData | null;
}

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

export default function PurchaseDownPaymentDetailModal({
  open,
  onClose,
  data,
}: PurchaseDownPaymentDetailModalProps) {
  if (!open || !data) {
    return null;
  }

  const outstanding =
    (data.po_total ?? 0) -
    (data.amount ?? 0);

  return (
    <>
      {/* BACKDROP */}

      <div
        onClick={onClose}
        className="
          fixed
          inset-0
          bg-black/50
          backdrop-blur-[2px]
          z-40
        "
      />

      {/* MODAL */}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div
          className="
            bg-white
            rounded-2xl
            shadow-2xl
            w-full
            max-w-3xl
            border
            border-slate-200
            overflow-hidden
          "
        >

          {/* HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              px-6
              py-4
              bg-gradient-to-r
              from-navy-900
              to-navy-600
            "
          >

            <div>

              <h2 className="text-white font-semibold text-[15px]">
                Detail Purchase Down Payment
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Informasi lengkap pembayaran uang muka
              </p>

            </div>

            <button
              onClick={onClose}
              className="
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                text-slate-400
                hover:text-white
                hover:bg-white/10
              "
            >
              <X size={16} />
            </button>

          </div>

          {/* BODY */}

          <div className="p-6 space-y-5">

            {/* INFO CARD */}

            <div className="grid grid-cols-2 gap-4">

              {data.purchase_down_payment_id != null && (
                <InfoCard
                  icon={<Hash size={14} />}
                  label="DP ID"
                  value={String(data.purchase_down_payment_id)}
                />
              )}

              <InfoCard
                icon={<ReceiptText size={14} />}
                label="DP Number"
                value={data.dp_number}
              />

              <InfoCard
                icon={<ReceiptText size={14} />}
                label="PO Number"
                value={data.po_number}
              />

              {data.purchase_order_id != null && (
                <InfoCard
                  icon={<Hash size={14} />}
                  label="PO ID"
                  value={String(data.purchase_order_id)}
                />
              )}

              <InfoCard
                icon={<Building2 size={14} />}
                label="Supplier"
                value={data.supplier_name}
              />

              {data.supplier_id != null && (
                <InfoCard
                  icon={<Building2 size={14} />}
                  label="Supplier ID"
                  value={String(data.supplier_id)}
                />
              )}

              <InfoCard
                icon={<Calendar size={14} />}
                label="Payment Date"
                value={formatDate(data.payment_date)}
              />

              {data.created_at && (
                <InfoCard
                  icon={<Clock size={14} />}
                  label="Created At"
                  value={formatDate(data.created_at)}
                />
              )}

              <InfoCard
                icon={<Wallet size={14} />}
                label="Payment Type"
                value={data.payment_type}
              />

              <InfoCard
                icon={<BadgeCheck size={14} />}
                label="Status"
                value={data.status}
              />

            </div>

            {/* NOTES */}

            <div className="border border-slate-200 rounded-xl p-4">

              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Notes
              </p>

              <p className="text-sm text-slate-700">
                {data.notes?.trim()
                  ? data.notes
                  : "-"}
              </p>

            </div>

            {/* PAYMENT SUMMARY */}

            <div>

              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Payment Summary
              </h3>

              <div className="grid grid-cols-3 gap-4">

                <SummaryCard
                  label="PO Total"
                  value={formatRupiah(
                    data.po_total
                  )}
                />

                <SummaryCard
                  label="DP Paid"
                  value={formatRupiah(
                    data.amount
                  )}
                />

                <SummaryCard
                  label="Outstanding"
                  value={formatRupiah(
                    outstanding
                  )}
                />

              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB COMPONENTS
// ─────────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">

      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">

        {icon}

        {label}

      </div>

      <div className="text-sm font-semibold text-slate-700">
        {value}
      </div>

    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-navy-900 rounded-xl p-4">

      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-gold-400">
        {value}
      </p>

    </div>
  );
}