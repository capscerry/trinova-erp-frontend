import type { NavModule } from "@/types";
import type { Role } from "@/types/auth";

// Tambah allowedRoles: role mana saja yang boleh akses modul ini
export const NAV_CONFIG: (NavModule & { allowedRoles: Role[] })[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    allowedRoles: ["admin", "penjualan", "pembelian", "persediaan", "procurement_manager"],
  },
  {
    id: "user",
    label: "User",
    allowedRoles: ["admin"],
    children: [
      {
        group: "Access Control",
        items: [
          { id: "user.master", label: "Master User", href: "/user" },
        ],
      },
    ],
  },
  {
    id: "penjualan",
    label: "Sales",
    allowedRoles: ["admin", "penjualan"],
    children: [
      {
        group: "Master Data",
        items: [
          { id: "penjualan.pelanggan",         label: "Customers",           href: "/penjualan/pelanggan" },
          { id: "penjualan.kategori_pelanggan", label: "Customer Categories", href: "/penjualan/kategori-pelanggan" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "penjualan.order",                label: "Sales Quotations", href: "/penjualan/quotation" },
          { id: "penjualan.order_list",           label: "Sales Orders",     href: "/penjualan/order" },
          { id: "penjualan.invoice",              label: "Sales Invoices",   href: "/penjualan/invoice" },
          { id: "penjualan.retur",                label: "Sales Returns",    href: "/penjualan/retur" },
          { id: "penjualn.uang_muka",             label: "Sales Down Payments", href: "/penjualan/uang-muka" },
          { id: "penjualan.pengiriman_penjualan", label: "Delivery Orders",  href: "/penjualan/pengiriman-penjualan" },
          { id: "penjualan.penerimaan_penjualan", label: "Sales Receipts",   href: "/penjualan/penerimaan-penjualan" },
        ],
      },
    ],
  },
  // Purchasing staff navigation (pembelian role + admin)
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
          { id: "pembelian.po",         label: "Purchase Order",        href: "/pembelian/po" },
          { id: "pembelian.dp",         label: "Purchase Down Payment", href: "/pembelian/pdp" },
          { id: "pembelian.penerimaan", label: "Goods Receipt",         href: "/pembelian/gr" },
          { id: "pembelian.invoice",    label: "Purchase Invoice",      href: "/pembelian/invoice" },
          { id: "pembelian.payment",    label: "Purchase Payment",      href: "/pembelian/payment" },
          { id: "pembelian.retur",      label: "Purchase Returns",      href: "/pembelian/retur" },
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
  // Procurement Manager navigation — restricted to approval-related pages only.
  // All operational purchasing pages are hidden from the nav (routes still exist and
  // backend access is unchanged — the dashboard internally calls all Purchasing APIs).
  {
    id: "pembelian",
    label: "Pembelian",
    allowedRoles: ["procurement_manager"],
    children: [
      {
        group: "Persetujuan PO",
        items: [
          { id: "pembelian.track_po_status",  label: "Track PO Status",   href: "/pembelian/track-po-status" },
          { id: "pembelian.po_approval_list", label: "PO Approval List",  href: "/pembelian/po-approval-list" },
        ],
      },
    ],
  },
  {
    id: "pembelian",
    label: "Pembelian",
    allowedRoles: ["procurement_manager"],
    children: [
      {
        group: "Persetujuan PO",
        items: [
          { id: "pembelian.track_po_status",  label: "Track PO Status",   href: "/pembelian/track-po-status" },
          { id: "pembelian.po_approval_list", label: "PO Approval List",  href: "/pembelian/po-approval-list" },
        ],
      },
    ],
  },
  {
    id: "rekomendasi",
    label: "Rekomendasi AI",
    href: "/rekomendasi",
    allowedRoles: ["admin", "penjualan", "pembelian", "persediaan", "procurement_manager"],
  },
  {
    id: "persediaan",
    label: "Persediaan",
    allowedRoles: ["admin", "persediaan"],
    children: [
      {
        group: "Master Data",
        items: [
          { id: "persediaan.produk",      label: "Product",  href: "/persediaan/produk" },
          { id: "persediaan.kategori",    label: "Category",    href: "/persediaan/kategori" },
          { id: "persediaan.subkategori", label: "Subcategory",      href: "/persediaan/subkategori" },
          { id: "persediaan.gudang",      label: "Warehouse",        href: "/persediaan/gudang" },
          { id: "persediaan.satuan",      label: "Unit of Measure",  href: "/persediaan/satuan" },
        ],
      },
      {
        group: "Operasional",
        items: [
          { id: "persediaan.permintaan_barang",    label: "Purchase Requisition", href: "/persediaan/permintaan-pembelian" },
          { id: "persediaan.stok",                 label: "Inventory Stock",      href: "/persediaan/stok" },
          { id: "persediaan.transaksi_stok",       label: "Stock Transaction",    href: "/persediaan/transaksi-stok" },
          { id: "persediaan.transfer_barang",      label: "Stock Transfer",       href: "/persediaan/transfer-barang" },
          { id: "persediaan.penyelesaian_pesanan", label: "Order Fulfillment",    href: "/persediaan/penyelesaian-pesanan" },
          { id: "persediaan.demand_forecast",      label: "Demand Forecast",      href: "/persediaan/demand-forecast" },
        ],
      },
    ],
  },
];

// Helper: filter nav berdasarkan role.
// For admin, return the full config minus the procurement_manager-specific pembelian entry
// (admin gets the regular pembelian entry which already covers all /pembelian routes).
// For all other roles, filter by allowedRoles as normal.
export function getNavForRole(role: Role) {
  if (role === "admin") {
    return NAV_CONFIG.filter((m) => !m.allowedRoles.every((r) => r === "procurement_manager"));
  }
  return NAV_CONFIG.filter((m) => m.allowedRoles.includes(role));
}
