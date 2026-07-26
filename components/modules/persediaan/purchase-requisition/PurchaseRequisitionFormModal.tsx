"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, Plus, Trash2 } from "lucide-react";

import { getProducts } from "@/lib/services/product.service";
import { getWarehouses } from "@/lib/services/warehouse.service";
import {
  createPurchaseRequisition,
} from "@/lib/services/purchase-requisition.service";

interface PurchaseRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DetailItem {
  product_id: number;
  qty_requested: number;
  remarks: string;
}

export default function PurchaseRequisitionModal({
  isOpen,
  onClose,
  onSuccess,
}: PurchaseRequisitionModalProps) {
  const [loading, setLoading] =
    useState(false);

  const [products, setProducts] =
    useState<any[]>([]);

  const [warehouses, setWarehouses] =
    useState<any[]>([]);

  const [prDate, setPrDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [warehouseId, setWarehouseId] =
    useState("");

  const [remarks, setRemarks] =
    useState("");

  const [details, setDetails] =
    useState<DetailItem[]>([
      {
        product_id: 0,
        qty_requested: 1,
        remarks: "",
      },
    ]);

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
      resetForm();
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    try {
      const [
        productResponse,
        warehouseResponse,
      ] = await Promise.all([
        getProducts(),
        getWarehouses(),
      ]);

      setProducts(productResponse || []);
      setWarehouses(
        warehouseResponse || []
      );
    } catch (err) {
      console.error(err);
    }
  };

  const addRow = () => {
    setDetails((prev) => [
      ...prev,
      {
        product_id: 0,
        qty_requested: 1,
        remarks: "",
      },
    ]);
  };

  const removeRow = (
    index: number
  ) => {
    setDetails((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const updateRow = (
    index: number,
    field: keyof DetailItem,
    value: any
  ) => {
    const clone = [...details];

    clone[index] = {
      ...clone[index],
      [field]: value,
    };

    setDetails(clone);
  };

  const resetForm = () => {
    setPrDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setWarehouseId("");
    setRemarks("");

    setDetails([
      {
        product_id: 0,
        qty_requested: 1,
        remarks: "",
      },
    ]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    try {
      if (!warehouseId) {
        alert(
          "Warehouse wajib dipilih"
        );
        return;
      }

      if (details.length === 0) {
        alert(
          "Minimal 1 item"
        );
        return;
      }

      const invalid =
        details.some(
          (x) =>
            !x.product_id ||
            Number(
              x.qty_requested
            ) <= 0
        );

      if (invalid) {
        alert(
          "Lengkapi detail item"
        );
        return;
      }

      setLoading(true);

      await createPurchaseRequisition(
        {
          pr_date: prDate,
          warehouse_id:
            Number(warehouseId),
          remarks,
          details: details.map(
            (item) => ({
              product_id:
                Number(
                  item.product_id
                ),
              qty_requested:
                Number(
                  item.qty_requested
                ),
              remarks:
                item.remarks,
            })
          ),
        }
      );

      resetForm();

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);

      alert(
        "Gagal menyimpan Purchase Requisition"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] border border-slate-200 overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-linear-to-r from-navy-900 to-navy-600">

            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                Tambah Purchase Requisition
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                Tambahkan data purchase requisition
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <Section title="General Information">

              <div className="grid grid-cols-2 gap-4">

                <FormField
                  label="PR Date"
                  required
                >
                  <input
                    type="date"
                    value={prDate}
                    onChange={(e) =>
                      setPrDate(
                        e.target.value
                      )
                    }
                    className={inputBase}
                  />
                </FormField>

                <FormField
                  label="Warehouse"
                  required
                >
                  <select
                    value={warehouseId}
                    onChange={(e) =>
                      setWarehouseId(
                        e.target.value
                      )
                    }
                    className={inputBase}
                  >
                    <option value="">
                      Pilih Warehouse
                    </option>

                    {warehouses.map(
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

                </FormField>

              </div>

            </Section>

                        <Section title="Additional Information">

              <FormField
                label="Remarks"
              >
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(
                      e.target.value
                    )
                  }
                  placeholder="Additional remarks..."
                  className={inputBase}
                />
              </FormField>

            </Section>

            <Section title="Requested Items">

              <div className="flex justify-end mb-4">

                <Button
                  type="button"
                  onClick={addRow}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>

              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-slate-50">

                      <tr className="border-b border-slate-200">

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-[42%]">
                          Product
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-[18%]">
                          Qty
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                          Remarks
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 w-22.5">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {details.map(
                        (
                          row,
                          index
                        ) => (

                          <tr
                            key={index}
                            className="border-b border-slate-200 last:border-0"
                          >

                            <td className="p-3">

                              <select
                                value={
                                  row.product_id
                                }
                                onChange={(e) =>
                                  updateRow(
                                    index,
                                    "product_id",
                                    Number(
                                      e.target.value
                                    )
                                  )
                                }
                                className={inputBase}
                              >

                                <option value={0}>
                                  Pilih Product
                                </option>

                                {products.map(
                                  (
                                    product
                                  ) => (
                                    <option
                                      key={
                                        product.product_id
                                      }
                                      value={
                                        product.product_id
                                      }
                                    >
                                      {
                                        product.product_name
                                      }
                                    </option>
                                  )
                                )}

                              </select>

                            </td>

                            <td className="p-3">

                              <input
                                type="number"
                                min={1}
                                value={
                                  row.qty_requested
                                }
                                onChange={(e) =>
                                  updateRow(
                                    index,
                                    "qty_requested",
                                    Number(
                                      e.target.value
                                    )
                                  )
                                }
                                className={inputBase}
                              />

                            </td>

                            <td className="p-3">

                              <input
                                type="text"
                                value={
                                  row.remarks
                                }
                                onChange={(e) =>
                                  updateRow(
                                    index,
                                    "remarks",
                                    e.target.value
                                  )
                                }
                                placeholder="Additional remarks..."
                                className={inputBase}
                              />

                            </td>

                            <td className="p-3 text-center">

                              <Button
                                type="button"
                                variant="danger"
                                onClick={() =>
                                  removeRow(
                                    index
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                            </td>

                          </tr>

                        )
                      )}

                      {details.length ===
                        0 && (
                        <tr>

                          <td
                            colSpan={4}
                            className="py-10 text-center text-sm text-slate-500"
                          >
                            Belum ada item.
                          </td>

                        </tr>
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </Section>

                      </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">

            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : "Save Purchase Requisition"}
            </Button>

          </div>

        </div>

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
          <span className="text-red-500 ml-1">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}