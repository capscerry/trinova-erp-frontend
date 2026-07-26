"use client";

import { useState, useEffect } from "react";
import { X, Check, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SalesOrderFormData,
  type SalesOrderModalProps,
  type SalesOrderItem,
  mapFormToApiPayload,
  PROSES_LINKS,
  EMPTY_FORM,
  generateNomor,
  newItem,
} from "./sales_order/SalesOrderType";
import { salesOrderService } from "@/lib/services/penjualan.service";
import { SalesOrderHeaderForm } from "./sales_order/SalesOrderHeader";
import { SalesOrderDetailForm } from "./sales_order/SalesOrderDetail";
import { QuotationPickerModal } from "./QuotationPickerModal";
import { notify } from "@/lib/notify";

export type { SalesOrderItem, SalesOrderFormData } from "./sales_order/SalesOrderType";

type SavedSalesOrderResponse = {
  header?: {
    orderId?: number;
    soNumber?: string;
    orderNumber?: string;
    customerId?: number;
    address?: string;
    notes?: string;
    subTotal?: number;
    subtotal?: number;
    total?: number;
  };
  orderId?: number;
  soNumber?: string;
  orderNumber?: string;
  subTotal?: number;
  subtotal?: number;
  total?: number;
};

export function SalesOrderModal({
  open,
  onClose,
  onSubmit,
  initialData,
  onNavigate,
  pelangganOptions = [],
  salesOptions = [],
}: SalesOrderModalProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<SalesOrderFormData>(() =>
    initialData ?? { ...EMPTY_FORM, nomor: generateNomor() }
  );

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [savedSo, setSavedSo] = useState<SavedSalesOrderResponse | null>(null);
  const [quotationPickerOpen, setQuotationPickerOpen] = useState(false);
  const [editSaved, setEditSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const base = initialData ?? { ...EMPTY_FORM };

      setForm({
        ...base,
        nomor: base.nomor || generateNomor(),
      });

      setIsSubmitted(false);
      setIsSubmitting(false);
      setSuccessMessage("");
      setSavedSo(null);
      setEditSaved(false);
    }
  }, [open, initialData]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const patchForm = (patch: Partial<SalesOrderFormData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleQuotationConfirm = (
    items: SalesOrderItem[],
    quotation: { id: number; nomor: string ,alamat : string,kenaPajak : boolean}
  ) => {
    // Gabungkan: hapus baris kosong default, lalu tambahkan item dari quotation
    const existingItems = form.items.filter(
      (i) => i.productId && i.productId > 0
    );
    const merged = [...existingItems, ...items];

    patchForm({
      quotationId: quotation.id,
      quotationNumber: quotation.nomor,
      ...(quotation.alamat ? {alamatPengiriman : quotation.alamat} : {}),
      kenaPajak: quotation.kenaPajak,
      items: merged.length > 0 ? merged : [newItem()],
    });
    setQuotationPickerOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      const payload = mapFormToApiPayload(form);
      console.log("Mapped payload:", payload);

      // Endpoint create() sekarang berperan sebagai upsert di backend:
      // kalau payload.header.orderId terisi (mode edit), backend akan
      // UPDATE record yang sudah ada, bukan membuat SO baru.
      const response: unknown = await salesOrderService.create(payload);
      console.log("Return API Sales Order:", response);

      const header = (response as SavedSalesOrderResponse)?.header;

      setSavedSo(response as unknown as SavedSalesOrderResponse);
      setForm((prev) => ({
        ...prev,
        nomor: header?.soNumber ?? header?.orderNumber ?? prev.nomor,
        customerId: header?.customerId ?? prev.customerId,
        alamatPengiriman: header?.address ?? prev.alamatPengiriman,
        keterangan: header?.notes ?? prev.keterangan,
      }));

      if (isEdit) {
        // Mode edit: cukup beri tahu parent perubahan berhasil disimpan,
        // tanpa menampilkan panel "Proses ke" (itu khusus alur create →
        // lanjut ke Uang Muka/Pengiriman/Faktur untuk SO yang baru dibuat).
        setSuccessMessage("Perubahan Sales Order berhasil disimpan.");
        notify.success("Sales Order berhasil diperbarui");
        setEditSaved(true);
        onSubmit(form);
      } else {
        setIsSubmitted(true);
        setSuccessMessage("Sales Order berhasil disimpan.");
        notify.success("Sales Order berhasil dibuat");
        // Jangan panggil onSubmit di sini,
        // karena biasanya parent akan menutup modal.
        // onSubmit(form);
      }
    } catch (error) {
      console.error("Gagal menyimpan SO:", error);
      alert(error instanceof Error
        ? error.message
        : isEdit
          ? "Gagal menyimpan perubahan Sales Order"
          : "Gagal menyimpan Sales Order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigate = (
    target: "uang-muka" | "pengiriman" | "faktur" | "penerimaan"
  ) => {
    if (!savedSo) return;

    const header = savedSo?.header;
    console.log("savedSo:", savedSo);
  console.log("header:", header);

    onNavigate?.(target, {
  ...form,

  orderId:
    header?.orderId ??
    savedSo?.orderId ??
    0,

  nomor:
    header?.soNumber ??
    header?.orderNumber ??
    form.nomor,

  noPO: form.noPO ?? "",

  pelanggan: form.pelanggan ?? "",

  customerId:
    header?.customerId ??
    form.customerId,

  alamatPengiriman:
    header?.address ??
    form.alamatPengiriman ??
    "",

  keterangan:
    header?.notes ??
    form.keterangan ??
    "",

  totalHargaPesanan:
    header?.subTotal ??
    header?.subtotal ??
    savedSo?.subTotal ??
    savedSo?.subtotal ??
    0,

  savedSo,
});
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh]
                     flex flex-col border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4
                       bg-gradient-to-r from-navy-900 to-navy-600 shrink-0"
          >
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Sales Order" : "Tambah Sales Order"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit
                  ? "Perbarui data pesanan"
                  : "Buat pesanan penjualan baru"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {editSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-700">
                  {successMessage}
                </p>
              </div>
            )}

            <SalesOrderHeaderForm
              form={form}
              onChange={patchForm}
              pelangganOptions={pelangganOptions}
              salesOptions={salesOptions}
              onOpenQuotationPicker={() => setQuotationPickerOpen(true)}
              isEdit={isEdit}
            />

            <SalesOrderDetailForm
              items={form.items}
              kenaPajak={form.kenaPajak ?? false}
              onChange={(items) => patchForm({ items })}
            />

            {/* Proses ke */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Proses ke
                </h3>
              </div>

              <p className="text-xs text-slate-400 mb-2">
                {isSubmitted
                  ? "Lanjutkan proses dari Sales Order ini ke dokumen berikut."
                  : "Simpan Sales Order terlebih dahulu untuk mengaktifkan proses lanjutan."}
              </p>

              <div className="grid grid-cols-3 gap-3">
                {PROSES_LINKS.map(
                  ({ key, label, desc, icon: Icon, color, bg }) => {
                    const isActive = isSubmitted && !!savedSo;

                    return (
                      <button
                        key={key}
                        disabled={!isActive}
                        onClick={() => handleNavigate(key)}
                        className={cn(
                          "flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all",
                          isActive
                            ? cn(bg, "cursor-pointer")
                            : "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              isActive ? "bg-white/70" : "bg-slate-100"
                            )}
                          >
                            <Icon
                              size={15}
                              className={isActive ? color : "text-slate-400"}
                            />
                          </div>

                          {isActive && (
                            <ArrowRight size={13} className={color} />
                          )}
                        </div>

                        <div>
                          <p
                            className={cn(
                              "text-xs font-bold",
                              isActive
                                ? "text-slate-800"
                                : "text-slate-500"
                            )}
                          >
                            {label}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                            {desc}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {!isSubmitted && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
                  <Check size={10} className="text-slate-300" />
                  Tombol akan aktif setelah SO berhasil disimpan
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-4
                       border-t border-slate-100 bg-slate-50/60 shrink-0"
          >
            {/* Sisi kiri: Back button (hanya tampil setelah berhasil simpan) */}
            <div>
              {isSubmitted && (
                <button
                  onClick={() => {
                    onSubmit(form);
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white
                             border border-slate-200 rounded-lg hover:bg-slate-100
                             transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  Kembali ke Daftar
                </button>
              )}
            </div>

            {/* Sisi kanan: Cancel / Submit */}
            <div className="flex items-center gap-2">
              {!isSubmitted && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white
                             border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isSubmitted}
                className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900
                           hover:bg-navy-700 rounded-lg transition-colors shadow-sm
                           disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && (
                  <RefreshCw size={13} className="animate-spin" />
                )}

                {isSubmitted ? (
                  <>
                    <Check size={13} />
                    Tersimpan
                  </>
                ) : isEdit ? (
                  "Simpan Perubahan"
                ) : (
                  "Buat Sales Order"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quotation Picker Modal ─────────────────── */}
      <QuotationPickerModal
        open={quotationPickerOpen}
        onClose={() => setQuotationPickerOpen(false)}
        customerId={form.customerId ?? 0}
        customerName={form.pelanggan ?? ""}
        onConfirm={handleQuotationConfirm}
      />
    </>
  );
}
