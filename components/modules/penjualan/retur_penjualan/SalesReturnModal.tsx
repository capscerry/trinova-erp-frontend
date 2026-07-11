"use client";

import { useState, useEffect } from "react";
import {
  X, Hash, Calendar, User, FileText, FileDown,
  RefreshCw, PenLine, Package, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { customerService } from "@/lib/services/customer.service";
import {
  type PengirimanPenjualan,
} from "@/lib/services/pengiriman-penjualan.service";
import {
  salesReturnService,
  type SalesReturnPayload,
} from "@/lib/services/sales-return.service";
import {
  SalesReturnDOPickerModal,
  type SalesReturnPickerResultItem,
} from "./SalesReturnDOPickerModal";

// ─── Form types ─────────────────────────────────────────────────────────────

interface SalesReturnItemForm {
  id: string;
  productId: number;
  productCode: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  uomId?: number;
  satuan: string;
  maxReturnable: number;
  qty: number;
  reason: string;
}

interface SalesReturnFormData {
  customerId?: number;
  pelanggan: string;
  noRetur: string;
  noReturMode: "auto" | "manual";
  tanggal: string;
  deliveryOrderId?: number;
  noSuratJalan?: string;
  salesOrderId?: number;
  noSo?: string;
  keterangan: string;
  items: SalesReturnItemForm[];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function generateNoRetur(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
  return `RET.${year}.${month}.${seq}`;
}

const EMPTY_FORM: SalesReturnFormData = {
  pelanggan: "",
  noRetur: "",
  noReturMode: "auto",
  tanggal: todayStr(),
  keterangan: "",
  items: [],
};

const inputClass = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all disabled:bg-slate-50 disabled:cursor-not-allowed
`;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SalesReturnModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SalesReturnModal({ open, onClose, onSubmit }: SalesReturnModalProps) {
  const [form, setForm] = useState<SalesReturnFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<{ id: number; name: string }[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");

  const [doPickerOpen, setDoPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM, tanggal: todayStr(), noRetur: generateNoRetur() });

    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const data = await customerService.getAllActive();
        setCustomerOptions(data.map((c) => ({ id: Number(c.id), name: c.nama })));
      } catch (err) {
        console.error("Gagal memuat data customer:", err);
        setCustomerOptions([]);
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const set = <K extends keyof SalesReturnFormData>(field: K, value: SalesReturnFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const filteredCustomers = customerOptions.filter((c) =>
    c.name.toLowerCase().includes(filterCustomer.toLowerCase())
  );

  const handleSelectCustomer = (customer: { id: number; name: string }) => {
    setForm((prev) => ({
      ...prev,
      pelanggan: customer.name,
      customerId: customer.id,
      deliveryOrderId: undefined,
      noSuratJalan: undefined,
      salesOrderId: undefined,
      noSo: undefined,
      items: [],
    }));
    setShowCustomerDropdown(false);
    setFilterCustomer("");
  };

  const switchNoReturMode = (mode: "auto" | "manual") => {
    set("noReturMode", mode);
    if (mode === "auto") set("noRetur", generateNoRetur());
  };

  const handleDoConfirm = (delivery: PengirimanPenjualan, items: SalesReturnPickerResultItem[]) => {
    setForm((prev) => ({
      ...prev,
      deliveryOrderId: delivery.id,
      noSuratJalan: delivery.noSuratJalan,
      salesOrderId: delivery.soId,
      noSo: delivery.noSo,
      items: items.map((it) => ({
        id: crypto.randomUUID(),
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        warehouseId: it.warehouseId,
        warehouseName: it.warehouseName,
        uomId: it.uomId,
        satuan: it.satuan,
        maxReturnable: it.maxReturnable,
        qty: it.qtyReturn,
        reason: "",
      })),
    }));
    setDoPickerOpen(false);
  };

  const updateItem = (id: string, patch: Partial<SalesReturnItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const removeItem = (id: string) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));
  };

  const handleSubmit = async () => {
    if (!form.customerId) {
      alert("Pelanggan wajib dipilih");
      return;
    }
    if (!form.deliveryOrderId) {
      alert("Pilih Delivery Order sebagai sumber retur");
      return;
    }
    if (form.items.length === 0) {
      alert("Tambahkan minimal 1 barang untuk diretur");
      return;
    }
    if (form.items.some((it) => it.qty <= 0)) {
      alert("Qty retur harus lebih dari 0 untuk semua baris");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: SalesReturnPayload = {
        header: {
          returnNumber: form.noRetur,
          returnDate: form.tanggal,
          customerId: form.customerId,
          deliveryOrderId: form.deliveryOrderId,
          salesOrderId: form.salesOrderId ?? null,
          notes: form.keterangan || undefined,
        },
        detail: form.items.map((it) => ({
          productId: it.productId,
          warehouseId: it.warehouseId,
          qty: it.qty,
          uomId: it.uomId,
          reason: it.reason || undefined,
        })),
      };
      await salesReturnService.create(payload);
      onSubmit();
    } catch (err: unknown) {
      console.error("Gagal menyimpan retur penjualan:", err);
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      alert("Gagal menyimpan retur: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const hasPelanggan = !!form.customerId;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]"
        >
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">Tambah Retur Penjualan</h2>
              <p className="text-slate-400 text-xs mt-0.5">Kembalikan barang dari pelanggan berdasarkan Delivery Order</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Pelanggan" icon={<User size={14} />} required>
                <div className="relative">
                  <input
                    type="text"
                    value={showCustomerDropdown ? filterCustomer : form.pelanggan ?? ""}
                    onChange={(e) => { if (showCustomerDropdown) setFilterCustomer(e.target.value); }}
                    onFocus={() => { setShowCustomerDropdown(true); setFilterCustomer(""); }}
                    placeholder={loadingCustomers ? "Memuat pelanggan..." : "Cari/Pilih Pelanggan..."}
                    disabled={loadingCustomers}
                    className={inputClass}
                  />
                  {showCustomerDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowCustomerDropdown(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-navy-50 hover:text-navy-900 transition-colors border-b border-slate-100 last:border-b-0"
                            >
                              {customer.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2.5 text-sm text-slate-500 text-center">
                            {customerOptions.length === 0 ? "Tidak ada data pelanggan" : "Tidak ada hasil"}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </FormField>

              <FormField
                label="No Retur"
                icon={<Hash size={14} />}
                required
                hint={form.noReturMode === "auto" ? "Auto-generate" : "Input manual"}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => switchNoReturMode("auto")}
                      title="Auto-generate"
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                        form.noReturMode === "auto"
                          ? "bg-navy-900 text-gold-400 shadow-sm"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => switchNoReturMode("manual")}
                      title="Input manual"
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                        form.noReturMode === "manual"
                          ? "bg-navy-900 text-gold-400 shadow-sm"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <PenLine size={13} />
                    </button>
                  </div>
                  <input
                    readOnly={form.noReturMode === "auto"}
                    value={form.noRetur}
                    onChange={(e) => { if (form.noReturMode === "manual") set("noRetur", e.target.value); }}
                    className={cn(inputClass, "font-mono flex-1", form.noReturMode === "auto" && "bg-slate-50 text-slate-500")}
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Tanggal Retur" icon={<Calendar size={14} />} required>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => set("tanggal", e.target.value)}
                className={cn(inputClass, "max-w-xs")}
              />
            </FormField>

            <div
              className={cn(
                "rounded-xl border px-4 py-3 transition-all",
                hasPelanggan ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50/50 opacity-60"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileDown size={14} className={hasPelanggan ? "text-emerald-600" : "text-slate-400"} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-600">
                      Ambil dari Delivery Order
                    </span>
                    {form.noSuratJalan ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-semibold font-mono">
                          {form.noSuratJalan}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {hasPelanggan ? "Wajib — pilih DO sumber barang yang diretur" : "Pilih pelanggan terlebih dahulu"}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDoPickerOpen(true)}
                  disabled={!hasPelanggan}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 inline-flex items-center gap-1.5",
                    hasPelanggan
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <FileDown size={11} />
                  {form.noSuratJalan ? "Ganti" : "Pilih"}
                </button>
              </div>
            </div>

            <FormField label="Keterangan" icon={<FileText size={14} />}>
              <textarea
                value={form.keterangan}
                onChange={(e) => set("keterangan", e.target.value)}
                rows={2}
                placeholder="Alasan retur secara umum..."
                className={cn(inputClass, "resize-y")}
              />
            </FormField>

            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Package size={14} className="text-slate-400" /> Barang Diretur
              </label>

              {form.items.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center text-xs text-slate-400">
                  Belum ada barang. Pilih Delivery Order untuk memuat barang yang bisa diretur.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Nama Barang</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[16%]">Gudang</th>
                        <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[12%]">Maks Retur</th>
                        <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[14%]">Qty Retur</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[20%]">Alasan</th>
                        <th className="px-3 py-2.5 w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-700">{item.productName}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">{item.warehouseName || "—"}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{item.maxReturnable}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={item.maxReturnable}
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  qty: Math.max(0, Math.min(Number(e.target.value), item.maxReturnable)),
                                })
                              }
                              className={cn(inputClass, "py-1.5 text-right")}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => updateItem(item.id, { reason: e.target.value })}
                              placeholder="Opsional..."
                              className={cn(inputClass, "py-1.5")}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 hover:bg-navy-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Retur"}
            </button>
          </div>
        </div>
      </div>

      <SalesReturnDOPickerModal
        open={doPickerOpen}
        onClose={() => setDoPickerOpen(false)}
        customerId={form.customerId ?? 0}
        customerName={form.pelanggan ?? ""}
        onConfirm={handleDoConfirm}
      />
    </>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({
  label, icon, required, hint, children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-400 font-bold">*</span>}
        {hint && <span className="ml-auto text-[10px] font-normal text-slate-400 normal-case tracking-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
