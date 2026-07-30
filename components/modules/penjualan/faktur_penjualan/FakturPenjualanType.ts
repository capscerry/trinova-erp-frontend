import type { SalesInvoicePayload } from "@/lib/services/sales-invoice.service";

export interface FakturPenjualanItem {
  id: string;
  productId?: number;
  productCode?: string;
  productName: string;
  uomId?: number;
  satuan: string;
  qty: number;
  harga: number;
  diskon: number;
  /** Gudang — cuma dipakai untuk cash sale (tanpa SO/DO). Kosong = jasa, tidak potong stok. */
  warehouseId?: number;
  warehouseName?: string;
}

export interface FakturPenjualanFormData {
  id?: number;
  customerId?: number;
  pelanggan: string;
  noFaktur: string;
  noFakturMode: "auto" | "manual";
  tanggal: string;
  jatuhTempo: string;
  salesOrderId?: number;
  noSo?: string;
  deliveryOrderId?: number;
  noPengiriman?: string;
  noPO?: string;
  alamat: string;
  keterangan: string;
  kenaPajak: boolean;
  uangMuka: number;
  biayaKirim: number;
  /** Label tahap proforma untuk SO barang indent: "DP" (30%), "Final" (70%),
   * atau null untuk invoice reguler non-indent. */
  proformaStage?: "DP" | "Final" | null;
  items: FakturPenjualanItem[];
}

export const todayStr = () => new Date().toISOString().split("T")[0];

export function addDays(date: string, days: number) {
  const d = new Date(date || todayStr());
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function generateNoFakturPenjualan() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
  return `INV.${year}.${month}.${seq}`;
}

export function newFakturItem(): FakturPenjualanItem {
  return {
    id: crypto.randomUUID(),
    productId: undefined,
    productCode: "",
    productName: "",
    uomId: undefined,
    satuan: "",
    qty: 1,
    harga: 0,
    diskon: 0,
    warehouseId: undefined,
    warehouseName: "",
  };
}

export const EMPTY_FORM: FakturPenjualanFormData = {
  pelanggan: "",
  customerId: undefined,
  noFaktur: generateNoFakturPenjualan(),
  noFakturMode: "auto",
  tanggal: todayStr(),
  jatuhTempo: addDays(todayStr(), 30),
  salesOrderId: undefined,
  noSo: "",
  deliveryOrderId: undefined,
  noPengiriman: "",
  noPO: "",
  alamat: "",
  keterangan: "",
  kenaPajak: false,
  uangMuka: 0,
  biayaKirim: 0,
  proformaStage: null,
  items: [],
};

export const inputClass = `
  w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm
  text-slate-700 placeholder-slate-400 transition-all
  focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-600/20
  disabled:cursor-not-allowed disabled:bg-slate-50
`;

export function calculateFakturTotals(form: FakturPenjualanFormData) {
  const subtotal = form.items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.harga || 0),
    0
  );
  const discountTotal = form.items.reduce((sum, item) => {
    const gross = Number(item.qty || 0) * Number(item.harga || 0);
    return sum + gross * (Number(item.diskon || 0) / 100);
  }, 0);
  const taxableBase = subtotal - discountTotal;
  const taxTotal = form.kenaPajak ? taxableBase * 0.11 : 0;
  const grandTotal = Math.max(
    0,
    taxableBase + taxTotal + Number(form.biayaKirim || 0) - Number(form.uangMuka || 0)
  );
  return { subtotal, discountTotal, taxableBase, taxTotal, grandTotal };
}

export function mapFormToApiPayload(form: FakturPenjualanFormData): SalesInvoicePayload {
  const totals = calculateFakturTotals(form);

  return {
    header: {
      invoiceNumber: form.noFaktur,
      invoiceDate: new Date(form.tanggal).toISOString(),
      dueDate: new Date(form.jatuhTempo).toISOString(),
      customerId: Number(form.customerId) || 0,
      salesOrderId: form.salesOrderId ?? null,
      deliveryOrderId: form.deliveryOrderId ?? null,
      notes: form.keterangan || undefined,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      downPaymentAmount: Number(form.uangMuka || 0),
      shippingCost: Number(form.biayaKirim || 0),
      grandTotal: totals.grandTotal,
      proformaStage: form.proformaStage ?? null,
    },
    detail: form.items.map((item) => {
      const gross = Number(item.qty || 0) * Number(item.harga || 0);
      const discountAmount = gross * (Number(item.diskon || 0) / 100);
      const afterDiscount = gross - discountAmount;
      return {
        productId: item.productId ?? 0,
        productCode: item.productCode,
        productName: item.productName,
        uomId: item.uomId,
        quantity: Number(item.qty || 0),
        price: Number(item.harga || 0),
        discountPercent: Number(item.diskon || 0),
        discountAmount,
        taxAmount: form.kenaPajak ? afterDiscount * 0.11 : 0,
        subtotal: afterDiscount,
        warehouseId: item.warehouseId ?? null,
      };
    }),
  };
}
