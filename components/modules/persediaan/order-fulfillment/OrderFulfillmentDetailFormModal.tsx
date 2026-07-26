"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { OrderFulfillment } from "@/app/persediaan/penyelesaian-pesanan/types";

interface OrderFulfillmentDetailFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OrderFulfillment | null;
}

export default function OrderFulfillmentDetailFormModal({
  isOpen,
  onClose,
  data,
}: OrderFulfillmentDetailFormModalProps) {
  if (!isOpen || !data) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] border border-slate-200 overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-linear-to-r from-navy-900 to-navy-600">

            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                Order Fulfillment Detail
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                View order fulfillment information
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

              <div className="grid grid-cols-2 gap-4">

                <FormField label="Reference Number">
                  <input
                    readOnly
                    value={data.reference_number ?? "-"}
                    className={inputBase}
                  />
                </FormField>

                <FormField label="Status">
                  <div className="h-10.5 flex items-center">
                    <StatusBadge status={data.status ?? "-"} />
                  </div>
                </FormField>

                <FormField label="Movement Date">
                  <input
                    readOnly
                    value={
                      data.movement_date
                        ? new Date(
                            data.movement_date
                          ).toLocaleString("id-ID")
                        : "-"
                    }
                    className={inputBase}
                  />
                </FormField>

                <FormField label="Movement Type">
                  <input
                    readOnly
                    value={data.movement_type ?? "-"}
                    className={inputBase}
                  />
                </FormField>

              </div>

            </Section>

            <Section title="Product Information">

              <div className="grid grid-cols-2 gap-4">

                <FormField label="Product">
                  <input
                    readOnly
                    value={data.product_name ?? "-"}
                    className={inputBase}
                  />
                </FormField>

                <FormField label="Warehouse">
                  <input
                    readOnly
                    value={data.warehouse_name ?? "-"}
                    className={inputBase}
                  />
                </FormField>

                <FormField label="Quantity">
                  <input
                    readOnly
                    value={`${data.quantity} pcs`}
                    className={inputBase}
                  />
                </FormField>

              </div>

            </Section>

            <Section title="Additional Information">

              <FormField label="Notes">
                <textarea
                  readOnly
                  rows={3}
                  value={data.notes || "-"}
                  className={inputBase}
                />
              </FormField>

            </Section>

            <Section title="Timeline">

              <div className="grid grid-cols-2 gap-4">

                <FormField label="Processed At">
                  <input
                    readOnly
                    value={
                      data.processed_at
                        ? new Date(
                            data.processed_at
                          ).toLocaleString("id-ID")
                        : "-"
                    }
                    className={inputBase}
                  />
                </FormField>

                <FormField label="Completed At">
                  <input
                    readOnly
                    value={
                      data.completed_at
                        ? new Date(
                            data.completed_at
                          ).toLocaleString("id-ID")
                        : "-"
                    }
                    className={inputBase}
                  />
                </FormField>

                <FormField label="Canceled At">
                  <input
                    readOnly
                    value={
                      data.canceled_at
                        ? new Date(
                            data.canceled_at
                          ).toLocaleString("id-ID")
                        : "-"
                    }
                    className={inputBase}
                  />
                </FormField>

              </div>

            </Section>

          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end">

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>

          </div>

        </div>

      </div>
    </>
  );
}

const inputBase =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none";

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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>

      {children}
    </div>
  );
}