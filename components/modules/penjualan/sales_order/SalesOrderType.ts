import { Receipt } from "lucide-react";

  // ─── Types ────────────────────────────────────────────────────────────────────
  export interface SalesOrderItem {
    id: string;
    productId?: number;
    productCode?: string;
    productName?: string;
    deskripsi: string;
    qty: number;
    qtyTerkirim: number;
    satuan: string;
    uomId?: number;
    harga: number;
    diskon: number;
    subtotal: number;
    /** Gudang asal barang ini akan diambil saat dikirim nanti */
    warehouseId?: number;
    warehouseName?: string;
  }

  export interface SalesOrder {
    id: string;
    nomor: string;
    noPO?: string;

    tanggal: string;
    tanggalKirim: string;
    pelanggan: string;
    dipesanOleh: string;
    alamatPengiriman: string;
    keterangan: string;

    status:
      | "Draft"
      | "Dikonfirmasi"
      | "Diproses"
      | "Dikirim"
      | "Selesai"
      | "Dibatalkan";

    total: number;
    items: SalesOrderFormData["items"];
  }

  export interface SalesOrderFormData {
    id?: string;
    nomor: string;
    noPO?: string;

    /** Referensi ke penawaran penjualan (opsional) */
    quotationId?: number;
    quotationNumber?: string;

    tanggal: string;

    pelanggan: string;
    customerId?: number;

    dipesanOleh: string;

    alamatPengiriman: string;
    keterangan: string;

    kenaPajak?: boolean;

    /** Barang indent (pesanan khusus/made-to-order) -- menentukan apakah
     * Sales Staff diarahkan membuat 1 invoice reguler atau 2 invoice
     * proforma (DP 30% + Pelunasan 70%) di tahap Faktur nanti. */
    isIndent?: boolean;

    items: SalesOrderItem[];
  }

  export interface WorkflowSalesOrderData
    extends SalesOrderFormData {
    orderId?: number;
    totalHargaPesanan?: number;
    savedSo?: any;
  }

  export interface SalesOrderModalProps {
    open: boolean;
    onClose: () => void;

    onSubmit: (data: SalesOrderFormData) => void;

    initialData?: SalesOrderFormData;

    pelangganOptions?: {
      id: number;
      nama: string;
    }[];

    salesOptions?: {
      id: number;
      nama: string;
    }[];

    onNavigate?: (
      target: "uang-muka" | "pengiriman" | "faktur" | "penerimaan",
      soData: WorkflowSalesOrderData
    ) => void;
  }

  // ─── Proses Links Config ──────────────────────────────────────────────────────
  // Setelah SO disimpan, langkah lanjutan yang boleh diambil langsung dari SO
  // HANYA Faktur -- flow-nya selalu SO -> Faktur, jadi Uang Muka tidak lagi
  // ditawarkan di sini. Untuk SO indent, tombol "Uang Muka" sekarang muncul
  // di dalam modal Faktur sendiri (setelah faktur disimpan dengan Jenis
  // Invoice = Proforma DP 30%), bukan langsung dari SO. "Pengiriman" sengaja
  // tidak ada di sini -- DO baru boleh dibuat setelah seluruh faktur/proforma
  // SO ini lunas 100%, dan jalur resminya adalah dari halaman Pengiriman
  // sendiri ("+ Tambah" -> pilih SO yang sudah lunas), bukan dari modal SO.
  // "Penerimaan" juga sengaja tidak ada -- pembayaran harus selalu tercatat
  // terhadap Uang Muka atau Faktur spesifik (bukan langsung ke SO), supaya
  // jelas dokumen mana yang dilunasi dan status yang di-update konsisten.
  export const PROSES_LINKS = [
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
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const seq   = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");

    return `SO.${year}.${month}.${seq}`;
  }

  export const todayStr = () =>
    new Date().toISOString().split("T")[0];

  export const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  export const newItem = (): SalesOrderItem => ({
    id: crypto.randomUUID(),

    productId: 0,
    productCode: "",
    productName: "",

    deskripsi: "",

    qty: 1,
    qtyTerkirim: 0,

    satuan: "",
    uomId: undefined,

    harga: 0,
    diskon: 0,
    subtotal: 0,

    warehouseId: undefined,
    warehouseName: "",
  });

  export const EMPTY_FORM: SalesOrderFormData = {
    nomor: "",
    noPO: "",

    quotationId: undefined,
    quotationNumber: undefined,

    tanggal: todayStr(),

    pelanggan: "",
    customerId: undefined,

    dipesanOleh: "",

    alamatPengiriman: "",
    keterangan: "",

    kenaPajak: false,
    isIndent: false,

    items: [newItem()],
  };

  export function mapFormToApiPayload(
    form: SalesOrderFormData
  ) {
    // Definisi konsisten dengan SQ:
    //   grossAmount = Σ (harga × qty)               — SEBELUM diskon & pajak (internal saja)
    //   discountTotal = Σ (harga × qty × diskon%)    — total potongan diskon
    //   taxableBase   = grossAmount − discountTotal  — dasar pengenaan pajak
    //   taxAmount     = taxableBase × 11%            — hanya jika kenaPajak
    //   subTotal (dikirim ke backend) = taxableBase + taxAmount — GRAND TOTAL
    //   final, sama seperti keputusan field Subtotal di Sales Quotation.
    const grossAmount = form.items.reduce(
      (s, item) => s + item.harga * item.qty,
      0
    );

    const discountTotal = form.items.reduce(
      (s, item) => s + item.harga * item.qty * (item.diskon / 100),
      0
    );

    const taxableBase = grossAmount - discountTotal;
    const taxAmount = (form.kenaPajak ?? false) ? taxableBase * 0.11 : 0;
    const subTotal = taxableBase + taxAmount;

    return {
      header: {
        // Opsional — kalau diisi (mode edit), backend akan UPDATE record
        // ini (upsert), bukan membuat Sales Order baru.
        orderId: form.id ? Number(form.id) : undefined,

        soNumber: form.nomor,

        poNumber: form.noPO ?? "",

        quotationId: form.quotationId ?? null,

        soDate: new Date(form.tanggal).toISOString(),

        customerId: form.customerId ?? 0,

        isTaxAble: form.kenaPajak ?? false,

        isTaxIncluded: form.kenaPajak ?? false,

        isIndent: form.isIndent ?? false,

        address: form.alamatPengiriman,

        notes: form.keterangan,

        subTotal: subTotal,
        discountTotal: discountTotal,
        taxTotal: taxAmount,
      },

      detail: form.items.map((item) => ({
        productId: item.productId ?? 0,

        productCode: item.productCode ?? "",

        productName: item.productName ?? "",

        productQty: item.qty,

        productPrice: item.harga,

        // FIX: model backend SalesOrderDetail punya field DiscountPercent
        // (int, persentase) — BUKAN discountAmount (nominal). Sebelumnya
        // field ini terkirim dengan nama salah sehingga diabaikan backend.
        discountPercent: item.diskon,

        totalPrice: item.subtotal,

        // FIX: warehouseId per item belum pernah dikirim ke payload,
        // padahal field dropdown Gudang sudah ada di form sejak sebelumnya.
        wareHouseId: item.warehouseId ?? null,

        // FIX: uomId juga belum pernah dikirim — sama pola bug-nya.
        // Fallback 0 (bukan null) karena UomId di backend bertipe int
        // non-nullable — mengirim null menyebabkan validation error.
        uomId: item.uomId ?? 0,
      })),
    };
  }

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
