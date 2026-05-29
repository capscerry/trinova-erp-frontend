"use client";

import { DataTable } from "@/components/ui/DataTable";

import { StockTransaction } from "@/app/persediaan/transaksi-stok/types";

import { columns } from "@/app/persediaan/transaksi-stok/column";

type Props = {
  transactions: StockTransaction[];

  loading?: boolean;
};

export default function StockTransactionTable({
  transactions,
  loading = false,
}: Props) {
  return (
    <DataTable<StockTransaction>
      title="Stock Transaction"
      columns={columns}
      data={transactions}
      loading={loading}
      keyField="transaction_id"
    />
  );
}