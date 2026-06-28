"use client";

import {
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/layout";

import { toast } from "sonner";

import {
  getOrderFulfillments,
  createOrderFulfillment,
} from "@/lib/services/order-fulfillment.service";

import OrderFulfillmentTable from "@/components/modules/persediaan/order-fulfillment/OrderFulfillmentTable";

import OrderFulfillmentForm, {
  OrderFulfillmentFormData,
} from "@/components/modules/persediaan/order-fulfillment/OrderFulfillmentForm";

import Modal from "@/components/ui/Modal";

import { OrderFulfillment } from "./types";

export default function OrderFulfillmentPage() {
  const [fulfillments, setFulfillments] =
    useState<OrderFulfillment[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const [saving, setSaving] =
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
        "Gagal mengambil data order fulfillment"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(
    payload: OrderFulfillmentFormData
  ) {
    console.log(
      "ORDER FULFILLMENT PAYLOAD",
      payload
    );

    try {
      setSaving(true);

      await createOrderFulfillment({
        product_id: payload.product_id,
        warehouse_id: payload.warehouse_id,
        quantity: payload.quantity,
        notes: payload.notes,
      });

      toast.success(
        "Order fulfillment berhasil"
      );

      setOpen(false);

      await fetchFulfillments();
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal membuat order fulfillment"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Order Fulfillment"
      subtitle="Penyelesaian pesanan dan pengurangan stok"
    >
      <OrderFulfillmentTable
        fulfillments={fulfillments}
        loading={loading}
        onAdd={() => setOpen(true)}
      />

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Fulfill Order"
      >
        <OrderFulfillmentForm
          onSubmit={handleCreate}
          loading={saving}
        />
      </Modal>
    </AppShell>
  );
}