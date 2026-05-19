"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Hash,
  FileText,
  MapPin,
  Info,
  Calendar,
  Truck,
  Package,
  ClipboardList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PengirimanItem {
  id: number;
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  qtyDipesan: number;
  qtyDikirim: number;
  keterangan: string;
}

export interface PengirimanFormData {
  id: number;
  pelanggan: string;
  noSuratJalan: string;
  tanggal: string;
  noSO: string;
  noPO: string;
  ekspedisi: string;
  noResi: string;
  alamatPengiriman: string;
  kotaTujuan: string;
  keterangan: string;
  fakturType: string;
  items: PengirimanItem[];
}

interface PengirimanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PengirimanFormData) => void;
  onProses?: (data: PengirimanFormData) => void;
  initialData?: PengirimanFormData;
  isSaved?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const today = new Date().toLocaleDateString("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const EMPTY_FORM: PengirimanFormData = {
  id: 0,
  pelanggan: "",
  noSuratJalan: "",
  tanggal: today,
  noSO: "",
  noPO: "",
  ekspedisi: "",
  noResi: "",
  alamatPengiriman: "",
  kotaTujuan: "",
  keterangan: "",
  fakturType: "Faktur Penjualan",
  items: [],
};

const EMPTY_ITEM: PengirimanItem = {
  id: 0,
  kodeBarang: "",
  namaBarang: "",
  satuan: "PCS",
  qtyDipesan: 0,
  qtyDikirim: 0,
  keterangan: "",
};

