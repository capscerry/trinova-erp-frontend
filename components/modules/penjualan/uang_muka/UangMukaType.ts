export interface UangMukaFormData {
  id: number;
  pelanggan: string;
  customerId?: number;
  noFaktur: string;
  noFakturMode: "auto" | "manual";
  tanggal: string;
  uangMuka: number;
  noPO: string;
  noSo: string;
  kenaPajak: boolean;
  totalTermasukPajak: boolean;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
  fakturType: string;
  noPesanan: string;
  totalHargaPesanan: number;
}

export interface UangMukaPayload {
  id?: number;
  noFaktur: string;
  tanggal: string;
  customerId: number;
  noPO: string;
  noSo: string;
  nominalUangMuka: number;
  isTaxable: boolean;
  isTaxIncluded: boolean;
  taxAmount: number;
  totalAmount: number;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export const todayStr = () =>
  new Date().toISOString().split("T")[0];

export function generateAutoFaktur() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `UM/${yy}${mm}/${seq}`;
}

// ─────────────────────────────────────────────────────────────
// EMPTY FORM
// ─────────────────────────────────────────────────────────────

export const EMPTY_FORM: UangMukaFormData = {
  id: 0,
  pelanggan: "",
  customerId: undefined,
  noFaktur: generateAutoFaktur(),
  noFakturMode: "auto",
  tanggal: todayStr(),
  uangMuka: 0,
  noPO: "",
  noSo: "",
  kenaPajak: false,
  totalTermasukPajak: true,
  syaratPembayaran: "",
  alamat: "",
  keterangan: "",
  fakturType: "Faktur Penjualan",
  noPesanan: "",
  totalHargaPesanan: 0,
};

// ─────────────────────────────────────────────────────────────
// MAPPER FORM → API PAYLOAD
// ─────────────────────────────────────────────────────────────

export function mapFormToApiPayload(
  form: UangMukaFormData
): UangMukaPayload {
  const taxAmount = form.kenaPajak ? form.uangMuka * 0.11 : 0;

  const totalAmount = form.totalTermasukPajak
    ? form.uangMuka + taxAmount
    : form.uangMuka;

  return {
    id: form.id || undefined,
    noFaktur: form.noFaktur,
    tanggal: new Date(form.tanggal).toISOString(),
    customerId: Number(form.customerId) || 0,
    noPO: form.noPO,
    noSo: form.noSo || "",
    nominalUangMuka: Number(form.uangMuka),
    isTaxable: form.kenaPajak,
    isTaxIncluded: form.totalTermasukPajak,
    taxAmount: Number(taxAmount),
    totalAmount: Number(form.totalHargaPesanan),
    syaratPembayaran: form.syaratPembayaran,
    alamat: form.alamat,
    keterangan: form.keterangan,
  };
}

// ─────────────────────────────────────────────────────────────
// SHARED STYLE
// ─────────────────────────────────────────────────────────────

export const inputBase = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all disabled:bg-slate-50 disabled:cursor-not-allowed
`;