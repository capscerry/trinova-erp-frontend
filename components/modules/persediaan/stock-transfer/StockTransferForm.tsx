"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

import { getInventoryStocks } from "@/lib/services/inventory-stock.service";

import { getWarehouses, Warehouse, } from "@/lib/services/warehouse.service";

export interface StockTransferFormData {
  product_id: number;
  source_warehouse_id: number;
  destination_warehouse_id: number;
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
    data: StockTransferFormData
  ) => Promise<void>;

  loading?: boolean;
}

export default function StockTransferForm({
  onSubmit,
  loading = false,
}: Props) {
  const [inventoryStocks, setInventoryStocks] =
    useState<InventoryStock[]>([]);

  const [warehouses, setWarehouses] =
    useState<Warehouse[]>([]);

  const [formData, setFormData] =
  useState<StockTransferFormData>({
    product_id: 0,
    source_warehouse_id: 0,
    destination_warehouse_id: 0,
    quantity: 1,
    notes: "",
  });  

  useEffect(() => {
    loadInventoryStocks();
    loadWarehouses();
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

  async function loadWarehouses() {
        try {
          const data = await getWarehouses();
          setWarehouses(data);
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

  const sourceWarehouses =
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

  const destinationWarehouses = useMemo(() => {
    return warehouses.filter(
      (warehouse) =>
        warehouse.warehouse_id !==
        formData.source_warehouse_id
    );
  }, [
    warehouses,
    formData.source_warehouse_id,
  ]);

  const selectedStock =
    useMemo(() => {
      return inventoryStocks.find(
        (x) =>
          x.product_id ===
            formData.product_id &&
          x.warehouse_id ===
            formData.source_warehouse_id
      );
    }, [
      inventoryStocks,
      formData.product_id,
      formData.source_warehouse_id,
    ]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      formData.source_warehouse_id ===
      formData.destination_warehouse_id
    ) {
      alert(
        "Source and destination warehouse cannot be the same."
      );

      return;
    }

    if (
      formData.quantity <= 0
    ) {
      alert(
        "Quantity must be greater than zero."
      );

      return;
    }

    if (
      selectedStock &&
      formData.quantity >
        selectedStock.qty_available
    ) {
      alert(
        `Maximum available stock is ${selectedStock.qty_available}`
      );

      return;
    }

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

              source_warehouse_id: 0,
              destination_warehouse_id: 0,
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

      {/* SOURCE */}

      <div>
        <label className="text-sm font-medium">
          Source Warehouse
        </label>

        <select
          required
          disabled={
            !formData.product_id
          }
          className="w-full rounded-lg border px-3 py-2"
          value={
            formData.source_warehouse_id
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              source_warehouse_id:
                Number(
                  e.target.value
                ),

              destination_warehouse_id: 0,
            })
          }
        >
          <option value="">
            Select Warehouse
          </option>

          {sourceWarehouses.map(
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
                {" "}
                pcs)
              </option>
            )
          )}
        </select>
      </div>

      {/* DESTINATION */}

      <div>
        <label className="text-sm font-medium">
          Destination Warehouse
        </label>

        <select
          required
          disabled={
            !formData.source_warehouse_id
          }
          className="w-full rounded-lg border px-3 py-2"
          value={
            formData.destination_warehouse_id
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              destination_warehouse_id:
                Number(
                  e.target.value
                ),
            })
          }
        >
          <option value="">
            Select Warehouse
          </option>

          {destinationWarehouses.map(
            (warehouse) => (
              <option
                key={
                  warehouse.warehouse_id
                }
                value={
                  warehouse.warehouse_id
                }
              >
                {
                  warehouse.warehouse_name
                }
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

      {/* SAVE */}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Save Transfer"}
        </Button>
      </div>
    </form>
  );
}