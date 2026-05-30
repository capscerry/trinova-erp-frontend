"use client";

type EmptyProductStateProps = {
  onAdd: () => void;
};

export default function EmptyProductState({
  onAdd,
}: EmptyProductStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20">
      <div className="mb-4 text-5xl">
        📦
      </div>

      <h2 className="text-xl font-semibold text-slate-700">
        Belum ada produk
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Tambahkan produk baru
        untuk mulai mengelola
        inventory
      </p>

      <button
        onClick={onAdd}
        className="mt-6 rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        Tambah Produk
      </button>
    </div>
  );
}