type Tab = "pengiriman" | "barang" | "info-lainnya";

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputClass = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
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

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function PengirimanModal({
  open,
  onClose,
  onSubmit,
  onProses,
  initialData,
  isSaved = false,
}: PengirimanModalProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<PengirimanFormData>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<Tab>("pengiriman");
  const [saved, setSaved] = useState(isSaved);

  useEffect(() => {
    setForm(initialData ?? EMPTY_FORM);
    setSaved(isSaved);
    setActiveTab("pengiriman");
  }, [initialData, isSaved, open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = <K extends keyof PengirimanFormData>(
    field: K,
    value: PengirimanFormData[K]
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  // ── Item handlers ────────────────────────────────────────────────────────
  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...EMPTY_ITEM, id: Date.now() },
      ],
    }));
  };

  const updateItem = <K extends keyof PengirimanItem>(
    idx: number,
    field: K,
    value: PengirimanItem[K]
  ) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
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

  const totalQtyDipesan = form.items.reduce((s, i) => s + i.qtyDipesan, 0);
  const totalQtyDikirim = form.items.reduce((s, i) => s + i.qtyDikirim, 0);

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
            w-full max-w-5xl
            border border-slate-200
            overflow-hidden
            flex flex-col
            max-h-[96vh]
          "
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Pengiriman Penjualan" : "Tambah Pengiriman Penjualan"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit
                  ? "Perbarui data pengiriman"
                  : "Isi data surat jalan di bawah ini"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Top Fields ── */}
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                </div>
              </FormField>

              {/* No Surat Jalan */}
              <FormField label="No Surat Jalan #" icon={<Hash size={14} />} required>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => set("noSuratJalan", form.noSuratJalan ? "" : "AUTO")}
                    className={`w-10 h-5 rounded-full transition-colors shrink-0 ${
                      form.noSuratJalan ? "bg-navy-900" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                        form.noSuratJalan ? "translate-x-5" : "translate-x-0"
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

            {/* ── Tabs ── */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50">
              {(
                [
                  { id: "pengiriman", label: "🚚 Pengiriman" },
                  { id: "barang",     label: "📦 Barang"     },
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

            {/* ── Tab Content ── */}
            <div className="px-6 py-5">

              {/* TAB: Pengiriman */}
              {activeTab === "pengiriman" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="No. Sales Order (SO)" icon={<ClipboardList size={14} />}>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.noSO}
                          onChange={(e) => set("noSO", e.target.value)}
                          placeholder="Cari/Pilih SO..."
                          className={inputClass}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
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

                    <FormField label="Ekspedisi / Kurir" icon={<Truck size={14} />}>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.ekspedisi}
                          onChange={(e) => set("ekspedisi", e.target.value)}
                          placeholder="Cari/Pilih Ekspedisi..."
                          className={inputClass}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                      </div>
                    </FormField>

                    <FormField label="No. Resi / AWB" icon={<Hash size={14} />}>
                      <input
                        type="text"
                        value={form.noResi}
                        onChange={(e) => set("noResi", e.target.value)}
                        placeholder="Nomor resi pengiriman"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Kota Tujuan" icon={<MapPin size={14} />}>
                      <input
                        type="text"
                        value={form.kotaTujuan}
                        onChange={(e) => set("kotaTujuan", e.target.value)}
                        placeholder="Kota/Kabupaten tujuan"
                        className={inputClass}
                      />
                    </FormField>
                  </div>

                  <FormField label="Alamat Pengiriman" icon={<MapPin size={14} />}>
                    <textarea
                      value={form.alamatPengiriman}
                      onChange={(e) => set("alamatPengiriman", e.target.value)}
                      rows={3}
                      placeholder="Masukkan alamat pengiriman lengkap..."
                      className={inputClass + " resize-y"}
                    />
                  </FormField>
                </div>
              )}

              {/* TAB: Barang */}
              {activeTab === "barang" && (
                <div className="space-y-4">
                  {/* Summary */}
                  {form.items.length > 0 && (
                    <div className="flex gap-6 justify-end text-sm border-b border-slate-100 pb-3">
                      <div className="text-right">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Dipesan</p>
                        <p className="text-slate-800 font-bold mt-1">{totalQtyDipesan.toLocaleString("id-ID")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Dikirim</p>
                        <p className="text-navy-900 font-bold mt-1">{totalQtyDikirim.toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  )}

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {["Kode Barang", "Nama Barang", "Satuan", "Qty Dipesan", "Qty Dikirim", "Keterangan", ""].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                              Belum ada barang. Klik + Tambah Baris untuk menambahkan.
                            </td>
                          </tr>
                        ) : (
                          form.items.map((item, idx) => (
                            <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={item.kodeBarang}
                                  onChange={(e) => updateItem(idx, "kodeBarang", e.target.value)}
                                  placeholder="Kode"
                                  className={inputClass + " min-w-[90px]"}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={item.namaBarang}
                                  onChange={(e) => updateItem(idx, "namaBarang", e.target.value)}
                                  placeholder="Nama barang"
                                  className={inputClass + " min-w-[160px]"}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={item.satuan}
                                  onChange={(e) => updateItem(idx, "satuan", e.target.value)}
                                  placeholder="PCS"
                                  className={inputClass + " min-w-[70px]"}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  value={item.qtyDipesan}
                                  onChange={(e) => updateItem(idx, "qtyDipesan", Number(e.target.value))}
                                  className={inputClass + " min-w-[90px]"}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  value={item.qtyDikirim}
                                  onChange={(e) => updateItem(idx, "qtyDikirim", Number(e.target.value))}
                                  className={inputClass + " min-w-[90px]"}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={item.keterangan}
                                  onChange={(e) => updateItem(idx, "keterangan", e.target.value)}
                                  placeholder="Catatan..."
                                  className={inputClass + " min-w-[120px]"}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  onClick={() => removeItem(idx)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-1 rounded"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={addItem}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-navy-900 border border-navy-200 bg-navy-50 hover:bg-navy-100 transition-colors"
                  >
                    <Package size={13} />
                    + Tambah Baris
                  </button>
                </div>
              )}

              {/* TAB: Info Lainnya */}
              {activeTab === "info-lainnya" && (
                <div className="space-y-4">
                  <FormField label="Keterangan" icon={<Info size={14} />}>
                    <textarea
                      value={form.keterangan}
                      onChange={(e) => set("keterangan", e.target.value)}
                      rows={4}
                      placeholder="Catatan tambahan untuk pengiriman ini..."
                      className={inputClass + " resize-y"}
                    />
                  </FormField>
                </div>
              )}
            </div>

            {/* ── Proses Ke Section ── */}
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/60">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Proses Ke
              </p>

              {!saved && (
                <p className="text-xs text-slate-400 mb-4">
                  ✓ Simpan Pengiriman terlebih dahulu untuk mengaktifkan proses lanjutan.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    icon: "🧾",
                    label: "Faktur Penjualan",
                    desc: "Buat faktur dari surat jalan ini",
                    action: handleProses,
                  },
                  {
                    icon: "💳",
                    label: "Penerimaan Penjualan",
                    desc: "Catat penerimaan pembayaran",
                    action: () => {},
                  },
                  {
                    icon: "🔄",
                    label: "Retur Penjualan",
                    desc: "Proses retur barang dari pelanggan",
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
                        saved ? "text-navy-900 group-hover:text-navy-600" : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 hover:bg-navy-700 rounded-lg transition-colors shadow-sm"
            >
              {isEdit ? "Simpan Perubahan" : "Simpan Pengiriman"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}