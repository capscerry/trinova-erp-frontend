"use client";

import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ExternalLink } from "lucide-react";

type TransferStatus =
  | "CREATED"
  | "PROCESSED"
  | "COMPLETED"
  | "CANCELED";


  const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
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
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function TransferStatusBadge({
  status,
}: {
  status: TransferStatus;
}) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status]}`}
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
  if (!data) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Transfer Detail"
    >
      <div className="space-y-6">

        {/* Header */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium mb-1">
              Transfer Number
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.reference_number}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Status
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              <TransferStatusBadge status={data.status} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Product
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.product_name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Quantity
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.quantity}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Source Warehouse
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.source_warehouse_name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Destination Warehouse
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {data.destination_warehouse_name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Created At
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {formatDateTime(data.created_at)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Processed At
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {formatDateTime(data.processed_at)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Completed At
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {formatDateTime(data.completed_at)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Canceled At
            </label>

            <div className="border rounded-lg px-3 py-2 bg-slate-50">
              {formatDateTime(data.canceled_at)}
            </div>
          </div>

        </div>

        {/* Footer */}

        <div className="flex justify-between items-center gap-2">

          {/* "Detail"/"View" sekarang langsung navigasi ke halaman
              /persediaan/transfer-barang/{id} -- modal ini dipertahankan
              untuk alur lain yang masih memakainya.
          {data.id != null && (
            <button
              type="button"
              onClick={() => window.open(`/persediaan/transfer-barang/${data.id}`, "_blank")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-navy-700 bg-gold-50 border border-gold-200 rounded-lg hover:bg-gold-100"
            >
              <ExternalLink size={14} />
              Lihat Halaman Detail Baru
            </button>
          )}
          */}

          <div className="flex gap-2">
          {data.status === "CREATED" && (
            <>
              <Button
                type="button"
                onClick={onCancel}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={onProcess}
              >
                Process
              </Button>
            </>
          )}

          {data.status === "PROCESSED" && (
            <Button
              type="button"
              onClick={onComplete}
            >
              Complete
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
    </Modal>
  );
}