"use client";

import { DataTable } from "@/components/ui/DataTable";

import { Product } from "@/app/persediaan/produk/types";

import { getColumns } from "@/app/persediaan/produk/column";

type ProductTableProps = {
  products: Product[];

  loading?: boolean;

  onAdd: () => void;

  onEdit: (product: Product) => void;

  onDelete: (product: Product) => void;
};

export default function ProductTable({
  products,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const columns = getColumns({
    onEdit,
    onDelete,
  });

  return (
    <DataTable<Product>
      title="Master Product"
      columns={columns}
      data={products}
      loading={loading}
      addLabel="Tambah Produk"
      onAdd={onAdd}
      keyField="product_id"
    />
  );
}