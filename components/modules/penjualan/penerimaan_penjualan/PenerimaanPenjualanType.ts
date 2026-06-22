// ─── Form Data ──────────────────────────────────────────────────────────────

export interface PenerimaanFormData {
  id?: number;

  /** "Terima dari" — customer yang melakukan pembayaran */
  customerId?: number;
  pelanggan: string;

  /** Bank tujuan / asal transfer pembayaran */
  bankId?: number;
  bank: string;

  nilaiPembayaran: number;
  tanggalBayar: string;
  noBukti: string;
  noBuktiMode: "auto" | "manual";

  keterangan?: string;

  /** Referensi opsional — terisi otomatis kalau dibuat dari "Proses ke Penerimaan" di modal Uang Muka */
  uangMukaId?: number;
  salesOrderId?: number;
}

// Catatan: Bank dan Pelanggan diambil langsung dari API
// (`bankService.getAll()` dan `customerService.getAllActive()`).
// Data tabel daftar penerimaan juga sudah fetch dari
// `penerimaanPenjualanService.getAll()` — lihat app/penjualan/penerimaan-penjualan/page.tsx.

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Format: BP.{tahun}.{bulan}.{5 digit} — konsisten dengan SQ/SO */
export function generateNoBukti(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
  return `BP.${year}.${month}.${seq}`;
}

export const EMPTY_FORM: PenerimaanFormData = {
  pelanggan: "",
  bank: "",
  nilaiPembayaran: 0,
  tanggalBayar: todayStr(),
  noBukti: "",
  noBuktiMode: "auto",
  keterangan: "",
  uangMukaId: undefined,
  salesOrderId: undefined,
};

/** Mapper form → payload API. id TIDAK disertakan — backend auto-generate. */
export function mapFormToApiPayload(
  form: PenerimaanFormData
): import("@/lib/services/penjualan.service").PenerimaanPenjualanPayload {
  return {
    noBukti: form.noBukti,
    customerId: form.customerId ?? 0,
    bankId: form.bankId ?? 0,
    nilaiPembayaran: form.nilaiPembayaran,
    tanggalBayar: form.tanggalBayar,
    uangMukaId: form.uangMukaId ?? null,
    salesOrderId: form.salesOrderId ?? null,
  };
}

export const inputClass = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all disabled:bg-slate-50 disabled:cursor-not-allowed
`;