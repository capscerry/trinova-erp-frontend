"use client";

import { Eye } from "lucide-react";

import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

import { columns } from "@/app/persediaan/penyelesaian-pesanan/column";
import { OrderFulfillment } from "@/app/persediaan/penyelesaian-pesanan/types";

type Props = {
  fulfillments: OrderFulfillment[];
  loading?: boolean;
  onView: (row: OrderFulfillment) => void;
};

export default function OrderFulfillmentTable({
  fulfillments,
  loading = false,
  onView,
}: Props) {
  return (
    <DataTable<OrderFulfillment>
      title="Order Fulfillment"
      columns={columns}
      data={fulfillments}
      loading={loading}
      keyField="movement_id"
      renderActions={(row) => (
        <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onView(row)}
        >
            View
        </Button>
      )}
    />
  );
}