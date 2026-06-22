"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  salesOrderService,
  type SalesOrder,
  type SalesOrderDetailItem,
} from "@/lib/services/penjualan.service";

// ─── Props ────────────────────────────────────────────────────────────────────
interface SalesOrderPickerModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  onConfirm: (so: {
    id: number;
    nomor: string;
    poNumber: string;
    alamat: string;
    keterangan: string;
    total: number;
  }) => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SalesOrderPickerModal({
  open,
  onClose,
  customerId,
  customerName,
  onConfirm,
}: SalesOrderPickerModalProps) {
  // ── State ────────────────────────────────────────────
  const [soList, setSoList] = useState<SalesOrder[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedSoId, setSelectedSoId] = useState<number | string | null>(null);
  const [detailItems, setDetailItems] = useState<SalesOrderDetailItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [searchSo, setSearchSo] = useState("");

  // ── Fetch SO list by customer ────────────────────────
  useEffect(() => {
    if (!open || !customerId) return;

    setSelectedSoId(null);
    setDetailItems([]);
    setSearchSo("");

    const load = async () => {
      setLoadingList(true);
      try {
        const data = await salesOrderService.getByCustomerId(customerId);
        setSoList(data);
      } catch (err) {
        console.error("Gagal memuat pesanan penjualan:", err);
        setSoList([]);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [open, customerId]);

  // ── Fetch detail when SO selected ────────────────────
  useEffect(() => {
    if (!selectedSoId) {
      setDetailItems([]);
      return;
    }

    const load = async () => {
      setLoadingDetail(true);
      try {
        const items = await salesOrderService.getDetailItems(selectedSoId);
        setDetailItems(items);
      } catch (err) {
        console.error("Gagal memuat detail pesanan:", err);
        setDetailItems([]);
      } finally {
        setLoadingDetail(false);
      }
    };
    load();
  }, [selectedSoId]);

  // ── Filtered SO list ──────────────────────────────────
  const filteredSo = useMemo(() => {
    if (!searchSo) return soList;
    const q = searchSo.toLowerCase();
    return soList.filter((s: SalesOrder) => s.nomor.toLowerCase().includes(q));
  }, [soList, searchSo]);

  const selectedSo = soList.find((s: SalesOrder) => s.id === selectedSoId);

  // ── Confirm ──────────────────────────────────────────
  const handleConfirm = () => {
    if (!selectedSo) return;

    onConfirm({
      id: Number(selectedSo.id),
      nomor: selectedSo.nomor,
      poNumber: selectedSo.poNumber ?? "",
      alamat: (selectedSo as any).alamat ?? "",
      keterangan: selectedSo.keterangan ?? "",
      total: selectedSo.total ?? 0,
    });
  };

  // ── Escape to close ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60]"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh]
                     flex flex-col border border-slate-200 overflow-hidden"
        >
          {/* ── Header ────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 shrink-0">
            <div className="flex items-center gap-2">
              <FileDown size={15} className="text-white/80" />
              <div>
                <h2 className="text-white font-semibold text-sm tracking-tight">
                  Ambil dari Pesanan Penjualan
                </h2>
                <p className="text-violet-100 text-[11px] mt-0.5">
                  Pelanggan: <span className="font-semibold">{customerName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-violet-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pilih Pesanan Penjualan
              </label>

              {/* Selected tag */}
              {selectedSo && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold">
                    {selectedSo.nomor}
                    <button
                      onClick={() => setSelectedSoId(null)}
                      className="hover:text-violet-900 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                </div>
              )}

              {/* Search + dropdown */}
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchSo}
                  onChange={(e) => setSearchSo(e.target.value)}
                  placeholder={loadingList ? "Memuat pesanan..." : "Cari/Pilih Pesanan Penjualan..."}
                  disabled={loadingList}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200
                             bg-white text-slate-700 placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400
                             disabled:opacity-50 transition-all"
                />
              </div>

              {/* SO list */}
              {!selectedSoId && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {loadingList ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                      <Loader2 size={14} className="animate-spin" /> Memuat...
                    </div>
                  ) : filteredSo.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {soList.length === 0
                        ? "Belum ada pesanan penjualan untuk pelanggan ini"
                        : "Pesanan tidak ditemukan"}
                    </div>
                  ) : (
                    filteredSo.map((so) => (
                      <button
                        key={so.id}
                        type="button"
                        onClick={() => {
                          setSelectedSoId(so.id);
                          setSearchSo("");
                        }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5
                                   text-left text-xs hover:bg-slate-50 border-b border-slate-100
                                   last:border-b-0 transition-colors"
                      >
                        <div>
                          <span className="font-mono font-semibold text-slate-700">
                            {so.nomor}
                          </span>
                          <span className="text-slate-400 ml-2">
                            {so.tanggal ? new Date(so.tanggal).toLocaleDateString("id-ID") : ""}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-600 shrink-0">
                          {formatRupiah(so.total)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── Preview item produk (read-only, info saja) ───────── */}
            {selectedSoId && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Rincian Barang
                </label>

                {loadingDetail ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Memuat detail...
                  </div>
                ) : detailItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada produk pada pesanan ini
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">
                            Nama Barang
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[14%]">
                            Qty
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[20%]">
                            Harga
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[20%]">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2.5 font-medium text-slate-700">
                              {item.productName}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-600">
                              {item.productQty}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-600">
                              {formatRupiah(item.productPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                              {formatRupiah(item.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[10px] text-slate-400">
                  Rincian ini hanya pratinjau — Uang Muka tidak mengubah isi pesanan.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <span className="text-xs text-slate-400">
              {selectedSo ? `Total Pesanan: ${formatRupiah(selectedSo.total)}` : "Pilih pesanan untuk dilanjutkan"}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedSo}
                className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                Gunakan Pesanan Ini
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}