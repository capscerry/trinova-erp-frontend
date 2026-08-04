"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";

import OrderFulfillmentTable from "@/components/modules/persediaan/order-fulfillment/OrderFulfillmentTable";

import { getOrderFulfillments } from "@/lib/services/order-fulfillment.service";

import { OrderFulfillment } from "./types";

export default function OrderFulfillmentPage() {
  const router = useRouter();
  const [fulfillments, setFulfillments] =
    useState<OrderFulfillment[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    fetchFulfillments();
  }, []);

  async function fetchFulfillments() {
    try {
      setLoading(true);

      const data =
        await getOrderFulfillments();

      setFulfillments(data);
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to load order fulfillment data."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleView(
    row: OrderFulfillment
  ) {
    router.push(`/persediaan/penyelesaian-pesanan/${row.movement_id}`);
  }

  return (
    <AppShell
      title="Order Fulfillment"
      subtitle="Penyelesaian pesanan dan pengurangan stok"
    >
      <OrderFulfillmentTable
        fulfillments={fulfillments}
        loading={loading}
        onView={handleView}
      />
    </AppShell>
  );
}