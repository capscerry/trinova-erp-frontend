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
import { notify } from "@/lib/notify";
import { isApprovedForPicker } from "@/lib/sales-status";
import { customerService } from "@/lib/services/customer.service";
import {
  salesOrderService,
  type SalesOrder,
  type SalesOrderDetailItem,
  uangMukaService,
} from "@/lib/services/penjualan.service";
import { salesInvoiceService } from "@/lib/services/sales-invoice.service";
import {
  pengirimanPenjualanService,
  type PengirimanPenjualan,
  type PengirimanDetailItem,
} from "@/lib/services/pengiriman-penjualan.service";
import { getWarehouses, type Warehouse } from "@/lib/services/warehouse.service";
import { CurrencyInput } from "../CurrencyInput";
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
  onProses?: (data: FakturPenjualanFormData & { remainingAmount?: number }) => void;
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
  onProses,
  initialData,
}: FakturPenjualanModalProps) {
  const [form, setForm] = useState<FakturPenjualanFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<{ id: number; name: string; address: string }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [soList, setSoList] = useState<SalesOrder[]>([]);
  const [showSoPicker, setShowSoPicker] = useState(false);
  const [loadingSo, setLoadingSo] = useState(false);
  const [deliveryList, setDeliveryList] = useState<PengirimanPenjualan[]>([]);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [uangMukaNote, setUangMukaNote] = useState("Belum ada SO yang dipilih");
  const [warehouseOptions, setWarehouseOptions] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedSoIsIndent, setSelectedSoIsIndent] = useState(false);
  const [soBaseItems, setSoBaseItems] = useState<FakturPenjualanItem[]>([]);
  const [proformaNote, setProformaNote] = useState("");
  const [resolvingProformaStage, setResolvingProformaStage] = useState(false);

  // Baris cash sale (tanpa SO/DO) butuh gudang per baris supaya stoknya bisa
  // dipotong — item yang berasal dari SO/DO sudah ditangani di sana.
  const isDirectSale = !form.salesOrderId && !form.deliveryOrderId;

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
    setSelectedSoIsIndent(false);
    setSoBaseItems([]);
    setProformaNote("");
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const data = await customerService.getAllActive();
        setCustomers(data.map((c) => ({ id: Number(c.id), name: c.nama, address: c.alamat ?? "" })));
      } catch (err) {
        console.error("Gagal memuat pelanggan:", err);
        setCustomers([]);
      }
    };
    load();

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
    loadWarehouses();
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

  const handleSelectCustomer = (customer: { id: number; name: string; address: string }) => {
    patchForm({
      customerId: customer.id,
      pelanggan: customer.name,
      alamat: customer.address,
      salesOrderId: undefined,
      noSo: "",
      deliveryOrderId: undefined,
      noPengiriman: "",
      noPO: "",
      uangMuka: 0,
      proformaStage: null,
      items: [],
    });
    setUangMukaNote("Belum ada SO yang dipilih");
    setSelectedSoIsIndent(false);
    setSoBaseItems([]);
    setProformaNote("");
    setShowCustomerDropdown(false);
    setFilterCustomer("");
  };

  const getUangMukaBySalesOrder = async (noSo?: string, customerId?: number) => {
    if (!noSo || !customerId) return { amount: 0, count: 0 };

    try {
      const list = await uangMukaService.getAll();
      const matched = list.filter(
        (item) =>
          Number(item.customerId) === Number(customerId) &&
          item.nomorSo?.trim().toLowerCase() === noSo.trim().toLowerCase() &&
          isApprovedForPicker("down-payment", item.status)
      );

      return {
        amount: matched.reduce(
          (sum, item) => sum + Number(item.nominalUangMuka || item.totalAmount || 0),
          0
        ),
        count: matched.length,
      };
    } catch (err) {
      console.error("Gagal memuat uang muka terkait SO:", err);
      return { amount: 0, count: 0 };
    }
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
      const uangMuka = await getUangMukaBySalesOrder(so.nomor, form.customerId);
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
      const isIndent = Boolean(so.isIndent);
      setSelectedSoIsIndent(isIndent);
      setSoBaseItems(items);
      setProformaNote("");
      patchForm({
        salesOrderId: Number(so.id),
        noSo: so.nomor,
        deliveryOrderId: undefined,
        noPengiriman: "",
        noPO: so.poNumber ?? "",
        alamat: typeof soRecord.alamat === "string" ? soRecord.alamat : form.alamat,
        kenaPajak: typeof soRecord.kenaPajak === "boolean" ? soRecord.kenaPajak : form.kenaPajak,
        uangMuka: uangMuka.amount,
        proformaStage: null,
        items,
      });
      setUangMukaNote(
        uangMuka.count > 0
          ? `${uangMuka.count} uang muka terpakai dari SO ini`
          : "Tidak ada uang muka untuk SO ini"
      );
      setShowSoPicker(false);
    } catch (err) {
      console.error("Gagal memuat detail SO:", err);
      notify.error("Gagal memuat detail Sales Order");
    } finally {
      setLoadingSo(false);
    }
  };

  const handleProformaStageChange = async (stage: "" | "DP" | "Final") => {
    const baseSubtotal = soBaseItems.reduce((s, it) => s + it.harga * it.qty, 0);
    if (baseSubtotal <= 0) return;

    setResolvingProformaStage(true);
    try {
      if (!stage) {
        // Reguler: kembalikan harga penuh + uang muka (kalau ada) sebagai
        // pengurang -- perilaku standar sebelum barang ini ditandai indent.
        const uangMuka = await getUangMukaBySalesOrder(form.noSo, form.customerId);
        patchForm({ proformaStage: null, items: soBaseItems, uangMuka: uangMuka.amount });
        setUangMukaNote(
          uangMuka.count > 0
            ? `${uangMuka.count} uang muka terpakai dari SO ini`
            : "Tidak ada uang muka untuk SO ini"
        );
        setProformaNote("");
        return;
      }

      if (stage === "DP") {
        let target = baseSubtotal * 0.3;
        let note = "Nominal DP dihitung otomatis 30% dari total SO (belum ada record Uang Muka).";
        try {
          const list = await uangMukaService.getAll();
          const matched = list.filter(
            (item) =>
              Number(item.customerId) === Number(form.customerId) &&
              item.nomorSo?.trim().toLowerCase() === (form.noSo ?? "").trim().toLowerCase() &&
              isApprovedForPicker("down-payment", item.status)
          );
          if (matched.length > 0) {
            target = matched.reduce((s, m) => s + Number(m.nominalUangMuka || m.totalAmount || 0), 0);
            note = `Nominal DP diambil dari Uang Muka ${matched.map((m) => m.noFaktur).join(", ")}: ${formatRupiah(target)}.`;
          }
        } catch (err) {
          console.error("Gagal memuat Uang Muka terkait SO:", err);
        }

        const factor = target / baseSubtotal;
        patchForm({
          proformaStage: "DP",
          // Bukan pengurang di sini -- invoice DP ini SENDIRI adalah dokumen
          // tagihan uang mukanya, jadi tidak boleh dipotong lagi.
          uangMuka: 0,
          items: soBaseItems.map((item) => ({ ...item, harga: item.harga * factor })),
        });
        setProformaNote(note);
        return;
      }

      // stage === "Final"
      let dpInvoiced = 0;
      let note = "Nominal pelunasan dihitung 70% dari total SO (belum ada invoice DP tercatat).";
      try {
        const invoices = await salesInvoiceService.getAll();
        const dpInvoices = invoices.filter(
          (inv) =>
            inv.salesOrderId === form.salesOrderId &&
            inv.proformaStage === "DP" &&
            inv.status !== "Cancelled"
        );
        if (dpInvoices.length > 0) {
          dpInvoiced = dpInvoices.reduce((s, inv) => s + Number(inv.subtotal || 0), 0);
          const remaining = Math.max(0, baseSubtotal - dpInvoiced);
          note = `Nominal pelunasan = sisa setelah invoice DP ${dpInvoices
            .map((i) => i.invoiceNumber)
            .join(", ")}: ${formatRupiah(remaining)}.`;
        }
      } catch (err) {
        console.error("Gagal memuat invoice DP terkait SO:", err);
      }

      const target = dpInvoiced > 0 ? Math.max(0, baseSubtotal - dpInvoiced) : baseSubtotal * 0.7;
      const factor = target / baseSubtotal;
      patchForm({
        proformaStage: "Final",
        uangMuka: 0,
        items: soBaseItems.map((item) => ({ ...item, harga: item.harga * factor })),
      });
      setProformaNote(note);
    } finally {
      setResolvingProformaStage(false);
    }
  };

  const openDeliveryPicker = async () => {
    if (!form.customerId) return;
    setShowDeliveryPicker(true);
    setLoadingDelivery(true);
    try {
      const result = await pengirimanPenjualanService.getAll();
      setDeliveryList(
        result.filter(
          (item) =>
            item.customerId === form.customerId &&
            isApprovedForPicker("delivery-order", item.status)
        )
      );
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

  const loadFromDelivery = async (delivery: PengirimanPenjualan) => {
    const [detail, priceMap] = await Promise.all([
      pengirimanPenjualanService.getDetailItems(delivery.id),
      getSalesOrderPriceMap(delivery.soId),
    ]);
    const uangMuka = await getUangMukaBySalesOrder(delivery.noSo, delivery.customerId);

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

    setSelectedSoIsIndent(false);
    setSoBaseItems([]);
    setProformaNote("");
    patchForm({
      deliveryOrderId: delivery.id,
      noPengiriman: delivery.noSuratJalan,
      salesOrderId: delivery.soId,
      noSo: delivery.noSo ?? "",
      noPO: delivery.noPO ?? "",
      alamat: delivery.alamatPengiriman || form.alamat,
      keterangan: delivery.keterangan || form.keterangan,
      uangMuka: uangMuka.amount,
      proformaStage: null,
      items,
    });
    setUangMukaNote(
      uangMuka.count > 0
        ? `${uangMuka.count} uang muka terpakai dari SO pengiriman ini`
        : "Tidak ada uang muka untuk SO pengiriman ini"
    );
  };

  const handleSelectDelivery = async (delivery: PengirimanPenjualan) => {
    try {
      setLoadingDelivery(true);
      await loadFromDelivery(delivery);
      setShowDeliveryPicker(false);
    } catch (err) {
      console.error("Gagal memuat detail pengiriman:", err);
      notify.error("Gagal memuat detail Pengiriman Penjualan");
    } finally {
      setLoadingDelivery(false);
    }
  };

  // Auto-load saat modal dibuka dari tombol "Process to Sales Invoice" di
  // Delivery Order — initialData.deliveryOrderId sudah ada tapi items masih
  // kosong (cuma customerId/pelanggan yang dioper lewat query param).
  useEffect(() => {
    if (!open || !initialData?.deliveryOrderId || form.items.length > 0) return;

    const load = async () => {
      try {
        setLoadingDelivery(true);
        const delivery = await pengirimanPenjualanService.getById(initialData.deliveryOrderId!);
        await loadFromDelivery(delivery);
      } catch (err) {
        console.error("Gagal memuat pengiriman otomatis:", err);
      } finally {
        setLoadingDelivery(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.deliveryOrderId]);

  const addItem = () => patchForm({ items: [...form.items, newFakturItem()] });
  const updateItem = (id: string, patch: Partial<FakturPenjualanItem>) =>
    patchForm({ items: form.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const removeItem = (id: string) =>
    patchForm({ items: form.items.filter((it) => it.id !== id) });
  const selectWarehouse = (id: string, warehouseId: number, warehouseName: string) =>
    updateItem(id, { warehouseId, warehouseName });

  const handleSubmit = async () => {
    if (!form.customerId) { notify.warning("Pelanggan wajib dipilih"); return; }
    if (!form.noFaktur.trim()) { notify.warning("Nomor faktur wajib diisi"); return; }
    if (!form.jatuhTempo) { notify.warning("Tanggal jatuh tempo wajib diisi"); return; }
    if (form.items.length === 0) { notify.warning("Tambahkan minimal 1 barang"); return; }
    if (form.items.some((item) => !item.productName || Number(item.qty) <= 0)) {
      notify.warning("Nama barang dan qty harus valid");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = mapFormToApiPayload(form);

      if (form.id) {
        await salesInvoiceService.update(form.id, payload);
        const savedForm = { ...form, remainingAmount: undefined };
        setForm(savedForm);
        onSubmit(savedForm);
        return;
      }

      const saved = await salesInvoiceService.create(payload);
      const savedForm = {
        ...form,
        id: saved.id,
        noFaktur: saved.invoiceNumber || form.noFaktur,
        remainingAmount: saved.remainingAmount,
      };
      setForm(savedForm);
      onSubmit(savedForm);
    } catch (err: unknown) {
      console.error("Gagal menyimpan faktur penjualan:", err);
      notify.error(
        "Gagal menyimpan faktur",
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
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
          <div className="flex items-center justify-between bg-linear-to-r from-navy-900 to-navy-600 px-6 py-4">
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

            {selectedSoIsIndent && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                <FormField
                  label="Jenis Invoice"
                  icon={<FileText size={14} />}
                  hint={resolvingProformaStage ? "Menghitung nominal..." : undefined}
                >
                  <select
                    value={form.proformaStage ?? ""}
                    disabled={resolvingProformaStage}
                    onChange={(e) => handleProformaStageChange(e.target.value as "" | "DP" | "Final")}
                    className={inputClass}
                  >
                    <option value="">Reguler (100%)</option>
                    <option value="DP">Proforma DP 30%</option>
                    <option value="Final">Proforma Pelunasan 70%</option>
                  </select>
                </FormField>
                <p className="mt-2 text-[11px] leading-snug text-amber-700">
                  SO ini ditandai sebagai barang indent. Buat 2 invoice proforma berurutan — DP 30%
                  (idealnya diambil dari record Uang Muka SO ini) lalu Pelunasan 70% — sebelum
                  Delivery Order bisa dibuat.
                </p>
                {proformaNote && (
                  <p className="mt-1.5 text-[11px] leading-snug font-medium text-amber-800">
                    {proformaNote}
                  </p>
                )}
              </div>
            )}

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
                <div className="space-y-3">
                  {form.items.map((item, index) => {
                    const gross = Number(item.qty || 0) * Number(item.harga || 0);
                    const lineTotal = gross - gross * (Number(item.diskon || 0) / 100);
                    return (
                      <div key={item.id}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden
                                   hover:border-slate-300 hover:shadow-sm transition-all">

                        {/* Baris atas: nomor urut + nama barang + hapus */}
                        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-slate-100 bg-slate-50/60">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy-900 text-[11px] font-extrabold text-gold-400">
                            {index + 1}
                          </div>
                          <input
                            value={item.productName}
                            onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                            placeholder="Nama barang..."
                            className={cn(inputClass, "flex-1 py-2 text-sm font-semibold")}
                          />
                          <button type="button" onClick={() => removeItem(item.id)} title="Hapus baris"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Baris tengah: satuan / gudang / qty */}
                        <div className={cn(
                          "grid gap-3 px-3.5 py-3 border-b border-dashed border-slate-100",
                          isDirectSale ? "grid-cols-3" : "grid-cols-2"
                        )}>
                          <FieldLabel label="Satuan">
                            <input value={item.satuan} onChange={(e) => updateItem(item.id, { satuan: e.target.value })} className={cn(inputClass, "py-2")} />
                          </FieldLabel>

                          {isDirectSale && (
                            <FieldLabel label="Gudang">
                              <select
                                value={item.warehouseId ?? ""}
                                disabled={loadingWarehouses}
                                onChange={(e) => {
                                  const found = warehouseOptions.find(
                                    (w) => String(w.warehouse_id) === e.target.value
                                  );
                                  if (found) selectWarehouse(item.id, found.warehouse_id, found.warehouse_name);
                                  else updateItem(item.id, { warehouseId: undefined, warehouseName: "" });
                                }}
                                className={cn(inputClass, "py-2")}
                              >
                                <option value="">Jasa (tanpa stok)</option>
                                {warehouseOptions.map((w) => (
                                  <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.warehouse_name}
                                  </option>
                                ))}
                              </select>
                            </FieldLabel>
                          )}

                          <FieldLabel label="Qty">
                            <input type="number" min={0} value={item.qty} onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })} className={cn(inputClass, "py-2 text-center")} />
                          </FieldLabel>
                        </div>

                        {/* Baris bawah: harga / diskon / subtotal — bagian nominal,
                            dibuat lebih menonjol karena paling sering dicek ulang. */}
                        <div className="grid grid-cols-3 gap-3 px-3.5 py-3 items-end">
                          <FieldLabel label="Harga Satuan">
                            <CurrencyInput value={item.harga} onChange={(v) => updateItem(item.id, { harga: v })} />
                          </FieldLabel>
                          <FieldLabel label="Diskon %">
                            <input type="number" min={0} max={100} value={item.diskon} onChange={(e) => updateItem(item.id, { diskon: Number(e.target.value) })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-700 transition-all focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-600/20" />
                          </FieldLabel>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Subtotal</span>
                            <span className="whitespace-nowrap text-[17px] font-extrabold text-navy-900">{formatRupiah(lineTotal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <div className="grid grid-cols-2 items-start gap-2">
                  <div>
                    <span className="text-slate-500">Uang Muka Terpakai</span>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{uangMukaNote}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-right font-semibold text-slate-700">
                    {formatRupiah(form.uangMuka)}
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2"><span className="text-slate-500">Biaya Kirim</span><input type="number" min={0} value={form.biayaKirim} onChange={(e) => patchForm({ biayaKirim: Number(e.target.value) })} className={cn(inputClass, "py-1.5 text-right")} /></div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-navy-900"><span>Total Faktur</span><span>{formatRupiah(totals.grandTotal)}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">Batal</button>
            <button
              onClick={() => onProses?.(form)}
              disabled={!onProses || !form.id}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Process to Sales Receipt
            </button>
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

// Label kecil di atas tiap input dalam kartu baris barang (beda dari
// FormField di atas yang dipakai untuk field header faktur).
function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>;
}


