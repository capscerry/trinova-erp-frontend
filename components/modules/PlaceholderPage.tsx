import { AppShell } from "@/components/layout";
import { Card } from "@/components/ui";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  description?: string;
}

/**
 * Gunakan komponen ini sebagai starting point untuk halaman yang
 * belum dikembangkan. Ganti isi <Card> dengan komponen & logika
 * yang sesuai untuk setiap sub-fitur.
 */
export function PlaceholderPage({
  title,
  subtitle,
  description = "Halaman ini sedang dalam pengembangan. Silakan implementasikan fitur sesuai kebutuhan.",
}: PlaceholderPageProps) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <Card className="text-center py-16">
        <Construction size={40} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold font-serif text-navy-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto font-serif">{description}</p>
      </Card>
    </AppShell>
  );
}
