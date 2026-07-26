"use client";

import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] border border-slate-200 overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-linear-to-r from-navy-900 to-navy-600">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                Purchase Requisition Detail
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                Lihat informasi purchase requisition
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

                <FormField label="PR Number">
                  <div className={inputBase}>
                    {data.pr_number}
                  </div>
                </FormField>

                <FormField label="PR Date">
                  <div className={inputBase}>
                    {new Date(data.pr_date).toLocaleDateString("id-ID")}
                  </div>
                </FormField>

                <FormField label="Warehouse">
                  <div className={inputBase}>
                    {data.warehouse?.warehouse_name ?? "-"}
                  </div>
                </FormField>

                <FormField label="Status">
                  <div className={inputBase}>
                    {data.status}
                  </div>
                </FormField>

              </div>
            </Section>

            <Section title="Additional Information">

              <FormField label="Remarks">
                <div className={`${inputBase} min-h-22`}>
                  {data.remarks || "-"}
                </div>
              </FormField>

            </Section>

            <Section title="Requested Items">

              <div className="rounded-xl border border-slate-200 overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-slate-50">

                      <tr className="border-b border-slate-200">

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-[45%]">
                          Product
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-[20%]">
                          Qty Requested
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                          Remarks
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                                              {data.details?.map((item: any) => (
                        <tr
                          key={item.pr_detail_id}
                          className="border-b border-slate-200 last:border-0"
                        >

                          <td className="p-3">
                            <div className={inputBase}>
                              {item.product_name}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className={inputBase}>
                              {item.qty_requested}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className={inputBase}>
                              {item.remarks || "-"}
                            </div>
                          </td>

                        </tr>
                      ))}

                      {(!data.details ||
                        data.details.length === 0) && (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-10 text-center text-sm text-slate-500"
                          >
                            Tidak ada item yang diminta.
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
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 min-h-[42px] flex items-center";

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