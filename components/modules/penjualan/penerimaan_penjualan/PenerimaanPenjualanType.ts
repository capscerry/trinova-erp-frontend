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
}

// ─── Dummy Options (sementara, sebelum API tersedia) ──────────────────────────

export const DUMMY_CUSTOMERS = [
  { id: 1, name: "PT Maju Bersama" },
  { id: 2, name: "PT Sumber Rejeki" },
  { id: 3, name: "CV Abadi Jaya" },
  { id: 4, name: "PT Karya Utama" },
];

export const DUMMY_BANKS = [
  { id: 1, nama: "Bank Central Asia (BCA)", noRekening: "1234567890", namaRekening: "PT Hang Song Machinery" },
  { id: 2, nama: "Bank Mandiri", noRekening: "0987654321", namaRekening: "PT Hang Song Machinery" },
  { id: 3, nama: "Bank Negara Indonesia (BNI)", noRekening: "5566778899", namaRekening: "PT Hang Song Machinery" },
  { id: 4, nama: "Bank Rakyat Indonesia (BRI)", noRekening: "1122334455", namaRekening: "PT Hang Song Machinery" },
];

// ─── Dummy List Data (untuk tabel sementara) ──────────────────────────────────

export interface PenerimaanRow {
  id: number;
  noBukti: string;
  tanggalBayar: string;
  pelanggan: string;
  bank: string;
  nilaiPembayaran: number;
}

export const DUMMY_PENERIMAAN_LIST: PenerimaanRow[] = [
  {
    id: 1,
    noBukti: "BP.2026.06.00001",
    tanggalBayar: "2026-06-10",
    pelanggan: "PT Maju Bersama",
    bank: "Bank Central Asia (BCA)",
    nilaiPembayaran: 5000000,
  },
  {
    id: 2,
    noBukti: "BP.2026.06.00002",
    tanggalBayar: "2026-06-14",
    pelanggan: "CV Abadi Jaya",
    bank: "Bank Mandiri",
    nilaiPembayaran: 12500000,
  },
];

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
};

export const inputClass = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500
  transition-all disabled:bg-slate-50 disabled:cursor-not-allowed
`;