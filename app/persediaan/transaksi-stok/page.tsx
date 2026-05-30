"use client";

import {
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/layout";

import { toast } from "sonner";

import { StockTransaction } from "./types";

import {
  getStockTransactions,
} from "@/lib/services/stock-transaction.service";

import StockTransactionTable from "@/components/modules/persediaan/stock-transaction/StockTransactionTable";

export default function StockTransactionPage() {
  const [transactions, setTransactions] =
    useState<StockTransaction[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);

      const data =
        await getStockTransactions();

      setTransactions(data);

    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal mengambil data transaksi stock"
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Stock Transaction"
      subtitle="Riwayat pergerakan stok"
    >
      <StockTransactionTable
        transactions={transactions}
        loading={loading}
      />
    </AppShell>
  );
}