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
          { id: "penjualan.pelanggan", label: "Data Pelanggan", href: "/penjualan/pelanggan" },
          { id: "penjualan.produk",    label: "Data Produk",    href: "/penjualan/produk" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "penjualan.order",   label: "Sales Order",       href: "/penjualan/order" },
          { id: "penjualan.invoice", label: "Invoice",           href: "/penjualan/invoice" },
          { id: "penjualan.retur",   label: "Retur Penjualan",   href: "/penjualan/retur" },
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
          { id: "pembelian.supplier", label: "Data Supplier", href: "/pembelian/supplier" },
          { id: "pembelian.produk",   label: "Data Produk",   href: "/pembelian/produk" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "pembelian.po",          label: "Purchase Order",    href: "/pembelian/po" },
          { id: "pembelian.penerimaan",  label: "Penerimaan Barang", href: "/pembelian/penerimaan" },
          { id: "pembelian.retur",       label: "Retur Pembelian",   href: "/pembelian/retur" },
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
          { id: "persediaan.produk",    label: "Data Produk", href: "/persediaan/produk" },
          { id: "persediaan.kategori",  label: "Kategori",    href: "/persediaan/kategori" },
          { id: "persediaan.gudang",    label: "Data Gudang", href: "/persediaan/gudang" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "persediaan.stok",    label: "Stok Barang",   href: "/persediaan/stok" },
          { id: "persediaan.mutasi",  label: "Mutasi Stok",   href: "/persediaan/mutasi" },
          { id: "persediaan.opname",  label: "Stock Opname",  href: "/persediaan/opname" },
        ],
      },
    ],
  },
];
