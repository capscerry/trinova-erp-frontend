"use client";

import {
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/layout";

import { toast } from "sonner";

import { InventoryStock } from "./types";

import {
  getInventoryStocks,
} from "@/lib/services/inventory-stock.service";

import StockTable from "@/components/modules/persediaan/stock/StockTable";

export default function InventoryStockPage() {
  const [stocks, setStocks] =
    useState<InventoryStock[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    fetchStocks();
  }, []);

  async function fetchStocks() {
    try {
      setLoading(true);

      const data =
        await getInventoryStocks();

      setStocks(data);

    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal mengambil data stock"
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Inventory Stock"
      subtitle="Pantau stok semua produk"
    >
      <StockTable
        stocks={stocks}
        loading={loading}
      />
    </AppShell>
  );
}