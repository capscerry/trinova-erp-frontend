"use client";

import { useEffect, useState } from "react";

import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { notify } from "@/lib/notify";

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
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [prDate, setPrDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [warehouseId, setWarehouseId] =
    useState("");

  const [remarks, setRemarks] =
    useState("");

  const [details, setDetails] = useState<
    DetailItem[]
  >([
    {
      product_id: 0,
      qty_requested: 1,
      remarks: "",
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;

    loadMasterData();
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
    } catch (error) {
      console.error(error);
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

  const handleSave = async () => {
    try {
      if (!warehouseId) {
        notify.error(
          "Warehouse wajib dipilih"
        );
        return;
      }

      if (details.length === 0) {
        notify.error("Minimal 1 item");
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
        notify.error(
          "Lengkapi detail item"
        );
        return;
      }

      setLoading(true);

      const payload = {
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
      };

      await createPurchaseRequisition(
        payload
      );

      resetForm();

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);

      notify.error(
        "Gagal menyimpan Purchase Requisition"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Purchase Requisition"
    >
      <div className="space-y-6">
        {/* Header */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              PR Date
            </label>

            <input
              type="date"
              value={prDate}
              onChange={(e) =>
                setPrDate(
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              Warehouse <span className="text-red-500 font-bold">*</span>
            </label>

            <select
              value={warehouseId}
              onChange={(e) =>
                setWarehouseId(
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-3 py-2"
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
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              Remarks
            </label>

            <input
              value={remarks}
              onChange={(e) =>
                setRemarks(
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Detail */}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              Detail Items
            </h3>

            <Button
              type="button"
              onClick={addRow}
            >
              Add Item
            </Button>
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">
                    Product <span className="text-red-500 font-bold">*</span>
                  </th>

                  <th className="text-left p-3">
                    Qty Requested <span className="text-red-500 font-bold">*</span>
                  </th>

                  <th className="text-left p-3">
                    Remarks
                  </th>

                  <th className="text-center p-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {details.map(
                  (row, index) => (
                    <tr
                      key={index}
                      className="border-b"
                    >
                      <td className="p-3">
                        <select
                          value={
                            row.product_id
                          }
                          onChange={(
                            e
                          ) =>
                            updateRow(
                              index,
                              "product_id",
                              Number(
                                e.target
                                  .value
                              )
                            )
                          }
                          className="w-full border rounded px-3 py-2"
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
                          onChange={(
                            e
                          ) =>
                            updateRow(
                              index,
                              "qty_requested",
                              Number(
                                e.target
                                  .value
                              )
                            )
                          }
                          className="w-full border rounded px-3 py-2"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          value={
                            row.remarks
                          }
                          onChange={(
                            e
                          ) =>
                            updateRow(
                              index,
                              "remarks",
                              e.target
                                .value
                            )
                          }
                          className="w-full border rounded px-3 py-2"
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
                          Remove
                        </Button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
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
              : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}