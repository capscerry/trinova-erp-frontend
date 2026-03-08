import { AppShell } from "@/components/layout";
import { ModuleOverview } from "@/components/modules/ModuleOverview";
import { NAV_CONFIG } from "@/lib/nav";

const STATS = [
  { label: "Total Pembelian", value: "Rp 2,17Jt", change: "+3.1%", trend: "up"   as const, sub: "Bulan ini" },
  { label: "PO Diterima",     value: "28",          change: "+4",    trend: "up"   as const, sub: "Bulan ini" },
  { label: "PO Pending",      value: "6",           change: "+2",    trend: "down" as const, sub: "Menunggu" },
  { label: "Supplier Aktif",  value: "14",          change: "+1",    trend: "up"   as const, sub: "Terdaftar" },
];

export default function PembelianPage() {
  const module = NAV_CONFIG.find((n) => n.id === "pembelian")!;
  return (
    <AppShell title="Pembelian" subtitle="Overview modul pembelian">
      <ModuleOverview module={module} stats={STATS} />
    </AppShell>
  );
}
