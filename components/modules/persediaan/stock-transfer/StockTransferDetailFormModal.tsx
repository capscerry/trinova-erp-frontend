"use client";

import { Button } from "@/components/ui/Button";
import { ArrowRight, CheckCircle2, Clock3, Package, Warehouse, X, XCircle } from "lucide-react";

type TransferStatus =
  | "CREATED"
  | "PROCESSED"
  | "COMPLETED"
  | "CANCELED";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const STATUS_STYLE: Record<TransferStatus, string> = {
  CREATED:
    "bg-amber-50 text-amber-700 border border-amber-200",

  PROCESSED:
    "bg-blue-50 text-blue-700 border border-blue-200",

  COMPLETED:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  CANCELED:
    "bg-rose-50 text-rose-700 border border-rose-200",
};

function TransferStatusBadge({
  status,
}: {
  status: TransferStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;

  data: any | null;

  onProcess: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export default function StockTransferDetailModal({
  isOpen,
  onClose,
  data,
  onProcess,
  onComplete,
  onCancel,
}: Props) {
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

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-navy-900 to-navy-600">

            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                Stock Transfer Detail
              </h2>

              <p className="text-slate-300 text-xs mt-0.5">
                View transfer information
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Status Banner */}

            {data.status === "CREATED" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                <div className="flex items-start gap-3">

                  <Clock3 className="w-5 h-5 text-amber-600 mt-0.5" />

                  <div>
                    <p className="font-semibold text-amber-700">
                      Waiting for Processing
                    </p>

                    <p className="text-sm text-amber-700/80 mt-1">
                      This transfer has been created but has not been processed yet.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {data.status === "PROCESSED" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
                <div className="flex items-start gap-3">

                  <Package className="w-5 h-5 text-blue-600 mt-0.5" />

                  <div>
                    <p className="font-semibold text-blue-700">
                      Waiting for Completion
                    </p>

                    <p className="text-sm text-blue-700/80 mt-1">
                      Stock has been moved from the source warehouse and is waiting for completion.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {data.status === "COMPLETED" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex items-start gap-3">

                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />

                  <div>
                    <p className="font-semibold text-emerald-700">
                      Transfer Completed Successfully
                    </p>

                    <p className="text-sm text-emerald-700/80 mt-1">
                      This stock transfer has been completed successfully.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {data.status === "CANCELED" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
                <div className="flex items-start gap-3">

                  <XCircle className="w-5 h-5 text-rose-600 mt-0.5" />

                  <div>
                    <p className="font-semibold text-rose-700">
                      Transfer Canceled
                    </p>

                    <p className="text-sm text-rose-700/80 mt-1">
                      This stock transfer has been canceled.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* General Information */}

            <Section title="General Information">

              <div className="grid grid-cols-2 gap-4">

                <FormField label="Transfer Number">
                  <ReadOnlyValue>
                    {data.reference_number}
                  </ReadOnlyValue>
                </FormField>

                <FormField label="Status">
                  <div className="h-[42px] flex items-center">
                    <TransferStatusBadge status={data.status} />
                  </div>
                </FormField>

                <FormField label="Product">
                  <ReadOnlyValue>
                    {data.product_name}
                  </ReadOnlyValue>
                </FormField>

                <FormField label="Created At">
                  <ReadOnlyValue>
                    {formatDateTime(data.created_at)}
                  </ReadOnlyValue>
                </FormField>

              </div>

            </Section>

                        {/* Warehouse Information */}

            <Section title="Warehouse Information">

              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">

                {/* Source */}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-center gap-2 mb-4">

                    <Warehouse className="w-5 h-5 text-navy-600" />

                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Source Warehouse
                    </span>

                  </div>

                  <p className="text-lg font-semibold text-slate-800">
                    {data.source_warehouse_name}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Stock will be deducted from this warehouse.
                  </p>

                </div>

                {/* Arrow */}

                <div className="flex justify-center">

                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">

                    <ArrowRight className="w-5 h-5 text-slate-500" />

                  </div>

                </div>

                {/* Destination */}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-center gap-2 mb-4">

                    <Warehouse className="w-5 h-5 text-emerald-600" />

                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Destination Warehouse
                    </span>

                  </div>

                  <p className="text-lg font-semibold text-slate-800">
                    {data.destination_warehouse_name}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Stock will be added to this warehouse.
                  </p>

                </div>

              </div>

            </Section>

            {/* Transfer Information */}

            <Section title="Transfer Information">

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    Transfer Quantity
                  </p>

                  <p className="mt-3 text-4xl font-bold text-blue-700">
                    {data.quantity}
                  </p>

                  <p className="text-sm text-blue-600 mt-1">
                    pcs
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Current Status
                  </p>

                  <div className="mt-3">
                    <TransferStatusBadge status={data.status} />
                  </div>

                  <p className="text-sm text-slate-500 mt-3">
                    Monitor the progress of this transfer through its current workflow status.
                  </p>

                </div>

              </div>

            </Section>

            {/* Timeline */}

            <Section title="Transfer Timeline">

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Created
                  </p>

                  <p className="mt-3 font-semibold text-slate-700">
                    {formatDateTime(data.created_at)}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Processed
                  </p>

                  <p className="mt-3 font-semibold text-slate-700">
                    {formatDateTime(data.processed_at)}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Completed
                  </p>

                  <p className="mt-3 font-semibold text-slate-700">
                    {formatDateTime(data.completed_at)}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Canceled
                  </p>

                  <p className="mt-3 font-semibold text-slate-700">
                    {formatDateTime(data.canceled_at)}
                  </p>

                </div>

              </div>

            </Section>

                      </div>

          {/* Footer */}

          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">

            {data.status === "CREATED" && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={onProcess}
                >
                  Process Transfer
                </Button>
              </>
            )}

            {data.status === "PROCESSED" && (
              <Button
                type="button"
                onClick={onComplete}
              >
                Complete Transfer
              </Button>
            )}

            {(data.status === "COMPLETED" ||
              data.status === "CANCELED") && (
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
              >
                Close
              </Button>
            )}

          </div>

        </div>

      </div>

    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Helper UI                                   */
/* -------------------------------------------------------------------------- */

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

function ReadOnlyValue({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[42px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      {children || "-"}
    </div>
  );
}