"use client";

import { DataTable } from "@/components/ui/DataTable";

import { Category } from "@/lib/services/category.service";

import { getColumns } from "./CategoryColumns";

type CategoryTableProps = {
  categories: Category[];

  loading?: boolean;

  onAdd: () => void;

  onEdit: (
    category: Category
  ) => void;

  onDelete: (
    category: Category
  ) => void;
};

export default function CategoryTable({
  categories,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  const columns = getColumns({
    onEdit,
    onDelete,
  });

  return (
    <DataTable<Category>
      title="Master Product Category"
      columns={columns}
      data={categories}
      loading={loading}
      addLabel="Tambah Category"
      onAdd={onAdd}
      keyField="category_id"
    />
  );
}