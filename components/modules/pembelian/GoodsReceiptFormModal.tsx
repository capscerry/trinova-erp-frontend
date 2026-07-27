"use client";

import { useEffect, useState } from "react";
import { getNextGRNumber } from "@/lib/services/gr.service";

import {
  X,
  Hash,
  Calendar,
  Package,
  User,
  ToggleLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface PurchaseOrder {
  purchase_order_id: number;
  po_number: string;
  expected_date?: string | null;
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
}

interface PurchaseOrderDetail {
  purchase_order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product?: {
    product_name: string;
  };
}

export interface GoodsReceiptFormData {
  purchase_order_id: string;
  receipt_number: string;
  receipt_date: string;
  received_by: string;
  status: string;
  transaction_name: string;
  transaction_detail: string;
}

interface GoodsReceiptFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GoodsReceiptFormData) => void;

  purchaseOrders: PurchaseOrder[];
  purchaseOrderDetails: PurchaseOrderDetail[];
  /** When set, pre-selects this PO on open (used from Option A replacement flow) */
  initialPOId?: number;
  /** Pre-filled receipt number (auto-fetched by parent for Option A) */
  nextGRNumber?: string;
  /** Navigate to Purchase Invoice page after saving */
  onNavigateToInvoice?: () => void;
}

const todayStr = () =>
  new Date().toISOString().split("T")[0];



const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(n);

