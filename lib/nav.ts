import type { NavModule } from "@/types";
import type { Role } from "@/types/auth";

// Tambah allowedRoles: role mana saja yang boleh akses modul ini
export const NAV_CONFIG: (NavModule & { allowedRoles: Role[] })[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    allowedRoles: ["admin", "penjualan", "pembelian", "persediaan"],
  },
  {
    id: "penjualan",
    label: "Penjualan",
    allowedRoles: ["admin", "penjualan"],
    children: [
      {
        group: "Master Data",
        items: [
          { id: "penjualan.pelanggan",         label: "Customer",          href: "/penjualan/pelanggan" },
          { id: "penjualan.kategori_pelanggan", label: "Customer Category", href: "/penjualan/kategori-pelanggan" },
          { id: "penjualan.kategori_penjualan", label: "Sales Category",    href: "/penjualan/kategori-penjualan" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "penjualan.order",      label: "Penawaran Penjualan", href: "/penjualan/quotation" },
          { id: "penjualan.order_list", label: "Pesanan Penjualan",     href: "/penjualan/order" },
          { id: "penjualan.invoice",    label: "Faktur Penjualan",         href: "/penjualan/invoice" },
          { id: "penjualan.retur",      label: "Retur Penjualan",   href: "/penjualan/retur" },
          { id: "penjualn.uang_muka", label  : "Uang Muka Penjualan" , href : "/penjualan/uang-muka"},
          { id: "penjualan.pengiriman_penjualan", label : "Pengiriman Pesanan", href : "/penjualan/pengiriman-penjualan"},
          {id : "penjualan.penerimaan_penjualan", label : "Penerimaan Penjualan", href : "/penjualan/penerimaan-penjualan"}
        ],
      },
    ],
  },
  {
    id: "pembelian",
    label: "Pembelian",
    allowedRoles: ["admin", "pembelian"],
    children: [
      {
        group: "Master Data",
        items: [
          { id: "pembelian.produk",   label: "Supplier Category", href: "/pembelian/category-supplier" },
          { id: "pembelian.supplier", label: "Supplier",          href: "/pembelian/supplier" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "pembelian.po",         label: "Purchase Order",       href: "/pembelian/po" },
          { id: "pembelian.dp",         label: "Purchase Down Payment", href: "/pembelian/pdp" },
          { id: "pembelian.penerimaan", label: "Goods Receipt",        href: "/pembelian/gr" },
          { id: "pembelian.invoice",    label: "Purchase Invoice",     href: "/pembelian/invoice" },
          { id: "pembelian.payment",    label: "Purchase Payment",      href: "/pembelian/payment" },
          { id: "pembelian.retur",      label: "Purchase Returns",     href: "/pembelian/retur" },
        ],
      },
      {
        group: "AI & Analitik",
        items: [
          { id: "pembelian.insight", label: "AI Purchasing Insight", href: "/pembelian/insight" },
        ],
      },
    ],
  },
  {
    id: "rekomendasi",
    label: "Rekomendasi AI",
    href: "/rekomendasi",
    allowedRoles: ["admin", "penjualan", "pembelian", "persediaan"],
  },
  {
    id: "persediaan",
    label: "Persediaan",
    allowedRoles: ["admin", "persediaan"],
    children: [
      {
        group: "Master Data",
        items: [
          { id: "persediaan.produk",   label: "Goods & Service", href: "/persediaan/produk" },
          { id: "persediaan.kategori", label: "Item Category",   href: "/persediaan/kategori" },
          { id: "persediaan.gudang",   label: "Warehouse",       href: "/persediaan/gudang" },
          { id: "persediaan.satuan",   label: "Unit of Measure", href: "/persediaan/satuan" },
          { id: "persediaan.merk",     label: "Brand",           href: "/persediaan/merk" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "persediaan.permintaan_barang",    label: "Goods Request",     href: "/persediaan/permintaan-barang" },
          { id: "persediaan.transfer_barang",       label: "Stock Transfer",    href: "/persediaan/transfer-barang" },
          { id: "persediaan.stok",                  label: "Stock",             href: "/persediaan/stok" },
          { id: "persediaan.penyelesaian_pesanan",  label: "Order Fulfillment", href: "/persediaan/penyelesaian-pesanan" },
        ],
      },
    ],
  },
];

// Helper: filter nav berdasarkan role
export function getNavForRole(role: Role) {
  if (role === "admin") return NAV_CONFIG;
  return NAV_CONFIG.filter((m) => m.allowedRoles.includes(role));
}
