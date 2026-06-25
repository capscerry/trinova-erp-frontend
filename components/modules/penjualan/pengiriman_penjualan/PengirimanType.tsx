import type { PengirimanPenjualanPayload } from "@/lib/services/pengiriman-penjualan.service";

// ─── Form Data ──────────────────────────────────────────────────────────────

export interface PengirimanItemForm {
  id: string;
  productId?: number;
  productCode?: string;
  productName: string;
  satuan: string;
  uomId?: number;
  qtyDipesan: number;
  qtyDikirim: number;
}

export interface PengirimanFormData {
  id?: number;

  customerId?: number;
  pelanggan: string;

  noSuratJalan: string;
  noSuratJalanMode: "auto" | "manual";
  tanggalKirim: string;

  /** Referensi opsional — terisi otomatis kalau diambil dari Sales Order */
  salesOrderId?: number;
  noSo?: string;
  noPO?: string;

  shippingTypeId?: number;
  shippingType: string;

  alamatPengiriman: string;
  keterangan?: string;

  items: PengirimanItemForm[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Format: SJ.{tahun}.{bulan}.{5 digit} — konsisten dengan SQ/SO/UM/BP */
export function generateNoSuratJalan(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
  return `SJ.${year}.${month}.${seq}`;
}

export function newPengirimanItem(): PengirimanItemForm {
  return {
    id: crypto.randomUUID(),
    productId: undefined,
    productCode: "",
    productName: "",
    satuan: "",
    uomId: undefined,
    qtyDipesan: 0,
    qtyDikirim: 0,
  };
}

export const EMPTY_FORM: PengirimanFormData = {
  pelanggan: "",
  noSuratJalan: "",
  noSuratJalanMode: "auto",
  tanggalKirim: todayStr(),
  salesOrderId: undefined,
  noSo: "",
  noPO: "",
  shippingTypeId: undefined,
  shippingType: "",
  alamatPengiriman: "",
  keterangan: "",
  items: [],
};

export function mapFormToApiPayload(
  form: PengirimanFormData
): PengirimanPenjualanPayload {
  return {
    header: {
      customerId: form.customerId ?? 0,
      doDate: form.tanggalKirim,
      doNumber: form.noSuratJalan,
      poNumber: form.noPO || undefined,
      deliveryCategoryId: form.shippingTypeId ?? 0,
      address: form.alamatPengiriman,
      notes: form.keterangan || undefined,
      soId: form.salesOrderId ?? null,
    },
    detail: form.items.map((item) => ({
      productId: item.productId ?? 0,
      uomId: item.uomId,
      qtyDipesan: item.qtyDipesan,
      qtyDikirim: item.qtyDikirim,
    })),
  };
}

export const inputClass = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all disabled:bg-slate-50 disabled:cursor-not-allowed
`;