import { AppShell } from "@/components/layout";
import { StatCard, Card, StatusBadge } from "@/components/ui";

const STATS = [
  { label: "Total Penjualan", value: "Rp 4,82Jt",  change: "+12.4%", trend: "up"   as const, sub: "Bulan ini" },
  { label: "Total Pembelian", value: "Rp 2,17Jt",  change: "+3.1%",  trend: "up"   as const, sub: "Bulan ini" },
  { label: "Stok Tersedia",   value: "1.284",       change: "-2.3%",  trend: "down" as const, sub: "Unit aktif" },
  { label: "Order Pending",   value: "38",          change: "+5",     trend: "down" as const, sub: "Menunggu proses" },
];

const RECENT = [
  { ref: "INV-2024-001", keterangan: "Penjualan ke PT Maju Bersama",      tanggal: "08 Mar 2026", nilai: "Rp 1.200.000", status: "Lunas" },
  { ref: "PO-2024-015",  keterangan: "Pembelian dari CV Elektronik Prima", tanggal: "07 Mar 2026", nilai: "Rp 5.400.000", status: "Diterima" },
  { ref: "INV-2024-002", keterangan: "Penjualan ke CV Sinar Terang",       tanggal: "07 Mar 2026", nilai: "Rp 850.000",   status: "Pending" },
  { ref: "MUT-2024-008", keterangan: "Mutasi Stok Gudang Utama",           tanggal: "06 Mar 2026", nilai: "42 Unit",      status: "Selesai" },
];

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" subtitle="Ringkasan operasional bisnis hari ini">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Recent activity */}
      <Card title="Aktivitas Terbaru" noPadding>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {["Referensi", "Keterangan", "Tanggal", "Nilai", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 font-serif">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT.map((row) => (
              <tr key={row.ref} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-navy-700 text-[13px]">{row.ref}</td>
                <td className="px-4 py-3 text-sm text-slate-700 font-serif">{row.keterangan}</td>
                <td className="px-4 py-3 text-sm text-slate-500 font-serif">{row.tanggal}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700 font-serif">{row.nilai}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