export default function GoodsReceiptFormModal({
  open,
  onClose,
  onSubmit,
  purchaseOrders,
  purchaseOrderDetails,
  initialPOId,
  nextGRNumber,
  onNavigateToInvoice,
}: GoodsReceiptFormModalProps) {

  const [isSubmitted, setIsSubmitted] = useState(false);

  const [selectedDetails, setSelectedDetails] =
    useState<PurchaseOrderDetail[]>([]);

  const [selectedExpectedDate, setSelectedExpectedDate] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<GoodsReceiptFormData>({
      purchase_order_id: "",
      receipt_number: "",
      receipt_date: todayStr(),
      received_by: "",
      status: "Received",
      transaction_name: "",
      transaction_detail: "",
    });

  useEffect(() => {

    if (!open) return;

    setIsSubmitted(false);

    const prefillPOId = initialPOId ? String(initialPOId) : "";

    setForm({
      purchase_order_id: prefillPOId,
      receipt_number: "",
      receipt_date: todayStr(),
      received_by: "",
      status: "Received",
      transaction_name: "",
      transaction_detail: "",
    });

    setSelectedDetails([]);
    setSelectedExpectedDate(null);

    // Use parent-supplied number if provided; otherwise fetch from backend
    if (nextGRNumber) {
      setForm(prev => ({ ...prev, receipt_number: nextGRNumber, purchase_order_id: prefillPOId }));
    } else {
      getNextGRNumber()
        .then(res => setForm(prev => ({
          ...prev,
          receipt_number: res?.receipt_number ?? res?.next_number ?? "",
          purchase_order_id: prefillPOId,
        })))
        .catch(() => { /* leave blank if endpoint not available */ });
    }

    // Pre-select details if initialPOId was given
    if (initialPOId) {
      const filtered = purchaseOrderDetails.filter(
        (item) => Number(item.purchase_order_id) === initialPOId
      );
      setSelectedDetails(filtered);

      const selectedPO = purchaseOrders.find(
        (po) => po.purchase_order_id === initialPOId
      );
      setSelectedExpectedDate(selectedPO?.expected_date ?? null);
    }

  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = <
    K extends keyof GoodsReceiptFormData
  >(
    key: K,
    value: GoodsReceiptFormData[K]
  ) => {

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectPO = (
    purchaseOrderId: string
  ) => {

    const selectedPO = purchaseOrders.find(
      (po) => String(po.purchase_order_id) === purchaseOrderId
    );

    setSelectedExpectedDate(selectedPO?.expected_date ?? null);

    setForm((prev) => ({
      ...prev,
      purchase_order_id: purchaseOrderId,
      transaction_name: selectedPO?.transaction_name ?? prev.transaction_name,
      transaction_detail: selectedPO?.transaction_detail ?? prev.transaction_detail,
    }));

    const filtered =
      purchaseOrderDetails.filter(
        (item) =>
          Number(item.purchase_order_id) ===
          Number(purchaseOrderId)
      );

    setSelectedDetails(filtered);
  };

  if (!open) return null;

  // Sort newest-first by purchase_order_id
  const sortedPOs = [...purchaseOrders].sort(
    (a, b) => b.purchase_order_id - a.purchase_order_id
  );

  // ── On-time indicator derived from receipt_date vs expected_date ──
  type OnTimeStatus = "on_time" | "late" | "unknown";
  const onTimeStatus: OnTimeStatus = (() => {
    if (!selectedExpectedDate || !form.receipt_date) return "unknown";
    return form.receipt_date <= selectedExpectedDate ? "on_time" : "late";
  })();

  const formatDateId = (d: string) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
    }).format(new Date(d));

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div
          className="
            bg-white
            rounded-2xl
            shadow-2xl
            w-full
            max-w-3xl
            max-h-[92vh]
            flex
            flex-col
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
              bg-linear-to-r
              from-navy-900
              to-navy-600
            "
          >

            <div>

              <h2 className="text-white font-semibold text-[15px]">
                Tambah Goods Receipt
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                Buat penerimaan barang baru
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

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <Section title="Informasi Goods Receipt">

              <div className="grid grid-cols-2 gap-4">

                <FormField
                  label="Receipt Number"
                  icon={<Hash size={13} />}
                >

                  <input
                    readOnly
                    value={form.receipt_number}
                    placeholder="Otomatis"
                    className={cn(
                      inputBase,
                      "bg-slate-50 text-slate-500 placeholder-slate-400"
                    )}
                  />

                </FormField>

                <FormField
                  label="Tanggal Terima"
                  icon={<Calendar size={13} />}
                  required
                >

                  <input
                    type="date"
                    value={form.receipt_date}
                    onChange={(e) =>
                      setField(
                        "receipt_date",
                        e.target.value
                      )
                    }
                    className={inputBase}
                  />

                </FormField>

              </div>

              {/* Tanggal Ekspektasi reference — shown once a PO is selected */}
              {selectedExpectedDate && (
                <div className={cn(
                  "rounded-xl border px-4 py-3 flex items-start gap-3",
                  onTimeStatus === "on_time"
                    ? "bg-emerald-50 border-emerald-200"
                    : onTimeStatus === "late"
                    ? "bg-rose-50 border-rose-200"
                    : "bg-slate-50 border-slate-200"
                )}>
                  <div className="mt-0.5 shrink-0">
                    {onTimeStatus === "on_time" && <CheckCircle2 size={15} className="text-emerald-600" />}
                    {onTimeStatus === "late"    && <AlertCircle  size={15} className="text-rose-500" />}
                    {onTimeStatus === "unknown" && <Clock        size={15} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-bold uppercase tracking-wide",
                      onTimeStatus === "on_time" ? "text-emerald-700"
                        : onTimeStatus === "late" ? "text-rose-600"
                        : "text-slate-500"
                    )}>
                      Tanggal Ekspektasi (dari PO)
                    </p>
                    <p className={cn(
                      "text-sm font-semibold mt-0.5",
                      onTimeStatus === "on_time" ? "text-emerald-800"
                        : onTimeStatus === "late" ? "text-rose-700"
                        : "text-slate-700"
                    )}>
                      {formatDateId(selectedExpectedDate)}
                    </p>
                    {onTimeStatus !== "unknown" && (
                      <p className={cn(
                        "text-xs mt-1",
                        onTimeStatus === "on_time" ? "text-emerald-600" : "text-rose-500"
                      )}>
                        {onTimeStatus === "on_time"
                          ? "Penerimaan tepat waktu — akan dicatat sebagai on-time di scoring AHP-TOPSIS"
                          : "Penerimaan terlambat — akan dicatat sebagai late di scoring AHP-TOPSIS"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <FormField
                label="Purchase Order"
                icon={<Package size={13} />}
                required
              >

                <select
                  value={form.purchase_order_id}
                  onChange={(e) =>
                    handleSelectPO(
                      e.target.value
                    )
                  }
                  className={inputBase}
                >

                  <option value="">
                    Pilih Purchase Order
                  </option>

                  {sortedPOs.map((po) => (

                    <option
                      key={po.purchase_order_id}
                      value={po.purchase_order_id}
                    >
                      {po.po_number}
                      {po.transaction_name ? ` | ${po.transaction_name}` : ""}
                    </option>

                  ))}

                </select>

              </FormField>

              <FormField
                label="Received By"
                icon={<User size={13} />}
                required
              >

                <input
                  type="text"
                  value={form.received_by}
                  onChange={(e) =>
                    setField(
                      "received_by",
                      e.target.value
                    )
                  }
                  placeholder="Nama penerima..."
                  className={inputBase}
                />

              </FormField>

              <FormField
                label="Status"
                icon={<ToggleLeft size={13} />}
              >

                <div className="flex gap-2">

                  {[
                    "Received",
                    "Partial",
                    "Cancelled",
                  ].map((status) => (

                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setField(
                          "status",
                          status
                        )
                      }
                      className={cn(
                        `
                          px-3
                          py-1.5
                          rounded-lg
                          text-xs
                          font-semibold
                          border
                        `,
                        form.status === status
                          ? `
                            bg-navy-900
                            text-gold-400
                            border-navy-900
                          `
                          : `
                            bg-white
                            border-slate-200
                            text-slate-400
                          `
                      )}
                    >
                      {status}
                    </button>

                  ))}

                </div>

              </FormField>

              {(form.transaction_name || form.transaction_detail) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Transaction Info (dari PO)
                  </p>
                  {form.transaction_name && (
                    <p className="text-sm font-semibold text-slate-700">
                      {form.transaction_name}
                    </p>
                  )}
                  {form.transaction_detail && (
                    <p className="text-xs text-slate-500 whitespace-pre-wrap">
                      {form.transaction_detail}
                    </p>
                  )}
                </div>
              )}

              {/* Nomor Faktur Pajak — read-only, carried from the selected PO */}
              {(() => {
                const selPO = purchaseOrders.find(
                  (po) => String(po.purchase_order_id) === form.purchase_order_id
                );
                return selPO?.nomor_faktur_pajak ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Nomor Faktur Pajak (dari PO)
                    </p>
                    <p className="font-mono font-semibold text-sm text-slate-700">
                      {selPO.nomor_faktur_pajak}
                    </p>
                  </div>
                ) : null;
              })()}

            </Section>

            {/* DETAIL */}

            <Section title="Detail Item PO">

              <div className="border border-slate-200 rounded-xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full border-collapse text-xs">

                    <thead>

                      <tr className="bg-slate-50 border-b border-slate-200">

                        {[
                          "Product ID",
                          "Product Name",
                          "Qty",
                          "Price",
                          "Subtotal",
                        ].map((h) => (

                          <th
                            key={h}
                            className="
                              px-3
                              py-2.5
                              text-left
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            {h}
                          </th>

                        ))}

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {selectedDetails.length === 0 && (

                        <tr>

                          <td
                            colSpan={5}
                            className="
                              px-4
                              py-8
                              text-center
                              text-slate-400
                            "
                          >
                            Belum ada item PO dipilih
                          </td>

                        </tr>
                      )}

                      {selectedDetails.map(
                        (
                          item,
                          index
                        ) => (

                          <tr
                            key={index}
                            className="hover:bg-slate-50/50"
                          >

                            <td className="px-3 py-3">
                              {item.product_id}
                            </td>

                            <td className="px-3 py-3 text-slate-700">
                              {item.product?.product_name ?? "-"}
                            </td>

                            <td className="px-3 py-3">
                              {item.quantity}
                            </td>

                            <td className="px-3 py-3">
                              Rp {formatRupiah(item.price)}
                            </td>

                            <td className="px-3 py-3 font-semibold">
                              Rp {formatRupiah(item.subtotal)}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </Section>

          </div>

          {/* FOOTER */}

          <div className="flex flex-col gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">

            {isSubmitted && onNavigateToInvoice ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Lanjutkan Ke
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToInvoice();
                  }}
                  className="flex items-center gap-4 w-full p-3.5 rounded-xl border text-left transition-all bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 shrink-0">
                    <FileText size={15} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Purchase Invoice</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Buat invoice pembelian untuk GR ini</p>
                  </div>
                  <ArrowRight size={13} className="text-emerald-600 shrink-0" />
                </button>
                <div className="flex justify-start">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-slate-600
                    bg-white
                    border
                    border-slate-200
                    rounded-lg
                    hover:bg-slate-100
                    transition-colors
                  "
                >
                  Batal
                </button>

                <button
                  onClick={async () => {
                    await onSubmit(form);
                    setIsSubmitted(true);
                  }}
                  className="
                    px-5
                    py-2
                    text-sm
                    font-semibold
                    text-gold-400
                    bg-navy-900
                    hover:bg-navy-700
                    rounded-lg
                    transition-colors
                  "
                >
                  Simpan Goods Receipt
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {

  return (

    <div>

      <div className="mb-3">

        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {title}
        </h3>

      </div>

      <div className="space-y-3">
        {children}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORM FIELD
// ─────────────────────────────────────────────────────────────

function FormField({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {

  return (

    <div className="space-y-1.5">

      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">

        {icon && (
          <span className="text-slate-400">
            {icon}
          </span>
        )}

        {label}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}

      </label>

      {children}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLE
// ─────────────────────────────────────────────────────────────

const inputBase = `
  w-full
  px-3
  py-2.5
  text-sm
  rounded-lg
  border
  border-slate-200
  bg-white
  text-slate-700
  placeholder-slate-400
  focus:outline-none
`;