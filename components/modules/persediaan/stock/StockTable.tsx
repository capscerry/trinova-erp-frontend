"use client";

import { DataTable } from "@/components/ui/DataTable";

import { InventoryStock } from "@/app/persediaan/stok/types";

import { columns } from "@/app/persediaan/stok/column";

type Props = {
  stocks: InventoryStock[];

  loading?: boolean;
};

export default function StockTable({
  stocks,
  loading = false,
}: Props) {
  return (
    <DataTable<InventoryStock>
      title="Inventory Stock"
      columns={columns}
      data={stocks}
      loading={loading}
      keyField="stock_id"
    />
  );
}