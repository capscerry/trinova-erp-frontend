import { AppShell } from "@/components/layout";
import { ModuleOverview } from "@/components/modules/ModuleOverview";
import { NAV_CONFIG } from "@/lib/nav";

const STATS = [
  { label: "Total Penjualan", value: "Rp 4,82Jt", change: "+12.4%", trend: "up"   as const, sub: "Bulan ini" },
  { label: "Invoice Lunas",   value: "64",          change: "+8",     trend: "up"   as const, sub: "Bulan ini" },
  { label: "Invoice Pending", value: "12",          change: "-3",     trend: "down" as const, sub: "Bulan ini" },
  { label: "Rata-rata Order", value: "Rp 445rb",    change: "+5.2%",  trend: "up"   as const, sub: "Per transaksi" },
];

export default function PenjualanPage() {
  const module = NAV_CONFIG.find((n) => n.id === "penjualan")!;
  return (
    <AppShell title="Penjualan" subtitle="Overview modul penjualan">
      <ModuleOverview module={module} stats={STATS} />
    </AppShell>
  );
}
