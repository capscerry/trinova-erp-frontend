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
          { id: "penjualan.order",      label: "Sales Quotation", href: "/penjualan/quotation" },
          { id: "penjualan.order_list", label: "Sales Order",     href: "/penjualan/order" },
          { id: "penjualan.invoice",    label: "Invoice",         href: "/penjualan/invoice" },
          { id: "penjualan.retur",      label: "Sales Returns",   href: "/penjualan/retur" },
          { id: "penjualn.uang_muka", label  : "Uang Muka" , href : "/penjualan/uang-muka"},
          { id: "penjualan.pengiriman_penjualan", label : "Pengiriman Penjualan", href : "/penjualan/pengiriman-penjualan"}
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
          { id: "pembelian.supplier", label: "Supplier",          href: "/pembelian/supplier" },
          { id: "pembelian.produk",   label: "Supplier Category", href: "/pembelian/category-supplier" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "pembelian.po",         label: "Purchase Order",   href: "/pembelian/po" },
          { id: "pembelian.penerimaan", label: "Goods Receipt",    href: "/pembelian/gr" },
          { id: "pembelian.invoice",    label: "Purchase Invoice", href: "/pembelian/invoice" },
          { id: "pembelian.retur",      label: "Purchase Returns", href: "/pembelian/retur" },
        ],
      },
    ],
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
          { id: "persediaan.subkategori", label: "Subcategory", href: "/persediaan/subkategori" },
          { id: "persediaan.gudang",   label: "Warehouse",       href: "/persediaan/gudang" },
          { id: "persediaan.satuan",   label: "Unit of Measure", href: "/persediaan/satuan" },
        //  { id: "persediaan.merk",     label: "Brand",           href: "/persediaan/merk" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "persediaan.permintaan_barang",     label: "Purchase Requisition",     href: "/persediaan/permintaan-pembelian" },
          { id: "persediaan.transfer_barang",       label: "Stock Transfer",    href: "/persediaan/transfer-barang" },
          { id: "persediaan.stok",                  label: "Stock",             href: "/persediaan/stok" },
          { id: "persediaan.transaksi_stok",        label: "Stock Transaction", href: "/persediaan/transaksi-stok",},
          { id: "persediaan.penyelesaian_pesanan",  label: "Order Fulfillment", href: "/persediaan/penyelesaian-pesanan" },
          { id: "persediaan.demand_forecast",       label: "Demand Forecast",   href: "/persediaan/demand-forecast", },
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
