"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  Check,
  FileDown,
  FileText,
  Hash,
  Package,
  PenLine,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { customerService } from "@/lib/services/customer.service";
import {
  salesOrderService,
  type SalesOrder,
  type SalesOrderDetailItem,
} from "@/lib/services/penjualan.service";
import { salesInvoiceService } from "@/lib/services/sales-invoice.service";
import {
  pengirimanPenjualanService,
  type PengirimanPenjualan,
  type PengirimanDetailItem,
} from "@/lib/services/pengiriman-penjualan.service";
import {
  EMPTY_FORM,
  addDays,
  calculateFakturTotals,
  generateNoFakturPenjualan,
  inputClass,
  mapFormToApiPayload,
  newFakturItem,
  type FakturPenjualanFormData,
  type FakturPenjualanItem,
} from "./FakturPenjualanType";

export type { FakturPenjualanFormData } from "./FakturPenjualanType";

interface FakturPenjualanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FakturPenjualanFormData) => void;
  initialData?: Partial<FakturPenjualanFormData>;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export function FakturPenjualanModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: FakturPenjualanModalProps) {
  const [form, setForm] = useState<FakturPenjualanFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [soList, setSoList] = useState<SalesOrder[]>([]);
  const [showSoPicker, setShowSoPicker] = useState(false);
  const [loadingSo, setLoadingSo] = useState(false);
  const [deliveryList, setDeliveryList] = useState<PengirimanPenjualan[]>([]);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  const totals = useMemo(() => calculateFakturTotals(form), [form]);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY_FORM,
      ...initialData,
      noFaktur: initialData?.noFaktur || generateNoFakturPenjualan(),
      jatuhTempo: initialData?.jatuhTempo || addDays(initialData?.tanggal || EMPTY_FORM.tanggal, 30),
      items: initialData?.items?.length ? initialData.items : [],
    });
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const data = await customerService.getAllActive();
        setCustomers(data.map((c) => ({ id: Number(c.id), name: c.nama })));
      } catch (err) {
        console.error("Gagal memuat pelanggan:", err);
        setCustomers([]);
      }
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const patchForm = (patch: Partial<FakturPenjualanFormData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(filterCustomer.toLowerCase())
  );

  const handleSelectCustomer = (customer: { id: number; name: string }) => {
    patchForm({
      customerId: customer.id,
      pelanggan: customer.name,
      salesOrderId: undefined,
      noSo: "",
      deliveryOrderId: undefined,
      noPengiriman: "",
      noPO: "",
      items: [],
    });
    setShowCustomerDropdown(false);
    setFilterCustomer("");
  };

  const openSoPicker = async () => {
    if (!form.customerId) return;
    setShowSoPicker(true);
    setLoadingSo(true);
    try {
      const result = await salesOrderService.getByCustomerId(form.customerId);
      setSoList(result);
    } catch (err) {
      console.error("Gagal memuat SO:", err);
      setSoList([]);
    } finally {
      setLoadingSo(false);
    }
  };

  const handleSelectSo = async (so: SalesOrder) => {
    try {
      setLoadingSo(true);
      const detail = await salesOrderService.getDetailItems(so.id);
      const soRecord = so as unknown as Record<string, unknown>;
      const items: FakturPenjualanItem[] = detail.map((item: SalesOrderDetailItem) => ({
        id: crypto.randomUUID(),
        productId: item.productId,
        productCode: item.productCode ?? "",
        productName: item.productName,
        uomId: item.uomId,
        satuan: item.uomCode ?? "",
        qty: Number(item.productQty || 0),
        harga: Number(item.productPrice || 0),
        diskon: Number(item.productDiscount || 0),
      }));
      patchForm({
        salesOrderId: Number(so.id),
        noSo: so.nomor,
        deliveryOrderId: undefined,
        noPengiriman: "",
        noPO: so.poNumber ?? "",
        alamat: typeof soRecord.alamat === "string" ? soRecord.alamat : form.alamat,
        kenaPajak: typeof soRecord.kenaPajak === "boolean" ? soRecord.kenaPajak : form.kenaPajak,
        items,
      });
      setShowSoPicker(false);
    } catch (err) {
      console.error("Gagal memuat detail SO:", err);
      alert("Gagal memuat detail Sales Order");
    } finally {
      setLoadingSo(false);
    }
  };

  const openDeliveryPicker = async () => {
    if (!form.customerId) return;
    setShowDeliveryPicker(true);
    setLoadingDelivery(true);
    try {
      const result = await pengirimanPenjualanService.getAll();
      setDeliveryList(result.filter((item) => item.customerId === form.customerId));
    } catch (err) {
      console.error("Gagal memuat pengiriman:", err);
      setDeliveryList([]);
    } finally {
      setLoadingDelivery(false);
    }
  };

  const getSalesOrderPriceMap = async (salesOrderId?: number) => {
    const priceMap = new Map<number, { harga: number; diskon: number }>();
    if (!salesOrderId) return priceMap;

    try {
      const soItems = await salesOrderService.getDetailItems(salesOrderId);
      soItems.forEach((item) => {
        if (!item.productId) return;
        priceMap.set(item.productId, {
          harga: Number(item.productPrice || 0),
          diskon: Number(item.productDiscount || 0),
        });
      });
    } catch (err) {
      console.error("Gagal memuat harga dari SO terkait pengiriman:", err);
    }

    return priceMap;
  };

  const handleSelectDelivery = async (delivery: PengirimanPenjualan) => {
    try {
      setLoadingDelivery(true);
      const [detail, priceMap] = await Promise.all([
        pengirimanPenjualanService.getDetailItems(delivery.id),
        getSalesOrderPriceMap(delivery.soId),
      ]);

      const items: FakturPenjualanItem[] = detail.map((item: PengirimanDetailItem) => {
        const price = item.productId ? priceMap.get(item.productId) : undefined;
        return {
          id: crypto.randomUUID(),
          productId: item.productId,
          productCode: item.productCode ?? "",
          productName: item.productName,
          uomId: item.uomId,
          satuan: item.satuan ?? "",
          qty: Number(item.qtyDikirim || 0),
          harga: price?.harga ?? 0,
          diskon: price?.diskon ?? 0,
        };
      });

      patchForm({
        deliveryOrderId: delivery.id,
        noPengiriman: delivery.noSuratJalan,
        salesOrderId: delivery.soId,
        noSo: delivery.noSo ?? "",
        noPO: delivery.noPO ?? "",
        alamat: delivery.alamatPengiriman || form.alamat,
        keterangan: delivery.keterangan || form.keterangan,
        items,
      });
      setShowDeliveryPicker(false);
    } catch (err) {
      console.error("Gagal memuat detail pengiriman:", err);
      alert("Gagal memuat detail Pengiriman Penjualan");
    } finally {
      setLoadingDelivery(false);
    }
  };

  const addItem = () => patchForm({ items: [...form.items, newFakturItem()] });
  const updateItem = (id: string, patch: Partial<FakturPenjualanItem>) =>
    patchForm({ items: form.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const removeItem = (id: string) =>
    patchForm({ items: form.items.filter((it) => it.id !== id) });

  const handleSubmit = async () => {
    if (!form.customerId) return alert("Pelanggan wajib dipilih");
    if (!form.noFaktur.trim()) return alert("Nomor faktur wajib diisi");
    if (!form.jatuhTempo) return alert("Tanggal jatuh tempo wajib diisi");
    if (form.items.length === 0) return alert("Tambahkan minimal 1 barang");
    if (form.items.some((item) => !item.productName || Number(item.qty) <= 0)) {
      return alert("Nama barang dan qty harus valid");
    }

    try {
      setIsSubmitting(true);
      await salesInvoiceService.create(mapFormToApiPayload(form));
      onSubmit(form);
    } catch (err: unknown) {
      console.error("Gagal menyimpan faktur penjualan:", err);
      alert("Gagal menyimpan faktur: " + (err instanceof Error ? err.message : "Terjadi kesalahan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()} className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-600 px-6 py-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-white">Tambah Faktur Penjualan</h2>
              <p className="mt-0.5 text-xs text-slate-400">Buat tagihan dari Sales Order atau input manual</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Pelanggan" icon={<User size={14} />} required>
                <div className="relative">
                  <input
                    value={showCustomerDropdown ? filterCustomer : form.pelanggan}
                    onChange={(e) => showCustomerDropdown && setFilterCustomer(e.target.value)}
                    onFocus={() => { setShowCustomerDropdown(true); setFilterCustomer(""); }}
                    placeholder="Cari/Pilih Pelanggan..."
                    className={inputClass}
                  />
                  {showCustomerDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowCustomerDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredCustomers.map((customer) => (
                          <button key={customer.id} type="button" onClick={() => handleSelectCustomer(customer)} className="w-full border-b border-slate-100 px-3 py-2.5 text-left text-sm text-slate-700 transition-colors last:border-b-0 hover:bg-navy-50 hover:text-navy-900">
                            {customer.name}
                          </button>
                        ))}
                        {filteredCustomers.length === 0 && <div className="px-3 py-2.5 text-center text-sm text-slate-500">Tidak ada pelanggan</div>}
                      </div>
                    </>
                  )}
                </div>
              </FormField>

              <FormField label="No Faktur" icon={<Hash size={14} />} required hint={form.noFakturMode === "auto" ? "Auto-generate" : "Input manual"}>
                <div className="flex gap-2">
                  <div className="flex shrink-0 items-center rounded-lg border border-slate-200 p-0.5">
                    <button type="button" onClick={() => patchForm({ noFakturMode: "auto", noFaktur: generateNoFakturPenjualan() })} className={cn("flex h-8 w-8 items-center justify-center rounded-md", form.noFakturMode === "auto" ? "bg-navy-900 text-gold-400" : "text-slate-400 hover:bg-slate-50")}>
                      <RefreshCw size={13} />
                    </button>
                    <button type="button" onClick={() => patchForm({ noFakturMode: "manual" })} className={cn("flex h-8 w-8 items-center justify-center rounded-md", form.noFakturMode === "manual" ? "bg-navy-900 text-gold-400" : "text-slate-400 hover:bg-slate-50")}>
                      <PenLine size={13} />
                    </button>
                  </div>
                  <input readOnly={form.noFakturMode === "auto"} value={form.noFaktur} onChange={(e) => patchForm({ noFaktur: e.target.value })} className={cn(inputClass, "font-mono")} />
                </div>
              </FormField>

              <FormField label="Tanggal Faktur" icon={<Calendar size={14} />} required>
                <input type="date" value={form.tanggal} onChange={(e) => patchForm({ tanggal: e.target.value, jatuhTempo: addDays(e.target.value, 30) })} className={inputClass} />
              </FormField>

              <FormField label="Jatuh Tempo" icon={<Calendar size={14} />} required>
                <input type="date" value={form.jatuhTempo} onChange={(e) => patchForm({ jatuhTempo: e.target.value })} className={inputClass} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className={cn("rounded-xl border px-4 py-3", form.customerId ? "border-sky-200 bg-sky-50/50" : "border-slate-200 bg-slate-50/50 opacity-60")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileDown size={14} className={form.customerId ? "text-sky-600" : "text-slate-400"} />
                    <div>
                      <p className="text-xs font-bold text-slate-600">Ambil dari Pesanan Penjualan</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{form.noSo || (form.customerId ? "Pilih SO untuk mengisi item otomatis" : "Pilih pelanggan terlebih dahulu")}</p>
                    </div>
                  </div>
                  <button type="button" disabled={!form.customerId} onClick={openSoPicker} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", form.customerId ? "bg-sky-600 text-white hover:bg-sky-700" : "cursor-not-allowed bg-slate-200 text-slate-400")}>
                    <FileDown size={11} /> {form.noSo ? "Ganti" : "Pilih"}
                  </button>
                </div>
              </div>

              <div className={cn("rounded-xl border px-4 py-3", form.customerId ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50/50 opacity-60")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Truck size={14} className={form.customerId ? "text-emerald-600" : "text-slate-400"} />
                    <div>
                      <p className="text-xs font-bold text-slate-600">Ambil dari Pengiriman</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{form.noPengiriman || (form.customerId ? "Pilih surat jalan yang sudah dikirim" : "Pilih pelanggan terlebih dahulu")}</p>
                    </div>
                  </div>
                  <button type="button" disabled={!form.customerId} onClick={openDeliveryPicker} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", form.customerId ? "bg-emerald-600 text-white hover:bg-emerald-700" : "cursor-not-allowed bg-slate-200 text-slate-400")}>
                    <Truck size={11} /> {form.noPengiriman ? "Ganti" : "Pilih"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="No PO" icon={<Hash size={14} />}>
                <input value={form.noPO ?? ""} onChange={(e) => patchForm({ noPO: e.target.value })} placeholder="Nomor PO..." className={inputClass} />
              </FormField>
              <FormField label="No Pengiriman" icon={<Truck size={14} />}>
                <input value={form.noPengiriman ?? ""} onChange={(e) => patchForm({ noPengiriman: e.target.value })} placeholder="Nomor surat jalan..." className={inputClass} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Alamat" icon={<FileText size={14} />}>
                <input value={form.alamat} onChange={(e) => patchForm({ alamat: e.target.value })} placeholder="Alamat penagihan/pengiriman..." className={inputClass} />
              </FormField>
              <FormField label="Keterangan" icon={<FileText size={14} />}>
                <input value={form.keterangan} onChange={(e) => patchForm({ keterangan: e.target.value })} placeholder="Catatan faktur..." className={inputClass} />
              </FormField>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <Package size={14} className="text-slate-400" /> Detail Barang
                </label>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-gold-400 transition-colors hover:bg-navy-700">
                  <Plus size={12} /> Tambah Baris
                </button>
              </div>

              {form.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">Belum ada barang. Ambil dari Sales Order atau tambah baris manual.</div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Barang</th>
                        <th className="w-[12%] px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">Satuan</th>
                        <th className="w-[12%] px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400">Qty</th>
                        <th className="w-[18%] px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400">Harga</th>
                        <th className="w-[12%] px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400">Diskon %</th>
                        <th className="w-[18%] px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400">Subtotal</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((item) => {
                        const gross = Number(item.qty || 0) * Number(item.harga || 0);
                        const lineTotal = gross - gross * (Number(item.diskon || 0) / 100);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2"><input value={item.productName} onChange={(e) => updateItem(item.id, { productName: e.target.value })} className={cn(inputClass, "py-1.5")} /></td>
                            <td className="px-3 py-2"><input value={item.satuan} onChange={(e) => updateItem(item.id, { satuan: e.target.value })} className={cn(inputClass, "py-1.5")} /></td>
                            <td className="px-3 py-2"><input type="number" min={0} value={item.qty} onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })} className={cn(inputClass, "py-1.5 text-right")} /></td>
                            <td className="px-3 py-2"><input type="number" min={0} value={item.harga} onChange={(e) => updateItem(item.id, { harga: Number(e.target.value) })} className={cn(inputClass, "py-1.5 text-right")} /></td>
                            <td className="px-3 py-2"><input type="number" min={0} max={100} value={item.diskon} onChange={(e) => updateItem(item.id, { diskon: Number(e.target.value) })} className={cn(inputClass, "py-1.5 text-right")} /></td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatRupiah(lineTotal)}</td>
                            <td className="px-2 py-2 text-center"><button type="button" onClick={() => removeItem(item.id)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.kenaPajak} onChange={(e) => patchForm({ kenaPajak: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                Kena PPN 11%
              </label>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                <SummaryRow label="Subtotal" value={formatRupiah(totals.subtotal)} />
                <SummaryRow label="Diskon" value={formatRupiah(totals.discountTotal)} />
                <SummaryRow label="PPN" value={formatRupiah(totals.taxTotal)} />
                <div className="grid grid-cols-2 items-center gap-2"><span className="text-slate-500">Uang Muka</span><input type="number" min={0} value={form.uangMuka} onChange={(e) => patchForm({ uangMuka: Number(e.target.value) })} className={cn(inputClass, "py-1.5 text-right")} /></div>
                <div className="grid grid-cols-2 items-center gap-2"><span className="text-slate-500">Biaya Kirim</span><input type="number" min={0} value={form.biayaKirim} onChange={(e) => patchForm({ biayaKirim: Number(e.target.value) })} className={cn(inputClass, "py-1.5 text-right")} /></div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-navy-900"><span>Total Faktur</span><span>{formatRupiah(totals.grandTotal)}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">Batal</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2 text-sm font-semibold text-gold-400 shadow-sm transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
              {isSubmitting ? "Menyimpan..." : "Simpan Faktur"}
            </button>
          </div>
        </div>
      </div>

      {showSoPicker && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowSoPicker(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-sky-600 px-5 py-3.5"><div><h3 className="text-sm font-semibold text-white">Pilih Pesanan Penjualan</h3><p className="text-xs text-sky-100">{form.pelanggan}</p></div><button onClick={() => setShowSoPicker(false)} className="text-sky-100 hover:text-white"><X size={16} /></button></div>
              <div className="max-h-96 overflow-y-auto p-4">
                {loadingSo ? <div className="py-8 text-center text-xs text-slate-400">Memuat pesanan...</div> : soList.length === 0 ? <div className="py-8 text-center text-xs text-slate-400">Belum ada pesanan untuk pelanggan ini</div> : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {soList.map((so) => <button key={so.id} type="button" onClick={() => handleSelectSo(so)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"><span className="font-mono font-semibold text-slate-700">{so.nomor}</span><span className="text-xs text-slate-400">{formatRupiah(so.total)}</span></button>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showDeliveryPicker && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowDeliveryPicker(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-emerald-600 px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Pilih Pengiriman Penjualan</h3>
                  <p className="text-xs text-emerald-100">{form.pelanggan}</p>
                </div>
                <button onClick={() => setShowDeliveryPicker(false)} className="text-emerald-100 hover:text-white"><X size={16} /></button>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                {loadingDelivery ? <div className="py-8 text-center text-xs text-slate-400">Memuat pengiriman...</div> : deliveryList.length === 0 ? <div className="py-8 text-center text-xs text-slate-400">Belum ada pengiriman untuk pelanggan ini</div> : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {deliveryList.map((delivery) => <button key={delivery.id} type="button" onClick={() => handleSelectDelivery(delivery)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"><span className="font-mono font-semibold text-slate-700">{delivery.noSuratJalan}</span><span className="text-xs text-slate-400">{delivery.noSo || "Tanpa SO"}</span></button>)}
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

function FormField({ label, icon, required, hint, children }: { label: string; icon?: ReactNode; required?: boolean; hint?: string; children: ReactNode }) {
  return <div className="space-y-1.5"><label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">{icon && <span className="text-slate-400">{icon}</span>}{label}{required && <span className="font-bold text-red-400">*</span>}{hint && <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-slate-400">{hint}</span>}</label>{children}</div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>;
}


