export type SalesStatusModule =
  | "quotation"
  | "sales-order"
  | "down-payment"
  | "delivery-order"
  | "sales-invoice"
  | "sales-receipt";

export const SALES_STATUS_OPTIONS: Record<SalesStatusModule, string[]> = {
  quotation: ["Draft", "Sent", "Approved", "Processed", "Rejected", "Cancelled"],
  // Disederhanakan (flow baru, lihat plan "Redesain Flow & Status Sales
  // Module"): "Diproses" mencakup seluruh tahap penagihan & pembayaran
  // (invoice reguler maupun proforma DP/pelunasan untuk barang indent) --
  // status invoice-nya sendiri sudah cukup granular, SO tidak perlu
  // duplikasi. "In Delivery" & "Completed" sekarang murni dipicu oleh
  // Delivery Order (dibuat / ditandai diterima), bukan lagi oleh pelunasan
  // invoice semata.
  "sales-order": ["Belum Diproses", "Diproses", "In Delivery", "Completed", "Cancelled"],
  "down-payment": ["Draft", "Unpaid", "Partially Paid", "Received", "Used", "Cancelled"],
  // Disederhanakan: DO sekarang selalu dibuat SETELAH invoice terkait lunas
  // 100%, jadi statusnya langsung "In Delivery" begitu dibuat (bukan lagi
  // Draft/Approved/Shipped berurutan), lalu manual ke "Received" setelah
  // customer tanda tangan. "Invoiced" sudah tidak relevan (invoice sekarang
  // selalu mendahului DO, bukan sebaliknya).
  "delivery-order": ["In Delivery", "Received", "Cancelled"],
  "sales-invoice": ["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Cancelled"],
  "sales-receipt": ["Draft", "Validated", "Cancelled"],
};

export function normalizeSalesStatus(
  module: SalesStatusModule,
  status?: string | null
) {
  const value = (status || "").trim();
  // Default per module (bukan selalu "Draft" lagi) -- sales-order default ke
  // "Belum Diproses", delivery-order ke "In Delivery" (keduanya kebetulan
  // elemen pertama di SALES_STATUS_OPTIONS masing-masing), sisanya tetap "Draft".
  if (!value) return SALES_STATUS_OPTIONS[module][0];

  const canonical = SALES_STATUS_OPTIONS[module].find(
    (option) => option.toLowerCase() === value.toLowerCase()
  );

  if (canonical) return canonical;

  const aliases: Record<string, string> = {
    draft: "Draft",

    "belum diproses": "Belum Diproses",
    "belum terproses": "Belum Diproses",

    dikirim: module === "quotation" ? "Sent" : "In Delivery",
    disetujui: "Approved",
    ditolak: "Rejected",
    dibatalkan: "Cancelled",

    diproses: module === "quotation" ? "Processed" : module === "sales-order" ? "Diproses" : "Processing",
    terproses: module === "sales-order" ? "Diproses" : "Processed",
    processed: module === "quotation" ? "Processed" : "Processing",
    dikonfirmasi: "Confirmed",
    selesai: "Completed",

    "in delivery": "In Delivery",
    "sedang dikirim": "In Delivery",

    diterima: "Received",
    terpakai: "Used",
    ditagih: module === "sales-order" ? "Diproses" : "Issued",

    terbit: "Issued",
    issued: module === "down-payment" ? "Unpaid" : "Issued",
    unpaid: "Unpaid",
    "belum dibayar": module === "down-payment" ? "Unpaid" : "Issued",
    "dibayar sebagian": "Partially Paid",
    "sebagian dibayar": "Partially Paid",
    lunas: "Paid",
    "jatuh tempo": "Overdue",

    tervalidasi: "Validated",
  };

  return aliases[value.toLowerCase()] ?? toTitleCase(value);
}

export function isApprovedForPicker(
  module: SalesStatusModule,
  status?: string | null
) {
  const normalized = normalizeSalesStatus(module, status);

  const selectableStatuses: Record<SalesStatusModule, string[]> = {
    quotation: ["Draft", "Sent", "Approved"],
    "sales-order": ["Belum Diproses", "Diproses"],
    "down-payment": ["Received"],
    "delivery-order": ["In Delivery"],
    "sales-invoice": ["Issued", "Partially Paid", "Overdue"],
    "sales-receipt": ["Draft"],
  };

  return selectableStatuses[module].includes(normalized);
}

export function getStatusTone(status?: string | null) {
  const value = (status || "").trim();
  const normalized =
    Object.values(SALES_STATUS_OPTIONS)
      .flat()
      .find((option) => option.toLowerCase() === value.toLowerCase()) ||
    normalizeSalesStatus("sales-order", value);

  if (["Approved", "Completed", "Paid", "Validated", "Received"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  if (["Sent", "Issued", "In Delivery", "Processed"].includes(normalized)) {
    return "bg-sky-100 text-sky-700 border-sky-200";
  }

  if (["Diproses", "Partially Paid", "Overdue", "Unpaid"].includes(normalized)) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }

  if (["Rejected", "Cancelled"].includes(normalized)) {
    return "bg-red-100 text-red-700 border-red-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
