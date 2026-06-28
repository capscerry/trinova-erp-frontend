export type SalesStatusModule =
  | "quotation"
  | "sales-order"
  | "down-payment"
  | "delivery-order"
  | "sales-invoice"
  | "sales-receipt";

export const SALES_STATUS_OPTIONS: Record<SalesStatusModule, string[]> = {
  quotation: ["Draft", "Sent", "Approved", "Rejected", "Cancelled"],
  "sales-order": ["Draft", "Approved", "Confirmed", "Processing", "Shipped", "Completed", "Cancelled"],
  "down-payment": ["Draft", "Received", "Used", "Cancelled"],
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

    dikonfirmasi: "Confirmed",
    diproses: "Processing",
    selesai: "Completed",

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
  return normalizeSalesStatus(module, status) === "Approved";
}

export function getStatusTone(status?: string | null) {
  const normalized = normalizeSalesStatus("sales-invoice", status);

  if (["Approved", "Completed", "Paid", "Validated", "Received"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  if (["Sent", "Confirmed", "Issued", "Shipped", "Invoiced"].includes(normalized)) {
    return "bg-sky-100 text-sky-700 border-sky-200";
  }

  if (["Processing", "Partially Paid", "Overdue"].includes(normalized)) {
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
