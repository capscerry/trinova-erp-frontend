"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, FileDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  salesQuotationService,
  type SalesQuotation,
  type QuotationDetailItem,
} from "@/lib/services/penjualan.service";
import { type SalesOrderItem } from "./sales_order/SalesOrderType";

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuotationPickerModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  onConfirm: (
    items: SalesOrderItem[],
    quotation: { id: number; nomor: string ,alamat : string}
  ) => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function QuotationPickerModal({
  open, onClose, customerId, customerName, onConfirm,
}: QuotationPickerModalProps) {

  // ── State ────────────────────────────────────────────
  const [quotationList, setQuotationList]   = useState<SalesQuotation[]>([]);
  const [loadingList, setLoadingList]       = useState(false);

  const [selectedQId, setSelectedQId]       = useState<string | null>(null);
  const [detailItems, setDetailItems]       = useState<QuotationDetailItem[]>([]);
  const [loadingDetail, setLoadingDetail]   = useState(false);

  const [checkedIds, setCheckedIds]         = useState<Set<number>>(new Set());
  const [searchQuotation, setSearchQuotation] = useState("");

  // ── Fetch quotation list by customer ─────────────────
  useEffect(() => {
    if (!open || !customerId) return;

    // Reset state saat buka modal
    setSelectedQId(null);
    setDetailItems([]);
    setCheckedIds(new Set());
    setSearchQuotation("");

    const load = async () => {
      setLoadingList(true);
      try {
        const data = await salesQuotationService.getByCustomerId(customerId);
        setQuotationList(data);
      } catch (err) {
        console.error("Gagal memuat penawaran:", err);
        setQuotationList([]);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [open, customerId]);

  // ── Fetch detail when quotation selected ─────────────
  useEffect(() => {
    if (!selectedQId) { setDetailItems([]); setCheckedIds(new Set()); return; }

    const load = async () => {
      setLoadingDetail(true);
      try {
        const items = await salesQuotationService.getDetailItems(selectedQId);
        setDetailItems(items);
        // Default: semua tercentang
        setCheckedIds(new Set(items.map((_, i) => i)));
      } catch (err) {
        console.error("Gagal memuat detail penawaran:", err);
        setDetailItems([]);
      } finally {
        setLoadingDetail(false);
      }
    };
    load();
  }, [selectedQId]);

  // ── Filtered quotation list ──────────────────────────
  const filteredQuotations = useMemo(() => {
    if (!searchQuotation) return quotationList;
    const q = searchQuotation.toLowerCase();
    return quotationList.filter((qo) =>
      qo.nomor.toLowerCase().includes(q)
    );
  }, [quotationList, searchQuotation]);

  // ── Checkbox helpers ─────────────────────────────────
  const allChecked = detailItems.length > 0 && checkedIds.size === detailItems.length;
  const someChecked = checkedIds.size > 0;

  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(detailItems.map((_, i) => i)));
    }
  };

  const toggleItem = (index: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ── Confirm ──────────────────────────────────────────
  const handleConfirm = () => {
    if (detailItems.length === 0) return;

    const selectedQuotationData = quotationList.find((q) => q.id === selectedQId);

    const selectedItems: SalesOrderItem[] = detailItems
      .filter((_, i) => checkedIds.has(i))
      .map((qi) => ({
        id: crypto.randomUUID(),
        productId: qi.productId,
        productCode: qi.productCode,
        productName: qi.productName,
        deskripsi: "",
        qty: qi.qty,
        qtyTerkirim: 0,
        satuan: qi.satuan,
        harga: qi.harga,
        diskon: qi.discountPercent,
        subtotal: qi.harga * qi.qty * (1 - qi.discountPercent / 100),
        taxable: false,
      }));

    onConfirm(selectedItems, {
      id: Number(selectedQId),
      nomor: selectedQuotationData?.nomor ?? "",
      alamat : selectedQuotationData?.alamat ?? "",
    });
  };

  // ── Selected quotation label ─────────────────────────
  const selectedQuotation = quotationList.find((q) => q.id === selectedQId);

  // ── Escape to close ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60]" />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh]
                        flex flex-col border border-slate-200 overflow-hidden">

          {/* ── Header ────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3.5
                          bg-gradient-to-r from-sky-600 to-sky-500 shrink-0">
            <div className="flex items-center gap-2">
              <FileDown size={15} className="text-white/80" />
              <div>
                <h2 className="text-white font-semibold text-sm tracking-tight">
                  Salin dari Penawaran Penjualan
                </h2>
                <p className="text-sky-100 text-[11px] mt-0.5">
                  Pelanggan: <span className="font-semibold">{customerName}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center
                         text-sky-200 hover:text-white hover:bg-white/10 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Quotation selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pilih Penawaran
              </label>

              {/* Selected tag */}
              {selectedQuotation && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                                   bg-sky-100 text-sky-700 text-xs font-semibold">
                    {selectedQuotation.nomor}
                    <button onClick={() => setSelectedQId(null)}
                      className="hover:text-sky-900 transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                </div>
              )}

              {/* Search + dropdown */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuotation}
                  onChange={(e) => setSearchQuotation(e.target.value)}
                  placeholder={loadingList ? "Memuat penawaran..." : "Cari/Pilih Penawaran..."}
                  disabled={loadingList}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200
                             bg-white text-slate-700 placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400
                             disabled:opacity-50 transition-all"
                />
              </div>

              {/* Quotation list */}
              {!selectedQId && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {loadingList ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                      <Loader2 size={14} className="animate-spin" /> Memuat...
                    </div>
                  ) : filteredQuotations.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {quotationList.length === 0
                        ? "Belum ada penawaran untuk pelanggan ini"
                        : "Penawaran tidak ditemukan"}
                    </div>
                  ) : (
                    filteredQuotations.map((q) => (
                      <button key={q.id} type="button"
                        onClick={() => { setSelectedQId(q.id); setSearchQuotation(""); }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5
                                   text-left text-xs hover:bg-slate-50 border-b border-slate-100
                                   last:border-b-0 transition-colors">
                        <div>
                          <span className="font-mono font-semibold text-slate-700">{q.nomor}</span>
                          <span className="text-slate-400 ml-2">
                            {q.tanggal ? new Date(q.tanggal).toLocaleDateString("id-ID") : ""}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-600 shrink-0">
                          {formatRupiah(q.total)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── Product table ────────────────────────── */}
            {selectedQId && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Rincian Barang
                </label>

                {loadingDetail ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Memuat detail...
                  </div>
                ) : detailItems.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    Tidak ada produk pada penawaran ini
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
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[18%]">
                            Kode
                          </th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400">
                            Nama Barang
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[12%]">
                            Kuantitas
                          </th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-slate-400 w-[10%]">
                            Satuan
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[16%]">
                            Harga
                          </th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-slate-400 w-[10%]">
                            Diskon
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailItems.map((item, idx) => {
                          const isChecked = checkedIds.has(idx);
                          return (
                            <tr key={idx}
                              onClick={() => toggleItem(idx)}
                              className={cn(
                                "cursor-pointer transition-colors",
                                isChecked
                                  ? "bg-sky-50/60 hover:bg-sky-50"
                                  : "hover:bg-slate-50"
                              )}>
                              <td className="px-3 py-2.5">
                                <span className={cn(
                                  "w-4.5 h-4.5 rounded border flex items-center justify-center transition-all",
                                  isChecked
                                    ? "bg-sky-600 border-sky-600"
                                    : "bg-white border-slate-300"
                                )}>
                                  {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-slate-500">
                                {item.productCode || "—"}
                              </td>
                              <td className="px-3 py-2.5 font-medium text-slate-700">
                                {item.productName}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-600">
                                {item.qty}
                              </td>
                              <td className="px-3 py-2.5 text-slate-500">
                                {item.satuan}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-600">
                                {formatRupiah(item.harga)}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-500">
                                {item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}
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

          {/* ── Footer ────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3.5
                          border-t border-slate-100 bg-slate-50/60 shrink-0">
            <span className="text-xs text-slate-400">
              {checkedIds.size > 0
                ? `${checkedIds.size} produk dipilih`
                : "Pilih produk untuk dilanjutkan"}
            </span>

            <div className="flex items-center gap-2">
              <button onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600
                           bg-white border border-slate-200 rounded-lg
                           hover:bg-slate-100 transition-colors">
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={checkedIds.size === 0}
                className="px-5 py-2 text-xs font-semibold text-white
                           bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm
                           disabled:opacity-50 disabled:cursor-not-allowed
                           inline-flex items-center gap-1.5">
                <Check size={12} />
                Lanjut
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}