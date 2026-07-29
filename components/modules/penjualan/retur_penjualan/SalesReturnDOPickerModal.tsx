"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, FileDown, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pengirimanPenjualanService,
  type PengirimanPenjualan,
  type PengirimanDetailItem,
} from "@/lib/services/pengiriman-penjualan.service";
import { salesReturnService } from "@/lib/services/sales-return.service";
import { normalizeSalesStatus } from "@/lib/sales-status";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SalesReturnPickerResultItem {
  productId: number;
  productCode: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  uomId?: number;
  satuan: string;
  maxReturnable: number;
  qtyReturn: number;
}

interface SalesReturnDOPickerModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  onConfirm: (
    delivery: PengirimanPenjualan,
    items: SalesReturnPickerResultItem[]
  ) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SalesReturnDOPickerModal({
  open,
  onClose,
  customerId,
  customerName,
  onConfirm,
}: SalesReturnDOPickerModalProps) {
  const [doList, setDoList] = useState<PengirimanPenjualan[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedDoId, setSelectedDoId] = useState<number | null>(null);
  const [detailItems, setDetailItems] = useState<PengirimanDetailItem[]>([]);
  const [returnableMap, setReturnableMap] = useState<Record<number, number>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [searchDo, setSearchDo] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [qtyReturn, setQtyReturn] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open || !customerId) return;

    setSelectedDoId(null);
    setDetailItems([]);
    setReturnableMap({});
    setSearchDo("");
    setCheckedIds(new Set());
    setQtyReturn({});

    const load = async () => {
      setLoadingList(true);
      try {
        const all = await pengirimanPenjualanService.getAll();
        setDoList(
          // Retur bisa terjadi kapan pun setelah barang keluar gudang — termasuk
          // setelah DO itu sudah di-invoice (bahkan sudah dibayar). Stok sudah
          // dipotong sejak DO dibuat, jadi satu-satunya status yang benar-benar
          // tidak boleh diretur adalah Cancelled (dianggap barang tidak pernah
          // jadi dikirim).
          all.filter(
            (item) =>
              item.customerId === customerId &&
              normalizeSalesStatus("delivery-order", item.status) !== "Cancelled"
          )
        );
      } catch (err) {
        console.error("Gagal memuat delivery order:", err);
        setDoList([]);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [open, customerId]);

  useEffect(() => {
    if (!selectedDoId) {
      setDetailItems([]);
      setReturnableMap({});
      setCheckedIds(new Set());
      setQtyReturn({});
      return;
    }

    const load = async () => {
      setLoadingDetail(true);
      try {
        const [items, returnable] = await Promise.all([
          pengirimanPenjualanService.getDetailItems(selectedDoId),
          salesReturnService.getReturnableQty(selectedDoId),
        ]);
        setDetailItems(items);
        setReturnableMap(returnable);
        setCheckedIds(new Set());
        setQtyReturn({});
      } catch (err) {
        console.error("Gagal memuat detail delivery order:", err);
        setDetailItems([]);
        setReturnableMap({});
      } finally {
        setLoadingDetail(false);
      }
    };
    load();
  }, [selectedDoId]);

  const filteredDo = useMemo(() => {
    if (!searchDo) return doList;
    const q = searchDo.toLowerCase();
    return doList.filter((d) => d.noSuratJalan.toLowerCase().includes(q));
  }, [doList, searchDo]);

  const selectedDo = doList.find((d) => d.id === selectedDoId);

  const returnableItems = detailItems.map((item, idx) => ({
    item,
    idx,
    max: returnableMap[item.productId] ?? 0,
  }));

  const allChecked = returnableItems.length > 0 && checkedIds.size === returnableItems.filter((r) => r.max > 0).length;
  const someChecked = checkedIds.size > 0;

  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(returnableItems.filter((r) => r.max > 0).map((r) => r.idx)));
    }
  };

  const toggleItem = (idx: number, max: number) => {
    if (max <= 0) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleQtyChange = (idx: number, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(value, max));
    setQtyReturn((prev) => ({ ...prev, [idx]: clamped }));
  };

  const handleConfirm = () => {
    if (!selectedDo) return;

    const items: SalesReturnPickerResultItem[] = returnableItems
      .filter(({ idx }) => checkedIds.has(idx))
      .map(({ item, idx, max }) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        warehouseId: item.warehouseId ?? 0,
        warehouseName: item.warehouseName ?? "",
        uomId: item.uomId,
        satuan: item.satuan ?? "",
        maxReturnable: max,
        qtyReturn: qtyReturn[idx] ?? max,
      }));

    onConfirm(selectedDo, items);
  };

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
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60]"
      />

      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh]
                     flex flex-col border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 bg-linear-to-r from-emerald-600 to-emerald-500 shrink-0">
            <div className="flex items-center gap-2">
              <FileDown size={15} className="text-white/80" />
              <div>
                <h2 className="text-white font-semibold text-sm tracking-tight">
                  Pilih Delivery Order untuk Diretur
                </h2>
                <p className="text-emerald-100 text-[11px] mt-0.5">
                  Pelanggan: <span className="font-semibold">{customerName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pilih Delivery Order
              </label>

              {selectedDo && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    {selectedDo.noSuratJalan}
                    <button
                      onClick={() => setSelectedDoId(null)}
                      className="hover:text-emerald-900 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                </div>
              )}

              {!selectedDoId && (
                <>
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchDo}
                      onChange={(e) => setSearchDo(e.target.value)}
                      placeholder={loadingList ? "Memuat delivery order..." : "Cari/Pilih Delivery Order..."}
                      disabled={loadingList}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200
                                 bg-white text-slate-700 placeholder-slate-400
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400
                                 disabled:opacity-50 transition-all"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {loadingList ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                        <Loader2 size={14} className="animate-spin" /> Memuat...
                      </div>
                    ) : filteredDo.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        {doList.length === 0
                          ? "Belum ada delivery order untuk pelanggan ini"
                          : "Delivery order tidak ditemukan"}
                      </div>
                    ) : (
                      filteredDo.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoId(d.id);
                            setSearchDo("");
                          }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5
                                     text-left text-xs hover:bg-slate-50 border-b border-slate-100
                                     last:border-b-0 transition-colors"
                        >
                          <span className="font-mono font-semibold text-slate-700">
                            {d.noSuratJalan}
                          </span>
                          <span className="text-slate-400">
                            {d.noSo || "Tanpa SO"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {selectedDoId && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Pilih Barang & Qty Retur
                </label>

                {loadingDetail ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Memuat detail...
                  </div>
                ) : returnableItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada produk pada delivery order ini
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2.5 w-10">
                            <button type="button" onClick={toggleAll}
                              className={cn(
                                "w-4.5 h-4.5 rounded border flex items-center justify-center transition-all",
                                allChecked
                                  ? "bg-emerald-600 border-emerald-600"
                                  : someChecked
                                    ? "bg-emerald-200 border-emerald-400"
                                    : "bg-white border-slate-300 hover:border-emerald-400"
                              )}>
                              {(allChecked || someChecked) && (
                                <Check size={10} className="text-white" strokeWidth={3} />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">
                            Nama Barang
                          </th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[18%]">
                            Gudang
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[14%]">
                            Sisa Bisa Retur
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[16%]">
                            Qty Retur
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {returnableItems.map(({ item, idx, max }) => {
                          const isChecked = checkedIds.has(idx);
                          const disabled = max <= 0;
                          return (
                            <tr
                              key={idx}
                              className={cn(
                                "transition-colors",
                                disabled ? "opacity-40" : isChecked ? "bg-emerald-50/60" : "hover:bg-slate-50"
                              )}
                            >
                              <td className="px-3 py-2.5">
                                <button type="button" onClick={() => toggleItem(idx, max)} disabled={disabled}
                                  className={cn(
                                    "w-4.5 h-4.5 rounded border flex items-center justify-center transition-all",
                                    isChecked
                                      ? "bg-emerald-600 border-emerald-600"
                                      : "bg-white border-slate-300",
                                    disabled && "cursor-not-allowed"
                                  )}>
                                  {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 font-medium text-slate-700">
                                {item.productName}
                                {item.satuan && (
                                  <span className="text-slate-400 ml-1 font-normal">({item.satuan})</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-slate-500">
                                {item.warehouseName || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-500">
                                {max}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={max}
                                  value={qtyReturn[idx] ?? max}
                                  disabled={!isChecked}
                                  onChange={(e) => handleQtyChange(idx, Number(e.target.value), max)}
                                  className="w-20 px-2 py-1 text-right text-xs rounded-md border border-slate-200
                                             focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400
                                             disabled:bg-slate-50 disabled:text-slate-400"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <span className="text-xs text-slate-400">
              {checkedIds.size > 0 ? `${checkedIds.size} barang dipilih` : "Pilih delivery order & barang untuk dilanjutkan"}
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
                disabled={!selectedDo || checkedIds.size === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <Check size={12} /> Gunakan Delivery Order Ini
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
