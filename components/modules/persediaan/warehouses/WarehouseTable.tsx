"use client";

import { DataTable } from "@/components/ui/DataTable";

import { Warehouse } from "@/lib/services/warehouse.service";

import { getColumns } from "./WarehouseColumns";

type WarehouseTableProps = {
  warehouses: Warehouse[];

  loading?: boolean;

  onAdd: () => void;

  onEdit: (
    warehouse: Warehouse
  ) => void;

  onDelete: (
    warehouse: Warehouse
  ) => void;
};

export default function WarehouseTable({
  warehouses,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
}: WarehouseTableProps) {
  const columns = getColumns({
    onEdit,
    onDelete,
  });

  return (
    <DataTable<Warehouse>
      title="Master Warehouse"
      columns={columns}
      data={warehouses}
      loading={loading}
      addLabel="Tambah Warehouse"
      onAdd={onAdd}
      keyField="warehouse_id"
    />
  );
}