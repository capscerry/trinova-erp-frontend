"use client";

import { useState, useEffect } from "react";
import { X, User, Landmark, Calendar, Hash, FileText, RefreshCw, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  type PenerimaanFormData,
  EMPTY_FORM,
  generateNoBukti,
  todayStr,
  inputClass,
  mapFormToApiPayload,
} from "./PenerimaanPenjualanType";
import {
  bankService,
  type Bank,
  penerimaanPenjualanService,
  uangMukaService,
  type UangMuka,
} from "@/lib/services/penjualan.service";
import { customerService } from "@/lib/services/customer.service";
import { salesInvoiceService, type SalesInvoice } from "@/lib/services/sales-invoice.service";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PenerimaanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PenerimaanFormData) => void;
  initialData?: Partial<PenerimaanFormData>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PenerimaanModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: PenerimaanModalProps) {
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState<PenerimaanFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Customer dropdown — fetch dari API /api/customer/active ──
  const [customerOptions, setCustomerOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");

  useEffect(() => {
    if (!open) return;

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

  // ── Bank dropdown — fetch dari API /api/bank ─────────
  const [bankOptions, setBankOptions] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [filterBank, setFilterBank] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState<SalesInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showInvoicePicker, setShowInvoicePicker] = useState(false);
  const [uangMukaOptions, setUangMukaOptions] = useState<UangMuka[]>([]);
  const [loadingUangMuka, setLoadingUangMuka] = useState(false);
  const [showUangMukaPicker, setShowUangMukaPicker] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadBanks = async () => {
      try {
        setLoadingBanks(true);
        const data = await bankService.getAll();
        setBankOptions(data);
      } catch (err) {
        console.error("Gagal memuat data bank:", err);
        setBankOptions([]);
      } finally {
        setLoadingBanks(false);
      }
    };
    loadBanks();
  }, [open]);

  // ── Initialize form ───────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const data = initialData ?? {};

    setForm({
      id: data.id,
      customerId: data.customerId,
      pelanggan: data.pelanggan ?? "",
      bankId: data.bankId,
      bank: data.bank ?? "",
      nilaiPembayaran: Number(data.nilaiPembayaran ?? 0),
      tanggalBayar: data.tanggalBayar ?? todayStr(),
      noBukti: data.noBukti ?? generateNoBukti(),
      noBuktiMode: data.noBuktiMode ?? "auto",
      keterangan: data.keterangan ?? "",
      uangMukaId: data.uangMukaId ?? undefined,
      salesOrderId: data.salesOrderId ?? undefined,
      salesInvoiceId: data.salesInvoiceId ?? undefined,
    });
  }, [initialData, open]);

  // ── Escape to close ──────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const set = <K extends keyof PenerimaanFormData>(field: K, value: PenerimaanFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Customer selection ───────────────────────────────
  const filteredCustomers = customerOptions.filter((c) =>
    c.name.toLowerCase().includes(filterCustomer.toLowerCase())
  );

  const handleSelectCustomer = (customer: { id: number; name: string }) => {
    setForm((prev) => ({ ...prev, pelanggan: customer.name, customerId: customer.id }));
    setShowCustomerDropdown(false);
    setFilterCustomer("");
  };

  // ── Bank selection ───────────────────────────────────
  const filteredBanks = bankOptions.filter((b) =>
    b.nama.toLowerCase().includes(filterBank.toLowerCase())
  );

  const handleSelectBank = (bank: Bank) => {
    setForm((prev) => ({ ...prev, bank: bank.nama, bankId: bank.id }));
    setShowBankDropdown(false);
    setFilterBank("");
  };

  const loadSalesInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const invoices = await salesInvoiceService.getAll();
      setInvoiceOptions(
        invoices.filter((invoice) => {
          const matchesCustomer = !form.customerId || invoice.customerId === form.customerId;
          const isOutstanding = Number(invoice.remainingAmount ?? 0) > 0;
          const isPayable = !["Paid", "Cancelled"].includes(String(invoice.status));
          return matchesCustomer && isOutstanding && isPayable;
        })
      );
      setShowInvoicePicker(true);
    } catch (err) {
      console.error("Gagal memuat faktur penjualan:", err);
      alert("Gagal memuat faktur penjualan");
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSelectInvoice = (invoice: SalesInvoice) => {
    setForm((prev) => ({
      ...prev,
      customerId: invoice.customerId,
      pelanggan: invoice.customerName || prev.pelanggan,
      nilaiPembayaran: Number(invoice.remainingAmount ?? invoice.grandTotal ?? 0),
      salesInvoiceId: invoice.id,
      salesOrderId: invoice.salesOrderId,
      uangMukaId: undefined,
      keterangan: `Pembayaran faktur ${invoice.invoiceNumber}`,
    }));
    setShowInvoicePicker(false);
  };

  const loadUangMuka = async () => {
    try {
      setLoadingUangMuka(true);
      const list = await uangMukaService.getAll();
      setUangMukaOptions(
        list.filter((item) => {
          const matchesCustomer = !form.customerId || item.customerId === form.customerId;
          const status = String(item.status ?? "").toLowerCase();
          const canReceive = !["received", "cancelled", "dibatalkan"].includes(status);
          return matchesCustomer && canReceive;
        })
      );
      setShowUangMukaPicker(true);
    } catch (err) {
      console.error("Gagal memuat uang muka:", err);
      alert("Gagal memuat uang muka");
    } finally {
      setLoadingUangMuka(false);
    }
  };

  const handleSelectUangMuka = (uangMuka: UangMuka) => {
    setForm((prev) => ({
      ...prev,
      customerId: uangMuka.customerId,
      pelanggan: uangMuka.customerName || prev.pelanggan,
      nilaiPembayaran: Number(uangMuka.totalAmount ?? uangMuka.nominalUangMuka ?? 0),
      uangMukaId: uangMuka.id,
      salesOrderId: undefined,
      salesInvoiceId: undefined,
      keterangan: `Pembayaran uang muka ${uangMuka.noFaktur}`,
    }));
    setShowUangMukaPicker(false);
  };

  // ── No Bukti mode toggle ──────────────────────────────
  const switchNoBuktiMode = (mode: "auto" | "manual") => {
    set("noBuktiMode", mode);
    if (mode === "auto") set("noBukti", generateNoBukti());
  };

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.customerId) {
      alert("⚠️ Pelanggan (Terima dari) wajib dipilih");
      return;
    }
    if (!form.bankId) {
      alert("⚠️ Bank wajib dipilih");
      return;
    }
    if (!form.nilaiPembayaran || form.nilaiPembayaran <= 0) {
      alert("⚠️ Nilai pembayaran wajib diisi");
      return;
    }
    if (!form.noBukti.trim()) {
      alert("⚠️ No Bukti wajib diisi");
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEdit) {
        const payload = mapFormToApiPayload(form);
        await penerimaanPenjualanService.update(form.id!, payload);
        onSubmit(form);
        return;
      }

      const payload = mapFormToApiPayload(form);
      await penerimaanPenjualanService.create(payload);
      onSubmit(form);
    } catch (err: unknown) {
      console.error("❌ Gagal menyimpan penerimaan penjualan:", err);
      const message =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : "Terjadi kesalahan";
      alert(
        "Gagal menyimpan data: " + message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Penerimaan Penjualan" : "Tambah Penerimaan Penjualan"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit ? "Perbarui data penerimaan" : "Catat pembayaran yang diterima dari pelanggan"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Terima dari (Customer) */}
            <FormField label="Terima dari" icon={<User size={14} />} required>
              <div className="relative">
                <input
                  type="text"
                  value={showCustomerDropdown ? filterCustomer : form.pelanggan ?? ""}
                  onChange={(e) => {
                    if (showCustomerDropdown) setFilterCustomer(e.target.value);
                  }}
                  onFocus={() => {
                    setShowCustomerDropdown(true);
                    setFilterCustomer("");
                  }}
                  placeholder={loadingCustomers ? "Memuat pelanggan..." : "Cari/Pilih Pelanggan..."}
                  disabled={loadingCustomers}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  {loadingCustomers ? "⏳" : "🔍"}
                </span>

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

            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                    Ambil dari Sales Invoice
                  </p>
                  <p className="mt-0.5 text-[11px] text-sky-600">
                    Pilih faktur yang masih memiliki sisa tagihan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadSalesInvoices}
                  disabled={loadingInvoices}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingInvoices ? "Memuat..." : "Pilih"}
                </button>
              </div>

              {form.salesInvoiceId && (
                <div className="mt-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-sky-700">
                  Invoice terpilih ID #{form.salesInvoiceId}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Ambil dari Uang Muka
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-600">
                    Pilih uang muka yang belum diterima penuh
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadUangMuka}
                  disabled={loadingUangMuka}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingUangMuka ? "Memuat..." : "Pilih"}
                </button>
              </div>

              {form.uangMukaId && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
                  Uang muka terpilih ID #{form.uangMukaId}
                </div>
              )}
            </div>

            {/* Bank (uang dikirim melalui apa) */}
            <FormField label="Bank" icon={<Landmark size={14} />} required hint="Rekening tujuan pembayaran">
              <div className="relative">
                <input
                  type="text"
                  value={showBankDropdown ? filterBank : form.bank ?? ""}
                  onChange={(e) => {
                    if (showBankDropdown) setFilterBank(e.target.value);
                  }}
                  onFocus={() => {
                    setShowBankDropdown(true);
                    setFilterBank("");
                  }}
                  placeholder={loadingBanks ? "Memuat bank..." : "Cari/Pilih Bank..."}
                  disabled={loadingBanks}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  {loadingBanks ? "⏳" : "🔍"}
                </span>

                {showBankDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBankDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {filteredBanks.length > 0 ? (
                        filteredBanks.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => handleSelectBank(bank)}
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-navy-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <div className="font-medium text-slate-700">{bank.nama}</div>
                            <div className="text-xs text-slate-400 font-mono">
                              {bank.noRekening}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2.5 text-sm text-slate-500 text-center">Tidak ada hasil</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </FormField>

            {/* Nilai Pembayaran */}
            <FormField label="Nilai Pembayaran" icon={<Hash size={14} />} required>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.nilaiPembayaran ? form.nilaiPembayaran.toLocaleString("id-ID") : ""}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    set("nilaiPembayaran", raw ? Number(raw) : 0);
                  }}
                  className={cn(inputClass, "pr-10")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span>
              </div>
            </FormField>

            {/* Tanggal Bayar */}
            <FormField label="Tanggal Bayar" icon={<Calendar size={14} />} required>
              <input
                type="date"
                value={form.tanggalBayar}
                onChange={(e) => set("tanggalBayar", e.target.value)}
                className={inputClass}
              />
            </FormField>

            {/* No Bukti — toggle auto/manual */}
            <FormField
              label="No Bukti"
              icon={<FileText size={14} />}
              required
              hint={form.noBuktiMode === "auto" ? "Auto-generate" : "Input manual"}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => switchNoBuktiMode("auto")}
                    title="Auto-generate"
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                      form.noBuktiMode === "auto"
                        ? "bg-navy-900 text-gold-400 shadow-sm"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => switchNoBuktiMode("manual")}
                    title="Input manual"
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                      form.noBuktiMode === "manual"
                        ? "bg-navy-900 text-gold-400 shadow-sm"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <PenLine size={13} />
                  </button>
                </div>

                <div className="relative flex-1">
                  <input
                    readOnly={form.noBuktiMode === "auto"}
                    value={form.noBukti}
                    onChange={(e) => {
                      if (form.noBuktiMode === "manual") set("noBukti", e.target.value);
                    }}
                    placeholder={form.noBuktiMode === "manual" ? "Masukkan no bukti..." : ""}
                    className={cn(
                      inputClass,
                      "font-mono",
                      form.noBuktiMode === "auto"
                        ? "bg-slate-50 text-slate-500 cursor-not-allowed pr-10"
                        : "bg-white"
                    )}
                  />
                  {form.noBuktiMode === "auto" && (
                    <button
                      type="button"
                      onClick={() => set("noBukti", generateNoBukti())}
                      title="Generate ulang"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors"
                    >
                      <RefreshCw size={12} />
                    </button>
                  )}
                </div>
              </div>
            </FormField>

            {/* Keterangan */}
            <FormField label="Keterangan" icon={<FileText size={14} />}>
              <textarea
                value={form.keterangan ?? ""}
                onChange={(e) => set("keterangan", e.target.value)}
                rows={3}
                placeholder="Catatan tambahan..."
                className={cn(inputClass, "resize-y")}
              />
            </FormField>
          </div>

          {/* Footer */}
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
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Penerimaan"}
            </button>
          </div>
        </div>
      </div>

      {showInvoicePicker && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowInvoicePicker(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-sky-600 px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Pilih Sales Invoice</h3>
                  <p className="text-xs text-sky-100">
                    {form.pelanggan || "Invoice outstanding"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvoicePicker(false)}
                  className="text-sky-100 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-4">
                {invoiceOptions.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Tidak ada invoice outstanding untuk customer ini
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {invoiceOptions.map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() => handleSelectInvoice(invoice)}
                        className="grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-800">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {invoice.customerName}
                            {invoice.salesOrderNumber ? ` • ${invoice.salesOrderNumber}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-navy-900">
                            {formatRupiah(invoice.remainingAmount)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">{invoice.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showUangMukaPicker && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowUangMukaPicker(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-emerald-600 px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Pilih Uang Muka</h3>
                  <p className="text-xs text-emerald-100">
                    {form.pelanggan || "Down payment outstanding"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUangMukaPicker(false)}
                  className="text-emerald-100 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-4">
                {uangMukaOptions.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Tidak ada uang muka outstanding untuk customer ini
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {uangMukaOptions.map((uangMuka) => (
                      <button
                        key={uangMuka.id}
                        type="button"
                        onClick={() => handleSelectUangMuka(uangMuka)}
                        className="grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-800">
                            {uangMuka.noFaktur}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {uangMuka.customerName}
                            {uangMuka.nomorSo ? ` • ${uangMuka.nomorSo}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-navy-900">
                            {formatRupiah(uangMuka.totalAmount ?? uangMuka.nominalUangMuka)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">{uangMuka.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({
  label,
  icon,
  required,
  hint,
  children,
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
