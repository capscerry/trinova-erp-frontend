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
  /** ID Sales Order — terisi otomatis saat dipilih lewat SalesOrderPickerModal */
  salesOrderId?: number;
  syaratPembayaran: string;
  alamat: string;
  keterangan: string;
  fakturType: string;
  noPesanan: string;
  totalHargaPesanan: number;
  isTaxable: boolean;
  isTaxIncluded: boolean;
  taxAmount: number;
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

/** Format: UM.{tahun}.{bulan}.{5 digit} — konsisten dengan SQ.{tahun}.{bulan}.{5 digit} */
export function generateAutoFaktur() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
  return `UM.${year}.${month}.${seq}`;
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
  salesOrderId: undefined,
  syaratPembayaran: "",
  alamat: "",
  keterangan: "",
  fakturType: "Faktur Penjualan",
  noPesanan: "",
  totalHargaPesanan: 0,
  isTaxable: false,
  isTaxIncluded: false,
  taxAmount: 0,
};

// ─────────────────────────────────────────────────────────────
// MAPPER FORM → API PAYLOAD
// ─────────────────────────────────────────────────────────────

export function mapFormToApiPayload(
  form: UangMukaFormData
): UangMukaPayload {
  // Nominal uang muka adalah nilai final yang dibayar.
  // Jika sumber SO kena PPN dan include tax, taxAmount hanya menjadi
  // breakdown informatif dari nominal tersebut, bukan tambahan nominal.
  return {
    id: form.id || undefined,
    noFaktur: form.noFaktur,
    tanggal: new Date(form.tanggal).toISOString(),
    customerId: Number(form.customerId) || 0,
    noPO: form.noPO,
    noSo: form.noSo || "",
    nominalUangMuka: Number(form.uangMuka),
    isTaxable: form.isTaxable,
    isTaxIncluded: form.isTaxIncluded,
    taxAmount: Number(form.taxAmount || 0),
    totalAmount: Number(form.uangMuka),
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
