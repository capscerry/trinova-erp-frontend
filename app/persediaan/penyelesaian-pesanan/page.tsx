"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";

import OrderFulfillmentTable from "@/components/modules/persediaan/order-fulfillment/OrderFulfillmentTable";
import OrderFulfillmentDetailFormModal from "@/components/modules/persediaan/order-fulfillment/OrderFulfillmentDetailFormModal";

import {
  getOrderFulfillments,
  completeOrderFulfillment,
} from "@/lib/services/order-fulfillment.service";

import { OrderFulfillment } from "./types";

export default function OrderFulfillmentPage() {
  const [fulfillments, setFulfillments] =
    useState<OrderFulfillment[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [selected, setSelected] =
    useState<OrderFulfillment | null>(null);

  const [detailOpen, setDetailOpen] =
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

  async function handleComplete(
    row: OrderFulfillment
  ) {
    try {
      await completeOrderFulfillment(
        row.movement_id
      );

      toast.success(
        "Order fulfillment completed."
      );

      await fetchFulfillments();

      if (
        selected?.movement_id ===
        row.movement_id
      ) {
        setSelected({
          ...row,
          status: "COMPLETED",
        });
      }
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to complete order fulfillment."
      );
    }
  }

  function handleView(
    row: OrderFulfillment
  ) {
    setSelected(row);
    setDetailOpen(true);
  }

  function handleCloseDetail() {
    setDetailOpen(false);
    setSelected(null);
  }

  return (
    <>
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

      <OrderFulfillmentDetailFormModal
        isOpen={detailOpen}
        onClose={handleCloseDetail}
        data={selected}
      />
    </>
  );
}