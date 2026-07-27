"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import { ModuleOverview } from "@/components/modules/ModuleOverview";
import { NAV_CONFIG } from "@/lib/nav";

import { InventoryAIHero } from "@/components/modules/persediaan/demand-forecast/InventoryAIHero";
import { InventoryAISummary } from "@/components/modules/persediaan/demand-forecast/InventoryAISummary";
import { TopForecastPreview } from "@/components/modules/persediaan/demand-forecast/TopForecastPreview";
import { ForecastInsight } from "@/components/modules/persediaan/demand-forecast/ForecastInsight";

import {
  getInventoryDashboard,
  InventoryDashboard,
} from "@/lib/services/inventory-dashboard.service";

export default function PersediaanPage() {
  const module = NAV_CONFIG.find((n) => n.id === "persediaan")!;

  const [dashboard, setDashboard] =
    useState<InventoryDashboard | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const data = await getInventoryDashboard();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    }
  }

  const STATS = [
    {
      label: "Total Produk",
      value: dashboard?.totalProducts.toString() ?? "-",
      change: "+4",
      trend: "up" as const,
      sub: "Item Terdaftar",
    },
    {
      label: "Stok Aman",
      value: dashboard?.safeStock.toString() ?? "-",
      change: "+2",
      trend: "up" as const,
      sub: "AI Demand Forecast",
    },
    {
      label: "Stok Kritis",
      value: dashboard?.criticalStock.toString() ?? "-",
      change: "-1",
      trend: "down" as const,
      sub: "Perlu Reorder",
    },
    {
      label: "Total Stock",
      value: dashboard?.totalStock.toLocaleString() ?? "-",
      change: "+10",
      trend: "up" as const,
      sub: "Qty On Hand",
    },
  ];

  return (
    <AppShell
      title="Persediaan"
      subtitle="Overview modul persediaan"
    >
      <ModuleOverview
        module={module}
        stats={STATS}
      />
      
      {dashboard?.aiSummary && (
        <>
          <InventoryAIHero aiSummary={dashboard.aiSummary} />

          <InventoryAISummary aiSummary={dashboard.aiSummary} />

          <TopForecastPreview aiSummary={dashboard.aiSummary} />
          
          <ForecastInsight aiSummary={dashboard.aiSummary} />
        </>
      )}
    </AppShell>
  );
}

