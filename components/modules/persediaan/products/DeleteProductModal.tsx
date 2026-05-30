"use client";

import Modal from "@/components/ui/Modal";

import { Product } from "@/app/persediaan/produk/types";

type DeleteProductModalProps = {
  open: boolean;

  product: Product | null;

  loading?: boolean;

  onClose: () => void;

  onConfirm: () => void;
};

export default function DeleteProductModal({
  open,
  product,
  loading = false,
  onClose,
  onConfirm,
}: DeleteProductModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Hapus Produk"
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-600">
            Apakah kamu yakin ingin
            menghapus produk:
          </p>

          <div className="mt-3 rounded-xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-800">
              {product?.product_name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {product?.product_code}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Batal
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? "Menghapus..."
              : "Hapus"}
          </button>
        </div>
      </div>
    </Modal>
  );
}