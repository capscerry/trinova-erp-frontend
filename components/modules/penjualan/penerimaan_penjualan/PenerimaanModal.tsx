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
  DUMMY_CUSTOMERS,
  DUMMY_BANKS,
} from "./PenerimaanPenjualanType";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PenerimaanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PenerimaanFormData) => void;
  initialData?: Partial<PenerimaanFormData> | any;
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

  // ── Customer dropdown (dummy, sebelum API tersedia) ──
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");

  // ── Bank dropdown (dummy, sebelum API tersedia) ──────
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [filterBank, setFilterBank] = useState("");

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
  const filteredCustomers = DUMMY_CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(filterCustomer.toLowerCase())
  );

  const handleSelectCustomer = (customer: { id: number; name: string }) => {
    setForm((prev) => ({ ...prev, pelanggan: customer.name, customerId: customer.id }));
    setShowCustomerDropdown(false);
    setFilterCustomer("");
  };

  // ── Bank selection ───────────────────────────────────
  const filteredBanks = DUMMY_BANKS.filter((b) =>
    b.nama.toLowerCase().includes(filterBank.toLowerCase())
  );

  const handleSelectBank = (bank: typeof DUMMY_BANKS[number]) => {
    setForm((prev) => ({ ...prev, bank: bank.nama, bankId: bank.id }));
    setShowBankDropdown(false);
    setFilterBank("");
  };

  // ── No Bukti mode toggle ──────────────────────────────
  const switchNoBuktiMode = (mode: "auto" | "manual") => {
    set("noBuktiMode", mode);
    if (mode === "auto") set("noBukti", generateNoBukti());
  };

  // ── Submit (sementara: tanpa hit API) ─────────────────
  const handleSubmit = () => {
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

    setIsSubmitting(true);
    // TODO: ganti dengan call API saat backend tersedia
    setTimeout(() => {
      setIsSubmitting(false);
      onSubmit(form);
    }, 300);
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
                  placeholder="Cari/Pilih Pelanggan..."
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>

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
                        <div className="px-3 py-2.5 text-sm text-slate-500 text-center">Tidak ada hasil</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </FormField>

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
                  placeholder="Cari/Pilih Bank..."
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>

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
                              {bank.noRekening} · {bank.namaRekening}
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