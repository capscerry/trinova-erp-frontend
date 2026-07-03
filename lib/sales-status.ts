export type SalesStatusModule =
  | "quotation"
  | "sales-order"
  | "down-payment"
  | "delivery-order"
  | "sales-invoice"
  | "sales-receipt";

export const SALES_STATUS_OPTIONS: Record<SalesStatusModule, string[]> = {
  quotation: ["Draft", "Sent", "Approved", "Processed", "Rejected", "Cancelled"],
  "sales-order": [
    "Draft",
    "Approved",
    "Confirmed",
    "Processing",
    "Delivery Overdue",
    "In Delivery",
    "Delivered",
    "Invoiced",
    "Partially Paid",
    "Completed",
    "Cancelled",
  ],
  "down-payment": ["Draft", "Issued", "Partially Paid", "Received", "Used", "Cancelled"],
  "delivery-order": ["Draft", "Approved", "Shipped", "Received", "Invoiced", "Cancelled"],
  "sales-invoice": ["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Cancelled"],
  "sales-receipt": ["Draft", "Validated", "Cancelled"],
};

export function normalizeSalesStatus(
  module: SalesStatusModule,
  status?: string | null
) {
  const value = (status || "").trim();
  if (!value) return "Draft";

  const canonical = SALES_STATUS_OPTIONS[module].find(
    (option) => option.toLowerCase() === value.toLowerCase()
  );

  if (canonical) return canonical;

  const aliases: Record<string, string> = {
    draft: "Draft",

    dikirim: module === "quotation" ? "Sent" : "Shipped",
    disetujui: "Approved",
    ditolak: "Rejected",
    dibatalkan: "Cancelled",

    diproses: module === "quotation" ? "Processed" : "Processing",
    terproses: "Processed",
    processed: module === "quotation" ? "Processed" : "Processing",
    dikonfirmasi: "Confirmed",
    selesai: "Completed",

    "telat kirim": "Delivery Overdue",
    "terlambat kirim": "Delivery Overdue",
    "delivery overdue": "Delivery Overdue",
    "in delivery": "In Delivery",
    "sedang dikirim": "In Delivery",
    delivered: "Delivered",

    diterima: "Received",
    terpakai: "Used",
    ditagih: "Invoiced",

    terbit: "Issued",
    "belum dibayar": "Issued",
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
    "sales-order": ["Draft", "Approved", "Confirmed", "Processing", "Delivery Overdue"],
    "down-payment": ["Received"],
    "delivery-order": ["Draft", "Approved", "Shipped", "Received"],
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

  if (["Approved", "Completed", "Paid", "Validated", "Received", "Delivered"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  if (["Sent", "Confirmed", "Issued", "Shipped", "Invoiced", "In Delivery", "Processed"].includes(normalized)) {
    return "bg-sky-100 text-sky-700 border-sky-200";
  }

  if (["Processing", "Partially Paid", "Overdue", "Delivery Overdue"].includes(normalized)) {
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
