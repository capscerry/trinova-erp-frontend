"use client";

import { DataTable } from "@/components/ui/DataTable";

import { columns }
  from "@/app/persediaan/penyelesaian-pesanan/column";

import { OrderFulfillment }
  from "@/app/persediaan/penyelesaian-pesanan/types";

type Props = {
  fulfillments: OrderFulfillment[];
  loading?: boolean;
  onAdd: () => void;
};

export default function OrderFulfillmentTable({
  fulfillments,
  loading = false,
  onAdd,
}: Props) {
  return (
    <DataTable<OrderFulfillment>
      title="Order Fulfillment"
      columns={columns}
      data={fulfillments}
      loading={loading}
      keyField="movement_id"
      addLabel="Fulfill Order"
      onAdd={onAdd}
    />
  );
}