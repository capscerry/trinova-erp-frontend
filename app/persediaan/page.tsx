import { AppShell } from "@/components/layout";
import { ModuleOverview } from "@/components/modules/ModuleOverview";
import { NAV_CONFIG } from "@/lib/nav";

const STATS = [
  { label: "Total Produk",     value: "284",         change: "+6",    trend: "up"   as const, sub: "Item terdaftar" },
  { label: "Stok Aman",        value: "261",         change: "+4",    trend: "up"   as const, sub: "Item" },
  { label: "Stok Kritis",      value: "23",          change: "+2",    trend: "down" as const, sub: "Perlu reorder" },
  { label: "Nilai Inventaris", value: "Rp 48,2Jt",   change: "+7.3%", trend: "up"   as const, sub: "Estimasi" },
];

export default function PersediaanPage() {
  const module = NAV_CONFIG.find((n) => n.id === "persediaan")!;
  return (
    <AppShell title="Persediaan" subtitle="Overview modul persediaan">
      <ModuleOverview module={module} stats={STATS} />
    </AppShell>
  );
}
