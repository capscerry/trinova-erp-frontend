"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, FileDown, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  salesOrderService,
  type SalesOrder,
  type SalesOrderDetailItem,
} from "@/lib/services/penjualan.service";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PengirimanSOPickerResultItem {
  productId: number;
  productCode: string;
  productName: string;
  uomId?: number;
  satuan: string;
  qtyDipesan: number;
  qtyDikirim: number;
}

interface PengirimanSOPickerModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  onConfirm: (
    so: { id: number; nomor: string; poNumber: string; alamat: string },
    items: PengirimanSOPickerResultItem[]
  ) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PengirimanSOPickerModal({
  open,
  onClose,
  customerId,
  customerName,
  onConfirm,
}: PengirimanSOPickerModalProps) {
  const [soList, setSoList] = useState<SalesOrder[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedSoId, setSelectedSoId] = useState<number | string | null>(null);
  const [detailItems, setDetailItems] = useState<SalesOrderDetailItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [searchSo, setSearchSo] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [qtyKirim, setQtyKirim] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open || !customerId) return;

    setSelectedSoId(null);
    setDetailItems([]);
    setSearchSo("");
    setCheckedIds(new Set());
    setQtyKirim({});

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

  useEffect(() => {
    if (!selectedSoId) {
      setDetailItems([]);
      setCheckedIds(new Set());
      setQtyKirim({});
      return;
    }

    const load = async () => {
      setLoadingDetail(true);
      try {
        const items = await salesOrderService.getDetailItems(selectedSoId);
        console.log("🔍 [SO Picker] Detail items mentah dari API /sales-order/{id}:", items);
        setDetailItems(items);
        setCheckedIds(new Set(items.map((_, i) => i)));
        const initialQty: Record<number, number> = {};
        items.forEach((it, i) => { initialQty[i] = it.productQty; });
        setQtyKirim(initialQty);
      } catch (err) {
        console.error("Gagal memuat detail pesanan:", err);
        setDetailItems([]);
      } finally {
        setLoadingDetail(false);
      }
    };
    load();
  }, [selectedSoId]);

  const filteredSo = useMemo(() => {
    if (!searchSo) return soList;
    const q = searchSo.toLowerCase();
    return soList.filter((s: SalesOrder) => s.nomor.toLowerCase().includes(q));
  }, [soList, searchSo]);

  const selectedSo = soList.find((s: SalesOrder) => s.id === selectedSoId);

  const allChecked = detailItems.length > 0 && checkedIds.size === detailItems.length;
  const someChecked = checkedIds.size > 0;

  const toggleAll = () => {
    setCheckedIds(allChecked ? new Set() : new Set(detailItems.map((_, i) => i)));
  };

  const toggleItem = (index: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleQtyChange = (index: number, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(value, max));
    setQtyKirim((prev) => ({ ...prev, [index]: clamped }));
  };

  const handleConfirm = () => {
    if (!selectedSo) return;
    const selectedSoRecord = selectedSo as SalesOrder & { alamat?: string };

    const items: PengirimanSOPickerResultItem[] = detailItems
      .map((it, idx) => ({ it, idx }))
      .filter(({ idx }) => checkedIds.has(idx))
      .map(({ it, idx }) => ({
        productId: it.productId ?? 0,
        productCode: it.productCode ?? "",
        productName: it.productName,
        uomId: it.uomId,
        satuan: it.uomCode ?? "",
        qtyDipesan: it.productQty,
        qtyDikirim: qtyKirim[idx] ?? it.productQty,
      }));

    console.log("🔍 [SO Picker] Items yang dikirim ke onConfirm:", items);

    onConfirm(
      {
        id: Number(selectedSo.id),
        nomor: selectedSo.nomor,
        poNumber: selectedSo.poNumber ?? "",
        alamat: selectedSoRecord.alamat ?? "",
      },
      items
    );
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
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-sky-600 to-sky-500 shrink-0">
            <div className="flex items-center gap-2">
              <FileDown size={15} className="text-white/80" />
              <div>
                <h2 className="text-white font-semibold text-sm tracking-tight">
                  Ambil dari Pesanan Penjualan
                </h2>
                <p className="text-sky-100 text-[11px] mt-0.5">
                  Pelanggan: <span className="font-semibold">{customerName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sky-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pilih Pesanan Penjualan
              </label>

              {selectedSo && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-700 text-xs font-semibold">
                    {selectedSo.nomor}
                    <button
                      onClick={() => setSelectedSoId(null)}
                      className="hover:text-sky-900 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                </div>
              )}

              {!selectedSoId && (
                <>
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
                                 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400
                                 disabled:opacity-50 transition-all"
                    />
                  </div>

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
                          <span className="font-mono font-semibold text-slate-700">
                            {so.nomor}
                          </span>
                          <span className="text-slate-400">
                            {so.tanggal ? new Date(so.tanggal).toLocaleDateString("id-ID") : ""}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {selectedSoId && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Pilih Barang & Qty Kirim
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
                          <th className="px-3 py-2.5 w-10">
                            <button type="button" onClick={toggleAll}
                              className={cn(
                                "w-4.5 h-4.5 rounded border flex items-center justify-center transition-all",
                                allChecked
                                  ? "bg-sky-600 border-sky-600"
                                  : someChecked
                                    ? "bg-sky-200 border-sky-400"
                                    : "bg-white border-slate-300 hover:border-sky-400"
                              )}>
                              {(allChecked || someChecked) && (
                                <Check size={10} className="text-white" strokeWidth={3} />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">
                            Nama Barang
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[16%]">
                            Qty Dipesan
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[20%]">
                            Qty Dikirim
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailItems.map((item, idx) => {
                          const isChecked = checkedIds.has(idx);
                          return (
                            <tr
                              key={idx}
                              className={cn(
                                "transition-colors",
                                isChecked ? "bg-sky-50/60" : "hover:bg-slate-50"
                              )}
                            >
                              <td className="px-3 py-2.5">
                                <button type="button" onClick={() => toggleItem(idx)}
                                  className={cn(
                                    "w-4.5 h-4.5 rounded border flex items-center justify-center transition-all",
                                    isChecked
                                      ? "bg-sky-600 border-sky-600"
                                      : "bg-white border-slate-300"
                                  )}>
                                  {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 font-medium text-slate-700">
                                {item.productName}
                                {item.uomCode && (
                                  <span className="text-slate-400 ml-1 font-normal">({item.uomCode})</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-500">
                                {item.productQty}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={item.productQty}
                                  value={qtyKirim[idx] ?? item.productQty}
                                  disabled={!isChecked}
                                  onChange={(e) => handleQtyChange(idx, Number(e.target.value), item.productQty)}
                                  className="w-20 px-2 py-1 text-right text-xs rounded-md border border-slate-200
                                             focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400
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
              {checkedIds.size > 0 ? `${checkedIds.size} barang dipilih` : "Pilih pesanan & barang untuk dilanjutkan"}
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
                disabled={!selectedSo || checkedIds.size === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <Check size={12} /> Gunakan Pesanan Ini
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
