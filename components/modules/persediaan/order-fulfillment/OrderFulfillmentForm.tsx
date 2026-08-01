"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

import { getInventoryStocks } from "@/lib/services/inventory-stock.service";
import { notify } from "@/lib/notify";

export interface OrderFulfillmentFormData {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  notes: string;
}

interface InventoryStock {
  stock_id: number;
  product_id: number;
  warehouse_id: number;

  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;

  product: {
    product_id: number;
    product_name: string;
  };

  warehouse: {
    warehouse_id: number;
    warehouse_name: string;
  };
}

interface Props {
  onSubmit: (
    data: OrderFulfillmentFormData
  ) => Promise<void>;

  loading?: boolean;
}

export default function OrderFulfillmentForm({
  onSubmit,
  loading = false,
}: Props) {
  const [inventoryStocks, setInventoryStocks] =
    useState<InventoryStock[]>([]);

  const [formData, setFormData] =
    useState<OrderFulfillmentFormData>({
      product_id: 0,
      warehouse_id: 0,
      quantity: 1,
      notes: "",
    });

  useEffect(() => {
    loadInventoryStocks();
  }, []);

  async function loadInventoryStocks() {
    try {
      const data =
        await getInventoryStocks();

      setInventoryStocks(data);
    } catch (error) {
      console.error(error);
    }
  }

  const products = useMemo(() => {
    return Array.from(
      new Map(
        inventoryStocks
          .filter(
            (x) => x.qty_available > 0
          )
          .map((x) => [
            x.product_id,
            {
              product_id:
                x.product.product_id,
              product_name:
                x.product.product_name,
            },
          ])
      ).values()
    );
  }, [inventoryStocks]);

  const warehouses =
    useMemo(() => {
      if (!formData.product_id)
        return [];

      return inventoryStocks.filter(
        (x) =>
          x.product_id ===
            formData.product_id &&
          x.qty_available > 0
      );
    }, [
      inventoryStocks,
      formData.product_id,
    ]);

  const selectedStock =
    useMemo(() => {
      return inventoryStocks.find(
        (x) =>
          x.product_id ===
            formData.product_id &&
          x.warehouse_id ===
            formData.warehouse_id
      );
    }, [
      inventoryStocks,
      formData.product_id,
      formData.warehouse_id,
    ]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      formData.quantity <= 0
    ) {
      notify.error(
        "Quantity must be greater than zero."
      );

      return;
    }

    if (
      selectedStock &&
      formData.quantity >
        selectedStock.qty_available
    ) {
      notify.error(
        `Maximum available stock is ${selectedStock.qty_available}`
      );

      return;
    }

    console.log(
      "FORM DATA",
      formData
    );

    await onSubmit(formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* PRODUCT */}

      <div>
        <label className="text-sm font-medium">
          Product
        </label>

        <select
          required
          className="w-full rounded-lg border px-3 py-2"
          value={formData.product_id}
          onChange={(e) =>
            setFormData({
              ...formData,
              product_id:
                Number(e.target.value),

              warehouse_id: 0,
            })
          }
        >
          <option value="">
            Select Product
          </option>

          {products.map((p) => (
            <option
              key={p.product_id}
              value={p.product_id}
            >
              {p.product_name}
            </option>
          ))}
        </select>
      </div>

      {/* WAREHOUSE */}

      <div>
        <label className="text-sm font-medium">
          Warehouse
        </label>

        <select
          required
          disabled={
            !formData.product_id
          }
          className="w-full rounded-lg border px-3 py-2"
          value={
            formData.warehouse_id
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              warehouse_id:
                Number(
                  e.target.value
                ),
            })
          }
        >
          <option value="">
            Select Warehouse
          </option>

          {warehouses.map(
            (stock) => (
              <option
                key={
                  stock.stock_id
                }
                value={
                  stock.warehouse_id
                }
              >
                {
                  stock.warehouse
                    .warehouse_name
                }
                {" "}
                (
                {
                  stock.qty_available
                }
                pcs)
              </option>
            )
          )}
        </select>
      </div>

      {/* QUANTITY */}

      <div>
        <label className="text-sm font-medium">
          Quantity
        </label>

        <input
          required
          min={1}
          type="number"
          className="w-full rounded-lg border px-3 py-2"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({
              ...formData,
              quantity:
                Number(
                  e.target.value
                ),
            })
          }
        />

        {selectedStock && (
          <p className="mt-1 text-xs text-slate-500">
            Remaining Stock:
            <span className="font-semibold">
              {" "}
              {
                selectedStock.qty_available
              }{" "}
              pcs
            </span>
          </p>
        )}
      </div>

      {/* NOTES */}

      <div>
        <label className="text-sm font-medium">
          Notes
        </label>

        <textarea
          rows={3}
          className="w-full rounded-lg border px-3 py-2"
          value={formData.notes}
          onChange={(e) =>
            setFormData({
              ...formData,
              notes:
                e.target.value,
            })
          }
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Save Fulfillment"}
        </Button>
      </div>
    </form>
  );
}