"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Hash,
  FileText,
  CreditCard,
  Info,
  Calendar,
} from "lucide-react";

export interface UangMukaFormData {
  id: number;
  pelanggan: string;
  noFaktur: string;
  tanggal: string;
  uangMuka: number;
  noPO: string;
  kenaPajak: boolean;
  totalTermasukPajak: boolean;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
  fakturType: string;
}

interface UangMukaModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UangMukaFormData) => void;
  onProses?: (data: UangMukaFormData) => void;
  initialData?: UangMukaFormData;
  isSaved?: boolean;
}

const today = new Date().toLocaleDateString("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const EMPTY_FORM: UangMukaFormData = {
  id: 0,
  pelanggan: "",
  noFaktur: "",
  tanggal: today,
  uangMuka: 0,
  noPO: "",
  kenaPajak: false,
  totalTermasukPajak: true,
  syaratPembayaran: "",
  alamat: "",
  keterangan: "",
  fakturType: "Faktur Penjualan",
};

type Tab = "uang-muka" | "info-lainnya";

export function UangMukaModal({
  open,
  onClose,
  onSubmit,
  onProses,
  initialData,
  isSaved = false,
}: UangMukaModalProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<UangMukaFormData>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<Tab>("uang-muka");
  const [saved, setSaved] = useState(isSaved);

  useEffect(() => {
    setForm(initialData ?? EMPTY_FORM);
    setSaved(isSaved);
    setActiveTab("uang-muka");
  }, [initialData, isSaved, open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = <K extends keyof UangMukaFormData>(
    field: K,
    value: UangMukaFormData[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    onSubmit(form);
    setSaved(true);
  };

  const handleProses = () => {
    if (onProses) onProses(form);
  };

  if (!open) return null;

  const subTotal = form.uangMuka;
  const total = form.uangMuka * (form.kenaPajak ? 1.11 : 1);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            bg-white rounded-2xl shadow-2xl
            w-full max-w-4xl
            border border-slate-200
            overflow-hidden
            flex flex-col
            max-h-[96vh]
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Uang Muka" : "Tambah Uang Muka Baru"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit
                  ? "Perbarui data uang muka"
                  : "Isi data uang muka di bawah ini"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="
                w-8 h-8 rounded-lg flex items-center justify-center
                text-slate-400 hover:text-white hover:bg-white/10
                transition-colors
              "
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto">
            {/* Top Fields */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pelanggan */}
              <FormField label="Pelanggan" icon={<User size={14} />} required>
                <div className="relative">
                  <input
                    type="text"
                    value={form.pelanggan}
                    onChange={(e) => set("pelanggan", e.target.value)}
                    placeholder="Cari/Pilih Pelanggan..."
                    className={inputClass}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    🔍
                  </span>
                </div>
              </FormField>

              {/* No Faktur */}
              <FormField label="No Faktur #" icon={<Hash size={14} />} required>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() =>
                      set("noFaktur", form.noFaktur ? "" : "AUTO")
                    }
                    className={`w-10 h-5 rounded-full transition-colors shrink-0 ${
                      form.noFaktur ? "bg-navy-900" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                        form.noFaktur ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>

                  <select
                    value={form.fakturType}
                    onChange={(e) => set("fakturType", e.target.value)}
                    className={inputClass}
                  >
                    <option>Faktur Penjualan</option>
                    <option>Faktur Proforma</option>
                  </select>
                </div>
              </FormField>

              {/* Tanggal */}
              <FormField label="Tanggal" icon={<Calendar size={14} />} required>
                <input
                  type="text"
                  value={form.tanggal}
                  onChange={(e) => set("tanggal", e.target.value)}
                  className={inputClass}
                  placeholder="DD/MM/YYYY"
                />
              </FormField>

              {/* Proses Button */}
              <div className="flex items-end justify-end">
                <button
                  disabled={!saved}
                  onClick={handleProses}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    saved
                      ? "bg-navy-900 text-gold-400 hover:bg-navy-700 shadow-sm"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Proses ▾
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50">
              {(
                [
                  { id: "uang-muka", label: "💳 Uang Muka" },
                  { id: "info-lainnya", label: "ℹ️ Info Lainnya" },
                ] as { id: Tab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                    activeTab === tab.id
                      ? "border-navy-900 text-navy-900"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="px-6 py-5">
              {activeTab === "uang-muka" && (
                <div className="space-y-4">
                  <FormField
                    label="Uang Muka"
                    icon={<CreditCard size={14} />}
                    required
                  >
                    <div className="relative">
                      <input
                        type="number"
                        value={form.uangMuka}
                        onChange={(e) =>
                          set("uangMuka", Number(e.target.value))
                        }
                        className={inputClass + " pr-10"}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                        ⊞
                      </span>
                    </div>
                  </FormField>

                  <FormField label="No. PO" icon={<Hash size={14} />}>
                    <input
                      type="text"
                      value={form.noPO}
                      onChange={(e) => set("noPO", e.target.value)}
                      placeholder="Nomor Purchase Order"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Pajak" icon={<Info size={14} />}>
                    <div className="flex flex-wrap gap-6 items-center pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.kenaPajak}
                          onChange={(e) => set("kenaPajak", e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 accent-navy-900"
                        />
                        Kena Pajak
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.totalTermasukPajak}
                          onChange={(e) =>
                            set("totalTermasukPajak", e.target.checked)
                          }
                          className="w-4 h-4 rounded border-slate-300 accent-navy-900"
                        />
                        Total termasuk Pajak
                      </label>
                    </div>
                  </FormField>

                  {/* Sub Total & Total Summary */}
                  <div className="border-t border-slate-100 pt-4 flex justify-end gap-8 text-sm">
                    <div className="text-right">
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                        Sub Total
                      </p>
                      <p className="text-slate-800 font-bold mt-1">
                        {subTotal.toLocaleString("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                        Total
                      </p>
                      <p className="text-navy-900 font-bold mt-1">
                        {total.toLocaleString("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "info-lainnya" && (
                <div className="space-y-4">
                  <FormField
                    label="Syarat Pembayaran"
                    icon={<FileText size={14} />}
                  >
                    <div className="relative">
                      <input
                        type="text"
                        value={form.syaratPembayaran}
                        onChange={(e) =>
                          set("syaratPembayaran", e.target.value)
                        }
                        placeholder="Cari/Pilih..."
                        className={inputClass}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        🔍
                      </span>
                    </div>
                  </FormField>

                  <FormField label="Alamat" icon={<Info size={14} />}>
                    <textarea
                      value={form.alamat}
                      onChange={(e) => set("alamat", e.target.value)}
                      rows={4}
                      placeholder="Masukkan alamat pengiriman..."
                      className={inputClass + " resize-y"}
                    />
                  </FormField>

                  <FormField label="Keterangan" icon={<FileText size={14} />}>
                    <textarea
                      value={form.keterangan}
                      onChange={(e) => set("keterangan", e.target.value)}
                      rows={4}
                      placeholder="Catatan tambahan..."
                      className={inputClass + " resize-y"}
                    />
                  </FormField>
                </div>
              )}
            </div>

            {/* Proses Ke Section */}
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/60">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Proses Ke
              </p>

              {!saved && (
                <p className="text-xs text-slate-400 mb-4">
                  ✓ Simpan Uang Muka terlebih dahulu untuk mengaktifkan proses
                  lanjutan.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    icon: "💳",
                    label: "Penerimaan Penjualan",
                    desc: "Catat penerimaan dari uang muka ini",
                    action: handleProses,
                  },
                  {
                    icon: "🚚",
                    label: "Pengiriman",
                    desc: "Buat dokumen pengiriman dari SO ini",
                    action: () => {},
                  },
                  {
                    icon: "🧾",
                    label: "Faktur",
                    desc: "Buat faktur penjualan dari SO ini",
                    action: () => {},
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    disabled={!saved}
                    onClick={item.action}
                    className={`rounded-xl border p-4 text-left transition-all group ${
                      saved
                        ? "border-slate-200 bg-white hover:border-navy-400 hover:shadow-md cursor-pointer"
                        : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-2xl block mb-2">{item.icon}</span>

                    <p
                      className={`text-xs font-bold ${
                        saved
                          ? "text-navy-900 group-hover:text-navy-600"
                          : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
            <button
              onClick={onClose}
              className="
                px-4 py-2 text-sm font-semibold text-slate-600
                bg-white border border-slate-200 rounded-lg
                hover:bg-slate-100 transition-colors
              "
            >
              Batal
            </button>

            <button
              onClick={handleSubmit}
              className="
                px-5 py-2 text-sm font-semibold text-gold-400
                bg-navy-900 hover:bg-navy-700 rounded-lg
                transition-colors shadow-sm
              "
            >
              {isEdit ? "Simpan Perubahan" : "Simpan Uang Muka"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

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
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-400 font-bold">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all
`;