"use client";

import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface PurchaseRequisitionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any | null;
}

export default function PurchaseRequisitionDetailModal({
  isOpen,
  onClose,
  data,
}: PurchaseRequisitionDetailModalProps) {
  if (!data) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Requisition Detail"
    >
      <div className="space-y-6">

        {/* Header Information */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium mb-1">
              PR Number
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.pr_number}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              PR Date
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {new Date(
                data.pr_date
              ).toLocaleDateString("id-ID")}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Warehouse
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.warehouse
                ?.warehouse_name ?? "-"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Status
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.status}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Remarks
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.remarks || "-"}
            </div>
          </div>

        </div>

        {/* Detail Items */}

        <div>
          <h3 className="font-semibold mb-3">
            Requested Items
          </h3>

          <div className="overflow-auto border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">
                    Product
                  </th>

                  <th className="text-left p-3">
                    Qty Requested
                  </th>

                  <th className="text-left p-3">
                    Remarks
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.details?.map(
                  (item: any) => (
                    <tr
                      key={item.pr_detail_id}
                      className="border-b"
                    >
                      <td className="p-3">
                        {item.product_name}
                      </td>

                      <td className="p-3">
                        {item.qty_requested}
                      </td>

                      <td className="p-3">
                        {item.remarks || "-"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}