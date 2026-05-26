  import { CreditCard, Truck, Receipt } from "lucide-react";

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
    harga: number;
    diskon: number;
    subtotal: number;
    taxable?: boolean;
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
    nomor: string;
    noPO?: string;

    tanggal: string;
    tanggalKirim: string;

    pelanggan: string;
    customerId?: number;

    dipesanOleh: string;

    alamatPengiriman: string;
    keterangan: string;

    kenaPajak?: boolean;
    totalTermasukPajak?: boolean;

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
      target: "uang-muka" | "pengiriman" | "faktur",
      soData: WorkflowSalesOrderData
    ) => void;
  }

  // ─── Proses Links Config ──────────────────────────────────────────────────────
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

    harga: 0,
    diskon: 0,
    subtotal: 0,

    taxable: false,
  });

  export const EMPTY_FORM: SalesOrderFormData = {
    nomor: "",
    noPO: "",

    tanggal: todayStr(),
    tanggalKirim: "",

    pelanggan: "",
    customerId: undefined,

    dipesanOleh: "",

    alamatPengiriman: "",
    keterangan: "",

    kenaPajak: false,
    totalTermasukPajak: false,

    items: [newItem()],
  };

  export function mapFormToApiPayload(
    form: SalesOrderFormData
  ) {
    const subTotal = form.items.reduce(
      (s, item) => s + item.subtotal,
      0
    );

    return {
      header: {
        soNumber: form.nomor,

        poNumber: form.noPO ?? "",

        soDate: new Date(form.tanggal).toISOString(),

        tanggalKirim: form.tanggalKirim
          ? new Date(form.tanggalKirim).toISOString()
          : null,

        customerId: form.customerId ?? 0,

        isTaxAble: form.kenaPajak ?? false,

        isTaxIncluded:
          form.totalTermasukPajak ?? false,

        address: form.alamatPengiriman,

        notes: form.keterangan,
        

        subTotal: subTotal,
      },

      detail: form.items.map((item) => ({
        productId: item.productId ?? 0,

        productCode: item.productCode ?? "",

        productName: item.productName ?? "",

        productQty: item.qty,

        productPrice: item.harga,

        discountAmount: item.diskon,

        totalPrice: item.subtotal,
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