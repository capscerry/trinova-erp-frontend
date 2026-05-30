"use client";

import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;

  warehouse: {
    warehouse_id: number;
    warehouse_name: string;
  } | null;

  loading?: boolean;

  onClose: () => void;

  onConfirm: () => void;
}

export default function DeleteWarehouseModal({
  open,
  warehouse,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !warehouse)
    return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Delete Warehouse
        </h2>

        <p className="mt-4 text-sm text-gray-600">
          Apakah yakin ingin menghapus
          warehouse{" "}
          <span className="font-semibold">
            {warehouse.warehouse_name}
          </span>
          ?
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Deleting..."
              : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}