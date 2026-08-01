"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getInventoryStocks } from "@/lib/services/inventory-stock.service";
import { notify } from "@/lib/notify";

import { Package, X } from "lucide-react";

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
  isOpen: boolean;
  onClose: () => void;

  onSubmit: (
    data: OrderFulfillmentFormData
  ) => Promise<void>;

  loading?: boolean;
}

export default function OrderFulfillmentFormModal({
  isOpen,
  onClose,
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
      const data = await getInventoryStocks();
      setInventoryStocks(data);
    } catch (error) {
      console.error(error);
    }
  }

  const products = useMemo(() => {
    return Array.from(
      new Map(
        inventoryStocks
          .filter((x) => x.qty_available > 0)
          .map((x) => [
            x.product_id,
            {
              product_id: x.product.product_id,
              product_name: x.product.product_name,
            },
          ])
      ).values()
    );
  }, [inventoryStocks]);

  const warehouses = useMemo(() => {
    if (!formData.product_id) return [];

    return inventoryStocks.filter(
      (x) =>
        x.product_id === formData.product_id &&
        x.qty_available > 0
    );
  }, [
    inventoryStocks,
    formData.product_id,
  ]);

  const selectedStock = useMemo(() => {
    return inventoryStocks.find(
      (x) =>
        x.product_id === formData.product_id &&
        x.warehouse_id === formData.warehouse_id
    );
  }, [
    inventoryStocks,
    formData.product_id,
    formData.warehouse_id,
  ]);

  const remainingStock = useMemo(() => {
    if (!selectedStock) return 0;

    return (
      selectedStock.qty_available -
      formData.quantity
    );
  }, [
    selectedStock,
    formData.quantity,
  ]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (formData.quantity <= 0) {
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

    await onSubmit(formData);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] border border-slate-200 overflow-hidden flex flex-col"
        >

          {/* Header */}

          <div className="flex items-center justify-between px-6 py-5 bg-linear-to-r from-navy-900 to-navy-600">

            <div>

              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                Order Fulfillment
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                Fulfill product from warehouse stock
              </p>

            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

          </div>

          {/* Body */}

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <Section title="General Information">

              <div className="space-y-5">

                <FormField
                  label="Product"
                  required
                >

                  <select
                    required
                    className={inputBase}
                    value={formData.product_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        product_id: Number(
                          e.target.value
                        ),
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

                </FormField>

                <FormField
                  label="Warehouse"
                  required
                >

                  <select
                    required
                    disabled={
                      !formData.product_id
                    }
                    className={inputBase}
                    value={formData.warehouse_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warehouse_id: Number(
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
                          key={stock.stock_id}
                          value={
                            stock.warehouse_id
                          }
                        >
                          {
                            stock.warehouse
                              .warehouse_name
                          }
                        </option>
                      )
                    )}

                  </select>

                </FormField>

                {selectedStock && (

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                    <div className="flex items-center gap-2 mb-4">

                      <Package className="w-5 h-5 text-blue-600" />

                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Stock Information
                      </h4>

                    </div>

                    <div className="grid grid-cols-3 gap-4">

                      <div className="rounded-lg border border-slate-200 bg-white p-4">

                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          On Hand
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-700">
                          {selectedStock.qty_on_hand}
                        </p>

                        <p className="text-xs text-slate-500">
                          Total Stock
                        </p>

                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4">

                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Reserved
                        </p>

                        <p className="mt-2 text-2xl font-bold text-amber-600">
                          {selectedStock.qty_reserved}
                        </p>

                        <p className="text-xs text-slate-500">
                          Allocated
                        </p>

                      </div>

                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">

                        <p className="text-xs uppercase tracking-wide text-blue-700">
                          Available
                        </p>

                        <p className="mt-2 text-2xl font-bold text-blue-700">
                          {selectedStock.qty_available}
                        </p>

                        <p className="text-xs text-blue-600">
                          Ready to Fulfill
                        </p>

                      </div>

                    </div>

                  </div>

                )}

            </div>

                            </Section>

            {/* Fulfillment Information */}

            <Section title="Fulfillment Information">

              <div className="grid grid-cols-2 gap-4">

                {/* Quantity */}

                <FormField
                  label="Quantity"
                  required
                >

                  <div>

                    <input
                      required
                      min={1}
                      type="number"
                      className={inputBase}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: Number(
                            e.target.value
                          ),
                        })
                      }
                    />

                    {selectedStock && (

                      <div
                        className={`mt-3 rounded-lg border px-4 py-3 ${
                          remainingStock > 10
                            ? "border-emerald-200 bg-emerald-50"
                            : remainingStock > 0
                            ? "border-amber-200 bg-amber-50"
                            : "border-rose-200 bg-rose-50"
                        }`}
                      >

                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Remaining After Fulfillment
                        </p>

                        <p
                          className={`mt-1 text-xl font-bold ${
                            remainingStock > 10
                              ? "text-emerald-700"
                              : remainingStock > 0
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {remainingStock} pcs
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Available Stock :
                          <span className="ml-1 font-semibold">
                            {selectedStock.qty_available} pcs
                          </span>
                        </p>

                      </div>

                    )}

                  </div>

                </FormField>

                {/* Notes */}

                <FormField
                  label="Notes"
                >

                  <textarea
                    rows={6}
                    className={inputBase}
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notes: e.target.value,
                      })
                    }
                  />

                </FormField>

              </div>

            </Section>

          </div>

                    {/* Footer */}

          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : "Fulfill Order"}
            </Button>

          </div>

        </form>

      </div>

    </>
  );
}

const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-all";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>

      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
        {title}
      </h3>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {children}
      </div>

    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>

      <label className="block text-sm font-medium text-slate-700 mb-2">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      {children}

    </div>
  );
}