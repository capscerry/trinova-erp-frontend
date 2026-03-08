// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
}

export interface NavGroup {
  group: string;
  items: NavSubItem[];
}

export interface NavModule {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  children?: NavGroup[];
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export type StatusVariant = "success" | "warning" | "danger" | "info" | "default";

export interface StatCardData {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  sub: string;
}

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

export interface TableRow {
  [key: string]: React.ReactNode;
}

// ─── Common Entity Types ──────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type Status = "aktif" | "nonaktif" | "pending" | "selesai" | "dibatalkan";
