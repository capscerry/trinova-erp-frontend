"use client";

import { useState, useEffect } from "react";
import {
  X, Hash, Calendar, User, MapPin, FileText, Truck,
  RefreshCw, PenLine, FileDown, Package, Trash2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";

import {
  type PengirimanFormData,
  type PengirimanItemForm,
  EMPTY_FORM,
  generateNoSuratJalan,
  todayStr,
  mapFormToApiPayload,
  newPengirimanItem,
  inputClass,
} from "./PengirimanType";
import {
  PengirimanSOPickerModal,
  type PengirimanSOPickerResultItem,
} from "../PengirimanSOPickerModal";
import {
  pengirimanPenjualanService,
  shippingTypeService,
  type ShippingType,
} from "@/lib/services/pengiriman-penjualan.service";
import { customerService } from "@/lib/services/customer.service";
import { getWarehouses, type Warehouse } from "@/lib/services/warehouse.service";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PengirimanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PengirimanFormData) => void;
  onProses?: (data: PengirimanFormData) => void;
  initialData?: Partial<PengirimanFormData>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PengirimanModal({
  open,
  onClose,
  onSubmit,
  onProses,
  initialData,
}: PengirimanModalProps) {
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState<PengirimanFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Customer dropdown ────────────────────────────────
  const [customerOptions, setCustomerOptions] = useState<{ id: number; name: string; address: string }[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");

  // ── Tipe Pengiriman dropdown (hit API) ────────────────
  const [shippingTypes, setShippingTypes] = useState<ShippingType[]>([]);
  const [loadingShippingTypes, setLoadingShippingTypes] = useState(false);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);
  const [filterShipping, setFilterShipping] = useState("");

  // ── SO Picker ─────────────────────────────────────────
  const [soPickerOpen, setSoPickerOpen] = useState(false);

  // ── Gudang dropdown (wajib per baris — sumber pengurangan stok saat konfirmasi) ──
  const [warehouseOptions, setWarehouseOptions] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const data = await customerService.getAllActive();
        setCustomerOptions(data.map((c) => ({ id: Number(c.id), name: c.nama, address: c.alamat ?? "" })));
      } catch (err) {
        console.error("Gagal memuat data customer:", err);
        setCustomerOptions([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const loadShippingTypes = async () => {
      try {
        setLoadingShippingTypes(true);
        const data = await shippingTypeService.getAll();
        setShippingTypes(data);
      } catch (err) {
        console.error("Gagal memuat tipe pengiriman:", err);
        setShippingTypes([]);
      } finally {
        setLoadingShippingTypes(false);
      }
    };

    const loadWarehouses = async () => {
      try {
        setLoadingWarehouses(true);
        const data = await getWarehouses();
        setWarehouseOptions(data ?? []);
      } catch (err) {
        console.error("Gagal memuat data gudang:", err);
        setWarehouseOptions([]);
      } finally {
        setLoadingWarehouses(false);
      }
    };

    loadCustomers();
    loadShippingTypes();
    loadWarehouses();
  }, [open]);

  // ── Initialize form ───────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const data = initialData ?? {};

    setForm({
      id: data.id,
      customerId: data.customerId,
      pelanggan: data.pelanggan ?? "",
      noSuratJalan: data.noSuratJalan ?? generateNoSuratJalan(),
      noSuratJalanMode: data.noSuratJalanMode ?? "auto",
      tanggalKirim: data.tanggalKirim ?? todayStr(),
      salesOrderId: data.salesOrderId ?? undefined,
      noSo: data.noSo ?? "",
      noPO: data.noPO ?? "",
      shippingTypeId: data.shippingTypeId ?? undefined,
      shippingType: data.shippingType ?? "",
      alamatPengiriman: data.alamatPengiriman ?? "",
      keterangan: data.keterangan ?? "",
      items: data.items?.length
        ? data.items.map((it: Partial<PengirimanItemForm>) => ({
            id: it.id ?? crypto.randomUUID(),
            productId: it.productId,
            productCode: it.productCode ?? "",
            productName: it.productName ?? "",
            satuan: it.satuan ?? "",
            uomId: it.uomId,
            qtyDipesan: it.qtyDipesan ?? 0,
            qtyDikirim: it.qtyDikirim ?? 0,
            warehouseId: it.warehouseId,
            warehouseName: it.warehouseName ?? "",
          }))
        : [],
    });
  }, [initialData, open]);

  // ── Escape to close ──────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const set = <K extends keyof PengirimanFormData>(field: K, value: PengirimanFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Customer selection ───────────────────────────────
  const filteredCustomers = customerOptions.filter((c) =>
    c.name.toLowerCase().includes(filterCustomer.toLowerCase())
  );

  const handleSelectCustomer = (customer: { id: number; name: string; address: string }) => {
    setForm((prev) => ({
      ...prev,
      pelanggan: customer.name,
      customerId: customer.id,
      alamatPengiriman: customer.address,
      // Reset referensi SO sebelumnya saat ganti customer
      salesOrderId: undefined,
      noSo: "",
      noPO: "",
      items: [],
    }));
    setShowCustomerDropdown(false);
    setFilterCustomer("");
  };

  // ── Shipping type selection ───────────────────────────
  const filteredShippingTypes = shippingTypes.filter((s) =>
    s.nama.toLowerCase().includes(filterShipping.toLowerCase())
  );

  const handleSelectShippingType = (st: ShippingType) => {
    setForm((prev) => ({ ...prev, shippingType: st.nama, shippingTypeId: st.id }));
    setShowShippingDropdown(false);
    setFilterShipping("");
  };

  // ── No Surat Jalan mode toggle ─────────────────────────
  const switchNoSuratJalanMode = (mode: "auto" | "manual") => {
    set("noSuratJalanMode", mode);
    if (mode === "auto") set("noSuratJalan", generateNoSuratJalan());
  };

  // ── SO Picker confirm ─────────────────────────────────
  const handleSoConfirm = (
    so: { id: number; nomor: string; poNumber: string; alamat: string; tanggalKirim?: string },
    items: PengirimanSOPickerResultItem[]
  ) => {
    console.log("🔍 [PengirimanModal] Items diterima dari SO Picker (handleSoConfirm):", items);

    setForm((prev) => ({
      ...prev,
      salesOrderId: so.id,
      noSo: so.nomor,
      noPO: so.poNumber || prev.noPO,
      // Backend mengirim ISO datetime penuh (mis. "2026-07-15T00:00:00"),
      // sedangkan <input type="date"> hanya menerima persis "YYYY-MM-DD" —
      // kalau tidak dipotong, browser diam-diam menolak nilainya (tampil kosong).
      tanggalKirim: so.tanggalKirim ? so.tanggalKirim.split("T")[0] : prev.tanggalKirim,
      alamatPengiriman: so.alamat || prev.alamatPengiriman,
      items: items.map((it) => ({
        id: crypto.randomUUID(),
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        satuan: it.satuan,
        uomId: it.uomId,
        qtyDipesan: it.qtyDipesan,
        qtyDikirim: it.qtyDikirim,
        warehouseId: it.warehouseId,
        warehouseName: it.warehouseName ?? "",
      })),
    }));
    setSoPickerOpen(false);
  };

  const handleClearSoReference = () => {
    setForm((prev) => ({
      ...prev,
      salesOrderId: undefined,
      noSo: "",
      noPO: "",
      items: [],
    }));
  };

  // ── Manual item handlers (kalau buat sendiri tanpa SO) ────
  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, newPengirimanItem()] }));
  };

  const updateItem = (id: string, patch: Partial<PengirimanItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const removeItem = (id: string) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));
  };

  // Gudang wajib per baris — dipakai backend untuk menentukan stok mana yang
  // dikurangi saat Delivery Order dikonfirmasi. Prefilled dari SO (kalau ada)
  // tapi tetap bisa diganti di sini.
  const selectWarehouse = (id: string, warehouseId: number, warehouseName: string) => {
    updateItem(id, { warehouseId, warehouseName });
  };

  // ── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.customerId) {
      notify.warning("Pelanggan wajib dipilih");
      return;
    }
    if (!form.shippingTypeId) {
      notify.warning("Tipe Pengiriman wajib dipilih");
      return;
    }
    if (!form.noSuratJalan.trim()) {
      notify.warning("No Surat Jalan wajib diisi");
      return;
    }
    if (form.items.length === 0) {
      notify.warning("Tambahkan minimal 1 barang untuk dikirim");
      return;
    }
    if (form.items.some((it) => !it.warehouseId)) {
      notify.warning("Pilih gudang untuk setiap barang");
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEdit) {
        const payload = mapFormToApiPayload(form);
        await pengirimanPenjualanService.update(form.id!, payload);
        onSubmit(form);
        return;
      }
      console.log("🔍 [PengirimanModal] form.items sebelum mapping ke payload:", form.items);

      const payload = mapFormToApiPayload(form);
      console.log("🔍 [PengirimanModal] Payload FINAL yang dikirim ke POST /api/delivery-order:", JSON.stringify(payload, null, 2));

      const saved = await pengirimanPenjualanService.create(payload);
      const savedForm = {
        ...form,
        id: saved.id,
        noSuratJalan: saved.noSuratJalan || form.noSuratJalan,
      };
      setForm(savedForm);
      onSubmit(savedForm);
    } catch (err: unknown) {
      console.error("❌ Gagal menyimpan pengiriman:", err);
      notify.error("Gagal menyimpan pengiriman", getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const hasPelanggan = !!form.customerId;
  const totalDipesan = form.items.reduce((s, i) => s + i.qtyDipesan, 0);
  const totalDikirim = form.items.reduce((s, i) => s + i.qtyDikirim, 0);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Pengiriman Penjualan" : "Tambah Pengiriman Penjualan"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit ? "Perbarui data surat jalan" : "Buat surat jalan untuk pengiriman barang"}
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
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Top row: Customer + No Surat Jalan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
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

              {/* No Surat Jalan — toggle auto/manual */}
              <FormField
                label="No Surat Jalan"
                icon={<Hash size={14} />}
                required
                hint={form.noSuratJalanMode === "auto" ? "Auto-generate" : "Input manual"}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => switchNoSuratJalanMode("auto")}
                      title="Auto-generate"
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                        form.noSuratJalanMode === "auto"
                          ? "bg-navy-900 text-gold-400 shadow-sm"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => switchNoSuratJalanMode("manual")}
                      title="Input manual"
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                        form.noSuratJalanMode === "manual"
                          ? "bg-navy-900 text-gold-400 shadow-sm"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <PenLine size={13} />
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <input
                      readOnly={form.noSuratJalanMode === "auto"}
                      value={form.noSuratJalan}
                      onChange={(e) => {
                        if (form.noSuratJalanMode === "manual") set("noSuratJalan", e.target.value);
                      }}
                      placeholder={form.noSuratJalanMode === "manual" ? "Masukkan no surat jalan..." : ""}
                      className={cn(
                        inputClass,
                        "font-mono",
                        form.noSuratJalanMode === "auto"
                          ? "bg-slate-50 text-slate-500 cursor-not-allowed pr-10"
                          : "bg-white"
                      )}
                    />
                    {form.noSuratJalanMode === "auto" && (
                      <button
                        type="button"
                        onClick={() => set("noSuratJalan", generateNoSuratJalan())}
                        title="Generate ulang"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors"
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </FormField>
            </div>

            {/* Tanggal Kirim — di bawah Pelanggan; auto-terisi dari SO saat "Ambil dari Pesanan Penjualan" */}
            <FormField label="Tanggal Kirim" icon={<Calendar size={14} />} required>
              <input
                type="date"
                value={form.tanggalKirim}
                onChange={(e) => set("tanggalKirim", e.target.value)}
                className={inputClass}
              />
            </FormField>

            {/* Ambil dari Pesanan Penjualan */}
            <div
              className={cn(
                "rounded-xl border px-4 py-3 transition-all",
                hasPelanggan ? "border-sky-200 bg-sky-50/50" : "border-slate-200 bg-slate-50/50 opacity-60"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileDown size={14} className={hasPelanggan ? "text-sky-600" : "text-slate-400"} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-600">
                      Ambil dari Pesanan Penjualan
                    </span>
                    {form.noSo ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[11px] font-semibold font-mono">
                          {form.noSo}
                          <button
                            type="button"
                            onClick={handleClearSoReference}
                            className="hover:text-sky-900 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {hasPelanggan
                          ? "Opsional — pilih pesanan untuk mengisi barang otomatis"
                          : "Pilih pelanggan terlebih dahulu"}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSoPickerOpen(true)}
                  disabled={!hasPelanggan}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 inline-flex items-center gap-1.5",
                    hasPelanggan
                      ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <FileDown size={11} />
                  {form.noSo ? "Ganti" : "Pilih"}
                </button>
              </div>
            </div>

            {/* Tipe Pengiriman (search dropdown dari API) */}
            <FormField label="Tipe Pengiriman" icon={<Truck size={14} />} required>
              <div className="relative">
                <input
                  type="text"
                  value={showShippingDropdown ? filterShipping : form.shippingType ?? ""}
                  onChange={(e) => { if (showShippingDropdown) setFilterShipping(e.target.value); }}
                  onFocus={() => { setShowShippingDropdown(true); setFilterShipping(""); }}
                  placeholder={loadingShippingTypes ? "Memuat tipe pengiriman..." : "Cari/Pilih Tipe Pengiriman..."}
                  disabled={loadingShippingTypes}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  {loadingShippingTypes ? "⏳" : "🔍"}
                </span>

                {showShippingDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowShippingDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {filteredShippingTypes.length > 0 ? (
                        filteredShippingTypes.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleSelectShippingType(st)}
                            className="w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-navy-50 hover:text-navy-900 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            {st.nama}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2.5 text-sm text-slate-500 text-center">
                          {shippingTypes.length === 0 ? "Tidak ada data tipe pengiriman" : "Tidak ada hasil"}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </FormField>

            {/* No PO */}
            <FormField label="No PO" icon={<Hash size={14} />}>
              <input
                type="text"
                value={form.noPO ?? ""}
                onChange={(e) => set("noPO", e.target.value)}
                placeholder="Nomor Purchase Order..."
                className={inputClass}
              />
            </FormField>

            {/* Alamat Pengiriman */}
            <FormField label="Alamat Pengiriman" icon={<MapPin size={14} />}>
              <textarea
                value={form.alamatPengiriman}
                onChange={(e) => set("alamatPengiriman", e.target.value)}
                rows={2}
                placeholder="Alamat tujuan pengiriman..."
                className={cn(inputClass, "resize-y")}
              />
            </FormField>

            {/* Keterangan */}
            <FormField label="Keterangan" icon={<FileText size={14} />}>
              <textarea
                value={form.keterangan ?? ""}
                onChange={(e) => set("keterangan", e.target.value)}
                rows={2}
                placeholder="Catatan tambahan..."
                className={cn(inputClass, "resize-y")}
              />
            </FormField>

            {/* Tabel Barang */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Package size={14} className="text-slate-400" /> Barang Dikirim
                </label>
                {!form.salesOrderId && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy-900 text-gold-400 hover:bg-navy-700 transition-colors"
                  >
                    <Plus size={12} /> Tambah Baris
                  </button>
                )}
              </div>

              {form.items.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center text-xs text-slate-400">
                  Belum ada barang. {form.salesOrderId ? "Pilih ulang pesanan untuk memuat barang." : 'Klik "Tambah Baris" atau ambil dari Pesanan Penjualan.'}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Nama Barang</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[14%]">Satuan</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[18%]">Gudang</th>
                        <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[15%]">Qty Dipesan</th>
                        <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[15%]">Qty Dikirim</th>
                        {!form.salesOrderId && <th className="px-3 py-2.5 w-[5%]"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2">
                            {form.salesOrderId ? (
                              <span className="font-medium text-slate-700">{item.productName}</span>
                            ) : (
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                                placeholder="Nama barang..."
                                className={cn(inputClass, "py-1.5")}
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {form.salesOrderId ? (
                              <span className="text-slate-500">{item.satuan}</span>
                            ) : (
                              <input
                                type="text"
                                value={item.satuan}
                                onChange={(e) => updateItem(item.id, { satuan: e.target.value })}
                                placeholder="PCS"
                                className={cn(inputClass, "py-1.5")}
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.warehouseId ?? ""}
                              disabled={loadingWarehouses}
                              onChange={(e) => {
                                const found = warehouseOptions.find(
                                  (w) => String(w.warehouse_id) === e.target.value
                                );
                                if (found) selectWarehouse(item.id, found.warehouse_id, found.warehouse_name);
                              }}
                              className={cn(inputClass, "py-1.5")}
                            >
                              <option value="" disabled>
                                {loadingWarehouses ? "Memuat..." : "Pilih gudang..."}
                              </option>
                              {warehouseOptions.map((w) => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                  {w.warehouse_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={item.qtyDipesan}
                              disabled={!!form.salesOrderId}
                              onChange={(e) => updateItem(item.id, { qtyDipesan: Number(e.target.value) })}
                              className={cn(inputClass, "py-1.5 text-right")}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={item.qtyDipesan || undefined}
                              value={item.qtyDikirim}
                              onChange={(e) => updateItem(item.id, { qtyDikirim: Number(e.target.value) })}
                              className={cn(inputClass, "py-1.5 text-right")}
                            />
                          </td>
                          {!form.salesOrderId && (
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-6 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400">Total Dipesan: </span>
                      <span className="font-semibold text-slate-700">{totalDipesan}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Total Dikirim: </span>
                      <span className="font-semibold text-navy-900">{totalDikirim}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              onClick={() => onProses?.(form)}
              disabled={!onProses || !form.id}
              className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process to Sales Invoice
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 hover:bg-navy-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Pengiriman"}
            </button>
          </div>
        </div>
      </div>

      {/* SO Picker Modal */}
      <PengirimanSOPickerModal
        open={soPickerOpen}
        onClose={() => setSoPickerOpen(false)}
        customerId={form.customerId ?? 0}
        customerName={form.pelanggan ?? ""}
        onConfirm={handleSoConfirm}
      />
    </>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Terjadi kesalahan";
}

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
