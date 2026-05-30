// ─── Types ────────────────────────────────────────────────────────────────────
export interface SalesOrderItem {
  id: string;
  produk: string;
  deskripsi: string;
  qty: number;
  qtyTerkirim: number;
  satuan: string;
  harga: number;
  diskon: number;
  subtotal: number;
  taxable?: boolean; // Tambahan field untuk menentukan apakah item kena PPN atau tidak 
}

export interface SalesOrderFormData {
  nomor: string;
  tanggal: string;
  tanggalKirim: string;
  pelanggan: string;
  customerId?: number;
  dipesanOleh: string;
  alamatPengiriman: string;
  keterangan: string;
  kenaPajak?: boolean; // Field untuk menentukan apakah seluruh SO kena pajak atau tidak, bisa override per item  
  totalTermasukPajak? : boolean;
  items: SalesOrderItem[];
}

export interface SalesOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SalesOrderFormData) => void;
  submitting?: boolean;
  initialData?: SalesOrderFormData;
  /** List pelanggan dari API */
  pelangganOptions?: { id: number; nama: string }[];
  /** List sales/staff dari API */
  salesOptions?: { id: number; nama: string }[];
  /** Called when user clicks navigate to a linked form */
  onNavigate?: (target: "uang-muka" | "pengiriman" | "faktur", soData: SalesOrderFormData) => void;
  /** If SO already saved, pass the saved ID so navigation links activate */
  savedId?: string;
}

// ─── Proses Links Config ──────────────────────────────────────────────────────
import { CreditCard, Truck, Receipt } from "lucide-react";

export const PROSES_LINKS = [
  {
    key: "uang-muka" as const,
    label: "Uang Muka",
    desc: "Buat tagihan uang muka dari SO ini",
    icon: CreditCard,
    color: "text-violet-600",
    bg: "bg-violet-50 hover:bg-violet-100 border-violet-200",
  },
  {
    key: "pengiriman" as const,
    label: "Pengiriman",
    desc: "Buat dokumen pengiriman dari SO ini",
    icon: Truck,
    color: "text-sky-600",
    bg: "bg-sky-50 hover:bg-sky-100 border-sky-200",
  },
  {
    key: "faktur" as const,
    label: "Faktur",
    desc: "Buat faktur penjualan dari SO ini",
    icon: Receipt,
    color: "text-emerald-600",
    bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function generateNomor() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `SO-${year}-${rand}`;
}

export const todayStr = () => new Date().toISOString().split("T")[0];

export const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);

export const newItem = (): SalesOrderItem => ({
  id: crypto.randomUUID(),
  produk: "", deskripsi: "", qty: 1, qtyTerkirim: 0,
  satuan: "", harga: 0, diskon: 0, subtotal: 0,
});

export const EMPTY_FORM: SalesOrderFormData = {
  nomor: "",
  tanggal: todayStr(),
  tanggalKirim: "",
  pelanggan: "",
  dipesanOleh: "",
  alamatPengiriman: "",
  keterangan: "",
  items: [newItem()],
};

// ─── Shared Styles ────────────────────────────────────────────────────────────
export const inputBase = `
  w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all
`;

export const inputCompact = `
  px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white
  text-slate-700 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all
`;