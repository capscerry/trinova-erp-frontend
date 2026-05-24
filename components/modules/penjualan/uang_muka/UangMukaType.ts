    // ─── Types ────────────────────────────────────────────────────────────────────
    export interface UangMukaFormData {
    id: number;
    pelanggan: string;
    customerId?: number;

    noFaktur: string;
    noFakturMode: "auto" | "manual";
    tanggal: string;

    uangMuka: number;
    noPO: string;

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
    noFaktur: string;
    tanggal: string;
    customerId: number;
    noPO: string;
    nominalUangMuka: number;
    nomorSo: string;
    totalAmount: number;
    syaratPembayaran: number;
    address: string;
    notes: string;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────
    export const todayStr = () => new Date().toISOString().split("T")[0];

    export function generateAutoFaktur() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const seq = String(Math.floor(Math.random() * 900) + 100);

    return `UM/${yy}${mm}/${seq}`;
    }

    export const EMPTY_FORM: UangMukaFormData = {
    id: 0,
    pelanggan: "",
    customerId: 0,

    noFaktur: generateAutoFaktur(),
    noFakturMode: "auto",
    tanggal: todayStr(),

    uangMuka: 0,
    noPO: "",

    kenaPajak: false,
    totalTermasukPajak: true,

    syaratPembayaran: "",
    alamat: "",
    keterangan: "",

    fakturType: "Faktur Penjualan",
    noPesanan: "",
    totalHargaPesanan: 0,
    };

    export function mapFormToApiPayload(form: UangMukaFormData): UangMukaPayload {
    return {
        noFaktur: form.noFaktur,
        tanggal:form.tanggal,

        customerId: form.customerId ?? form.id ?? 0,

        noPO: form.noPO,
        nominalUangMuka: form.uangMuka,
        nomorSo: form.noPesanan,
        totalAmount: form.totalHargaPesanan,

        syaratPembayaran: Number(form.syaratPembayaran) || 0,

        address: form.alamat,
        notes: form.keterangan,
    };
    }

    // ─── Shared Styles ────────────────────────────────────────────────────────────
    export const inputBase = `
    w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white
    text-slate-700 placeholder-slate-400
    focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 transition-all
    `;