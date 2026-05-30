"use client";

import { DataTable } from "@/components/ui/DataTable";

import { ProductSubcategory } from "@/lib/services/subcategory.service";

import { getColumns } from "./SubcategoryColumns";

type SubcategoryTableProps = {
  subcategories: ProductSubcategory[];

  loading?: boolean;

  onAdd: () => void;

  onEdit: (
    subcategory: ProductSubcategory
  ) => void;

  onDelete: (
    subcategory: ProductSubcategory
  ) => void;
};

export default function SubcategoryTable({
  subcategories,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
}: SubcategoryTableProps) {
  const columns = getColumns({
    onEdit,
    onDelete,
  });

  return (
    <DataTable<ProductSubcategory>
      title="Master Product Subcategory"
      columns={columns}
      data={subcategories}
      loading={loading}
      addLabel="Tambah Subcategory"
      onAdd={onAdd}
      keyField="subcategory_id"
    />
  );
}
