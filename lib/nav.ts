import type { NavModule } from "@/types";

export const NAV_CONFIG: NavModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    id: "penjualan",
    label: "Penjualan",
    children: [
      {
        group: "Master Data",
        items: [
          { id: "penjualan.pelanggan", label: "Customer", href: "/penjualan/pelanggan" },
          { id: "penjualan.kategori_pelanggan",    label: "Customer Category",    href: "/penjualan/kategori-pelanggan" },
          { id :"penjualan.kategori_penjualan", label : "Sales Category", href : "/penjualan/kategori-penjualan"}
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "penjualan.order",   label: "Sales Quotation",       href: "/penjualan/quotation" },
          { id: "penjualan.order_list",   label: "Sales Order",       href: "/penjualan/order" },
          { id: "penjualan.invoice", label: "Invoice",           href: "/penjualan/invoice" },
          { id: "penjualan.retur",   label: "Sales Returns",   href: "/penjualan/retur" },
        ],
      },
    ],
  },
  {
    id: "pembelian",
    label: "Pembelian",
    children: [
      {
        group: "Master Data",
        items: [
          { id: "pembelian.supplier", label: "Supplier", href: "/pembelian/supplier" },
          { id: "pembelian.produk",   label: "Supplier Category",   href: "/pembelian/category-supplier" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "pembelian.po",          label: "Purchase Order",    href: "/pembelian/po" },
          { id: "pembelian.penerimaan",  label: "Goods Receipt", href: "/pembelian/gr" },
          {id : "pembelian.invoice",       label: "Purchase Invoice",          href: "/pembelian/invoice" },
          { id: "pembelian.retur",       label: "Purchase Returns ",   href: "/pembelian/retur" },
        ],
      },
    ],
  },
  {
    id: "persediaan",
    label: "Persediaan",
    children: [
      {
        group: "Master Data",
        items: [
          { id: "persediaan.produk",    label: "Goods & Service", href: "/persediaan/produk" },
          { id: "persediaan.kategori",  label: "Item Category",    href: "/persediaan/kategori" },
          { id: "persediaan.gudang",    label: "Warehouse", href: "/persediaan/gudang" },
          {id : "persediaan.satuan", label: "Unit of Measure", href: "/persediaan/satuan" },
          {id : "persediaan.merk", label: "Brand", href: "/persediaan/merk" }
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "persediaan.permintaan_barang",    label: "Goods Request",   href: "/persediaan/permintaan-barang" },
          {id : "persediaan.transfer_barang", label: "Stock Transfer",  href: "/persediaan/transfer-barang" },
          {id : "persediaan.stok", label: "Stock",  href: "/persediaan/stok" },
          {id :  "persediaan.penyelesaian_pesanan", label: "Order Fulfillment", href: "/persediaan/penyelesaian-pesanan" },

        ],
      },
    ],
  },
];
