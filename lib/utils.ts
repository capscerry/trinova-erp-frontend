import { type ClassValue, clsx } from "clsx";
import type { StatusVariant } from "@/types";

/** Merge Tailwind class names safely */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format number to Rupiah string */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

/** Format date to Indonesian locale */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

/** Map a status string to a StatusVariant */
export function getStatusVariant(status: string): StatusVariant {
  const successWords = ["lunas", "aktif", "aman", "diterima", "selesai"];
  const warningWords = ["pending", "dikirim", "proses", "non-aktif"];
  const dangerWords  = ["kritis", "overdue", "dibatalkan", "gagal"];

  const lower = status.toLowerCase();
  if (successWords.some((w) => lower.includes(w))) return "success";
  if (warningWords.some((w) => lower.includes(w))) return "warning";
  if (dangerWords.some((w)  => lower.includes(w))) return "danger";
  return "default";
}
