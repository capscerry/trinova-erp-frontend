"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";

import PurchaseReturnFormModal, {
  type PurchaseReturnFormData,
  type GoodsReceiptOption as FormGROption,
  type ReturnLineItem,
} from "@/components/modules/pembelian/PurchaseReturnFormModal";

import PurchaseReturnSettlementModal, {
  type PurchaseReturnRow,
  type PurchaseOrderOption,
  type GoodsReceiptOption as SettlementGROption,
  type PurchaseInvoiceOption,
  type SettlementPayload,
} from "@/components/modules/pembelian/PurchaseReturnSettlementModal";

import PurchaseReturnDetailModal from "@/components/modules/pembelian/PurchaseReturnDetailModal";

import { getGoodsReceiptsForReturn, getAvailableReturnDetails } from "@/lib/services/gr.service";
import { getPurchaseOrders, getPurchaseOrderDetails } from "@/lib/services/po.service";
import { getProducts } from "@/lib/services/product.service";
import { getPurchaseInvoices, getUnpaidInvoicesForReturn } from "@/lib/services/purchase-invoice.service";
import {
  getPurchaseReturns,
  getNextReturnNumber,
  createPurchaseReturn,
  deletePurchaseReturn,
  resolveAcceptLoss,
  resolveNextPODeduction,
  confirmCashRefund,
} from "@/lib/services/purchase-return.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoodsReceiptOption extends FormGROption {}

/** PO detail line — used locally for unit_price resolution and settlement fallback */
interface PODetailItem {
  purchase_order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface PurchaseReturn {
  purchase_return_id: number;
  purchase_return_number: string;
  return_date: string;
  supplier_name: string;
  supplier_id: number;
  goods_receipt_id: number;
  purchase_order_number: string;
  settlement_option: string;
  status: string;
  total_amount: number;
  closing_condition: string;
  notes: string;
  transaction_name: string;
  transaction_detail: string;
  nomor_faktur_pajak?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(d));

const formatNumber = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const SETTLED_STATUSES = new Set(["Closed", "Deduction Locked"]);

function statusStyle(status: string): string {
  if (status === "Closed")                  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "Deduction Locked")        return "bg-violet-50 text-violet-700 border border-violet-200";
  if (status === "Awaiting Replacement")    return "bg-sky-50 text-sky-700 border border-sky-200";
  if (status === "Pending Deduction")       return "bg-violet-50 text-violet-600 border border-violet-200";
  if (status === "Refund Pending")          return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

// ─── Table columns ────────────────────────────────────────────────────────────

const COLUMNS: Column<PurchaseReturn>[] = [
  {
    key: "purchase_return_number", label: "Return #", width: "160px",
    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">{String(val)}</span>
    ),
  },
  {
    key: "return_date", label: "Tanggal", width: "110px",
    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap text-xs">{formatDate(String(val))}</span>
    ),
  },
  {
    key: "supplier_name", label: "Supplier", width: "200px",
    render: (val) => <span className="font-medium text-slate-700">{String(val)}</span>,
  },
  {
    key: "purchase_order_number", label: "PO #", width: "140px",
    render: (val) => <span className="font-mono text-xs text-slate-600">{String(val)}</span>,
  },
  {
    key: "settlement_option", label: "Settlement", width: "160px",
    render: (val) => <span className="text-xs text-slate-600">{String(val)}</span>,
  },
  {
    key: "status", label: "Status", width: "160px",
    render: (val) => (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusStyle(String(val))}`}>
        {String(val)}
      </span>
    ),
  },
  {
    key: "total_amount", label: "Total", width: "140px",
    render: (val) => (
      <span className="font-semibold text-slate-700 tabular-nums text-xs">
        {formatNumber(Number(val))}
      </span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceOption[]>([]);
  const [settlementInvoices, setSettlementInvoices] = useState<PurchaseInvoiceOption[]>([]);
  const [poDetails, setPODetails] = useState<PODetailItem[]>([]);
  const [nextReturnNumber, setNextReturnNumber] = useState<string>("");

  const [openFormModal, setOpenFormModal] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<PurchaseReturn | null>(null);
  const [settlementReturnItems, setSettlementReturnItems] = useState<ReturnLineItem[]>([]);
  const [detailTarget, setDetailTarget] = useState<PurchaseReturn | null>(null);

  // ── Confirm delete dialog ──────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; row: PurchaseReturn | null }>({
    open: false, row: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadReturns = async () => {
    try {
      const res = await getPurchaseReturns();
      const list = res.data ?? [];
      setReturns(list.map((item: any) => ({
        purchase_return_id:     item.purchase_return_id,
        purchase_return_number: item.purchase_return_number,
        return_date:            item.return_date,
        supplier_id:            item.supplier_id ?? item.goods_receipt?.purchase_order?.supplier_id ?? 0,
        supplier_name:          item.supplier_name ?? "",
        goods_receipt_id:       item.goods_receipt_id ?? 0,
        purchase_order_number:  item.purchase_order_number ?? "",
        settlement_option:      item.settlement_option ?? "",
        status:                 item.status ?? "",
        total_amount:           item.total_amount ?? 0,
        closing_condition:      item.closing_condition ?? "",
        notes:                  item.notes ?? "",
        transaction_name:       item.transaction_name ?? "",
        transaction_detail:     item.transaction_detail ?? "",
        nomor_faktur_pajak:     item.nomor_faktur_pajak ?? "",
      })));
    } catch {
      notify.error("Gagal memuat daftar Purchase Returns.");
    }
  };

  const loadNextNumber = async () => {
    try { setNextReturnNumber(await getNextReturnNumber()); }
    catch { setNextReturnNumber(""); }
  };

  const loadGoodsReceipts = async () => {
    try {
      // Only load GRs that have at least one line with remaining_qty > 0
      // so exhausted GRs never appear in the Purchase Return creation form.
      const res = await getGoodsReceiptsForReturn();
      const list = Array.isArray(res) ? res : res.data;
      setGoodsReceipts(list.map((item: any) => ({
        goods_receipt_id:      item.goods_receipt_id,
        receipt_number:        item.receipt_number,
        purchase_order_id:     item.purchase_order_id ?? item.purchase_order?.purchase_order_id ?? 0,
        supplier_id:           item.purchase_order?.supplier_id ?? item.supplier_id ?? 0,
        supplier_name:         item.purchase_order?.supplier?.supplier_name ?? item.supplier_name ?? "",
        purchase_order_number: item.purchase_order?.po_number ?? item.po_number ?? item.purchase_order_number ?? "",
        total_amount:          item.total_amount ?? item.total ?? 0,
        nomor_faktur_pajak:    item.nomor_faktur_pajak ?? item.purchase_order?.nomor_faktur_pajak ?? "",
      })));
    } catch {
      notify.error("Gagal memuat data Goods Receipt.");
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      const res = await getPurchaseOrders();
      const list = Array.isArray(res) ? res : res.data;
      setPurchaseOrders(list.map((item: any) => ({
        purchase_order_id: item.purchase_order_id,
        po_number:         item.po_number,
        supplier_id:       item.supplier_id,
        supplier_name:     item.supplier?.supplier_name ?? item.supplier_name ?? "",
        total_amount:      item.total_amount ?? 0,
        status:            item.status ?? "",
      })));
    } catch { /* non-fatal */ }
  };

  const loadPurchaseInvoices = async () => {
    try {
      const res = await getPurchaseInvoices();
      const list = Array.isArray(res) ? res : (res.data ?? []);
      setPurchaseInvoices(list.map((item: any) => ({
        invoice_id:        item.purchase_invoice_id ?? item.id,
        invoice_number:    item.invoice_number,
        goods_receipt_id:  item.goods_receipt_id,
        invoice_date:      (item.invoice_date ?? "").split("T")[0],
        supplier_name:     item.supplier_name ?? "",
        total_amount:      item.total_amount ?? 0,
        outstanding_amount: item.outstanding_amount ?? 0,
      })));
    } catch { /* non-fatal */ }
  };

  const loadUnpaidInvoicesForReturn = async (purchaseReturnId: number) => {
    try {
      const res = await getUnpaidInvoicesForReturn(purchaseReturnId);
      const list = Array.isArray(res) ? res : (res.data ?? []);
      setSettlementInvoices(list.map((item: any) => ({
        invoice_id:         item.purchase_invoice_id ?? item.id,
        invoice_number:     item.invoice_number,
        goods_receipt_id:   item.goods_receipt_id,
        invoice_date:       (item.invoice_date ?? "").split("T")[0],
        supplier_name:      item.supplier_name ?? "",
        total_amount:       item.total_amount ?? 0,
        outstanding_amount: item.outstanding_amount ?? 0,
      })));
    } catch {
      setSettlementInvoices([]);
    }
  };

  const loadPODetails = async () => {
    try {
      // Build product_id → product_name map from master products first
      let productNameMap: Record<number, string> = {};
      try {
        const products: any[] = await getProducts();
        products.forEach((p: any) => {
          productNameMap[Number(p.product_id ?? p.id)] = p.product_name ?? p.name ?? "";
        });
      } catch { /* non-fatal — names will fall back gracefully */ }

      const res = await getPurchaseOrderDetails();
      const list = Array.isArray(res) ? res : (res.data ?? []);
      setPODetails(list.map((item: any) => {
        const resolvedName =
          productNameMap[Number(item.product_id)] ??
          item.product?.product_name ??
          item.product_name ??
          undefined;
        return {
          purchase_order_id: Number(item.purchase_order_id),
          product_id:        Number(item.product_id),
          product_name:      resolvedName,
          quantity:          Number(item.quantity ?? 0),
          price:             Number(item.price ?? 0),
          subtotal:          Number(item.subtotal ?? 0),
        };
      }));
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    loadReturns();
    loadGoodsReceipts();
    loadNextNumber();
    loadPurchaseOrders();
    loadPurchaseInvoices();
    loadPODetails();
  }, []);

  // ── onLoadReturnItems — called by PurchaseReturnFormModal when user picks a GR

  /**
   * Fetches only the detail lines where remaining_qty > 0 for the selected GR,
   * then resolves unit_price from the already-loaded poDetails.
   * Returned items drive the product table in the creation form.
   */
  const handleLoadReturnItems = async (grId: number): Promise<ReturnLineItem[]> => {
    try {
      const res = await getAvailableReturnDetails(grId);
      const lines: any[] = Array.isArray(res) ? res : (res.data ?? []);

      return lines.map((line: any) => {
        // Look up unit price from poDetails — match by product_id across all POs
        // (the GR was created from one PO so the first match is always correct)
        const poLine = poDetails.find(
          (d) => Number(d.product_id) === Number(line.product_id)
        );
        const unitPrice = poLine?.price ?? 0;

        return {
          product_id:    Number(line.product_id),
          product_name:  line.product_name ?? `Produk #${line.product_id}`,
          qty_available: Number(line.quantity),       // original received qty
          remaining_qty: Number(line.remaining_qty),  // max the user can return
          qty_return:    0,
          unit_price:    unitPrice,
          subtotal:      0,
        } satisfies ReturnLineItem;
      });
    } catch {
      notify.error("Gagal memuat detail produk Goods Receipt.");
      return [];
    }
  };

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (data: PurchaseReturnFormData) => {
    // Serialize the selected return line items into transaction_detail so we
    // can recover them later when the settlement modal opens — without needing
    // a dedicated API endpoint.
    const itemsToStore = (data.return_items ?? []).filter((i) => i.qty_return > 0);
    const payload = {
      ...data,
      transaction_detail: JSON.stringify(itemsToStore),
    };

    try {
      await createPurchaseReturn(payload);
      setOpenFormModal(false);
      notify.success("Purchase Return berhasil dibuat.");
      await loadReturns();
      await loadNextNumber();
      await loadGoodsReceipts(); // refresh so exhausted GRs disappear from the picker
    } catch (err: any) {
      // Surface the backend's specific validation message when available
      const serverMsg: string | undefined =
        err?.response?.data?.message ??
        err?.data?.message ??
        err?.message;
      notify.error(serverMsg ?? "Gagal membuat Purchase Return.");
      return;
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (row: PurchaseReturn) => {
    setConfirmDelete({ open: true, row });
  };

  const executeDelete = async () => {
    if (!confirmDelete.row) return;
    setDeleteLoading(true);
    try {
      await deletePurchaseReturn(confirmDelete.row.purchase_return_id);
      notify.success("Purchase Return berhasil dihapus.");
      await loadReturns();
    } catch {
      notify.error("Gagal menghapus Purchase Return.");
    } finally {
      setDeleteLoading(false);
      setConfirmDelete({ open: false, row: null });
    }
  };

  // ── Settlement ─────────────────────────────────────────────────────────────

  const handleSettle = async (returnId: number, payload: SettlementPayload) => {
    try {
      const grId = settlementTarget?.goods_receipt_id ?? 0;

      switch (payload.type) {

        case "Accept Loss": {
          const { returnItems, returnAmount } = payload.data;
          await resolveAcceptLoss(returnId, returnItems, returnAmount, grId);
          notify.success(
            `Retur ditutup — barang pengganti diterima, stok dipulihkan (Rp ${formatNumber(returnAmount)}).`
          );
          await loadReturns();
          await loadGoodsReceipts(); // refresh: GR may now be exhausted
          break;
        }

        case "Next PO Deduction": {
          const { targetPOId, targetPONumber, deductionAmount, newPOTotal } = payload.data;
          await resolveNextPODeduction(returnId, targetPOId, targetPONumber, deductionAmount, newPOTotal, grId);
          notify.success(
            `Potongan Rp ${formatNumber(deductionAmount)} dikunci pada PO ${targetPONumber}.`
          );
          await loadReturns();
          await loadPurchaseOrders(); // refresh PO totals
          await loadGoodsReceipts(); // refresh: GR may now be exhausted
          break;
        }

        case "Cash Refund": {
          const { targetInvoiceId, targetInvoiceNumber, deductionAmount, returnDate } = payload.data;
          await confirmCashRefund(returnId, targetInvoiceId, targetInvoiceNumber, deductionAmount, returnDate, grId);
          notify.success(
            `Refund dikonfirmasi — Rp ${formatNumber(deductionAmount)} dikreditkan ke invoice ${targetInvoiceNumber}.`
          );
          await loadReturns();
          await loadPurchaseInvoices(); // refresh invoice totals
          await loadGoodsReceipts(); // refresh: GR may now be exhausted
          break;
        }
      }
    } catch (err: any) {
      console.error(err);
      notify.error(err?.message ?? "Gagal menyelesaikan retur.");
      throw err; // let modal spinner reset
    }
  };

  // ─── Export to Excel (list) ───────────────────────────────────────────────

  const exportToExcel = () => {
    const today = new Date().toISOString().slice(0, 10);

    const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
    const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
    const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
    const MED   = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
    const THIN  = { top: { style: "thin"   }, bottom: { style: "thin"   }, left: { style: "thin"   }, right: { style: "thin"   } };

    const sTitle  = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, fill: NAVY, border: MED };
    const sSub    = { font: { sz: 10, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "center", vertical: "center" }, fill: LGRAY, border: MED };
    const sColHdr = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: NAVY, border: MED };
    const sCell   = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center" }, fill: WHITE, border: THIN };
    const sCellL  = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "left",   vertical: "center" }, fill: WHITE, border: THIN };
    const sNum    = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right",  vertical: "center" }, fill: WHITE, border: THIN, numFmt: '#,##0' };
    const sTotLbl = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
    const sTotVal = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: '#,##0' };

    const ws: XLSX.WorkSheet = {};
    const COLS = 7;
    const C = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

    // Row 0: title
    ws[C(0, 0)] = { v: "PURCHASE RETURN LIST", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(0, c)] = { v: "", t: "s", s: sTitle };

    // Row 1: export date
    ws[C(1, 0)] = { v: `Export Date: ${today}`, t: "s", s: sSub };
    for (let c = 1; c < COLS; c++) ws[C(1, c)] = { v: "", t: "s", s: sSub };

    // Row 2: blank
    for (let c = 0; c < COLS; c++) ws[C(2, c)] = { v: "", t: "s" };

    // Row 3: column headers
    ["NO.", "RETURN NUMBER", "DATE", "SUPPLIER", "PO NUMBER", "SETTLEMENT", "TOTAL (Rp)"].forEach((h, c) => {
      ws[C(3, c)] = { v: h, t: "s", s: sColHdr };
    });

    // Data rows
    let grandTotal = 0;
    returns.forEach((ret, i) => {
      const r = 4 + i;
      ws[C(r, 0)] = { v: i + 1,                              t: "n", s: sCell  };
      ws[C(r, 1)] = { v: ret.purchase_return_number,         t: "s", s: sCell  };
      ws[C(r, 2)] = { v: formatDate(ret.return_date),        t: "s", s: sCell  };
      ws[C(r, 3)] = { v: ret.supplier_name,                  t: "s", s: sCellL };
      ws[C(r, 4)] = { v: ret.purchase_order_number || "—",   t: "s", s: sCell  };
      ws[C(r, 5)] = { v: ret.settlement_option || "—",       t: "s", s: sCell  };
      ws[C(r, 6)] = { v: ret.total_amount,                   t: "n", s: sNum   };
      grandTotal += ret.total_amount;
    });

    // Footer
    const footerR = 4 + returns.length + 1;
    for (let c = 0; c < 5; c++) ws[C(footerR, c)] = { v: "", t: "s", s: { fill: NAVY, border: MED } };
    ws[C(footerR, 5)] = { v: "TOTAL",      t: "s", s: sTotLbl };
    ws[C(footerR, 6)] = { v: grandTotal,   t: "n", s: sTotVal };

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: footerR, c: COLS - 1 } });
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    ];
    ws["!rows"]   = [{ hpt: 36 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];
    ws["!cols"]   = [{ wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Return");
    XLSX.writeFile(wb, `Purchase_Return_${today}.xlsx`);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Takes a parsed transaction_detail array and replaces any fallback
   * "Produk #N" names with the real product_name from the loaded poDetails.
   */
  const enrichReturnItemNames = (items: ReturnLineItem[]): ReturnLineItem[] =>
    items.map((item) => {
      const realName = poDetails.find((d) => d.product_id === item.product_id)?.product_name;
      return realName && !realName.startsWith("Produk #")
        ? { ...item, product_name: realName }
        : item;
    });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppShell title="Purchase Returns" subtitle="Kelola pengembalian pembelian">

      <div className="flex justify-end mb-3">
        <Button variant="secondary" size="sm" onClick={exportToExcel}>
          <Download size={14} className="mr-1.5" />
          Export Excel
        </Button>
      </div>

      <DataTable<PurchaseReturn>
        title="Daftar Purchase Returns"
        columns={COLUMNS}
        data={returns}
        addLabel="Tambah Purchase Return"
        onAdd={async () => { await loadNextNumber(); setOpenFormModal(true); }}
        keyField="purchase_return_id"
        nameField="supplier_name"
        renderActions={(row) => {
          const settled = SETTLED_STATUSES.has(row.status);
          return (
            <div className="flex gap-1.5 justify-center">
              {settled ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Enrich transaction_detail names before opening detail modal
                    try {
                      const parsed: ReturnLineItem[] = JSON.parse(row.transaction_detail ?? "[]");
                      if (Array.isArray(parsed) && parsed.length > 0) {
                        const enriched = enrichReturnItemNames(parsed);
                        setDetailTarget({ ...row, transaction_detail: JSON.stringify(enriched) });
                      } else {
                        setDetailTarget(row);
                      }
                    } catch {
                      setDetailTarget(row);
                    }
                  }}
                  title="Lihat detail retur"
                >
                  Lihat
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSettlementTarget(row);
                    loadUnpaidInvoicesForReturn(row.purchase_return_id);

                    // Parse the return line items that were serialized into
                    // transaction_detail when the return was created.
                    try {
                      const parsed: ReturnLineItem[] = JSON.parse(row.transaction_detail ?? "[]");
                      if (Array.isArray(parsed) && parsed.length > 0) {
                        setSettlementReturnItems(enrichReturnItemNames(parsed));
                      } else {
                        // Fallback: transaction_detail is not JSON (old record) —
                        // reconstruct from PO details using the full GR quantity.
                        const gr = goodsReceipts.find(
                          (g) => g.goods_receipt_id === row.goods_receipt_id
                        );
                        if (gr) {
                          setSettlementReturnItems(
                            poDetails
                              .filter((d) => Number(d.purchase_order_id) === Number(gr.purchase_order_id))
                              .map((d) => ({
                                product_id:    d.product_id,
                                product_name:  d.product_name ?? `Produk #${d.product_id}`,
                                qty_available: d.quantity,
                                remaining_qty: d.quantity, // fallback: assume all qty still returnable
                                qty_return:    d.quantity,
                                unit_price:    d.price,
                                subtotal:      d.quantity * d.price,
                              }))
                          );
                        } else {
                          setSettlementReturnItems([]);
                        }
                      }
                    } catch {
                      setSettlementReturnItems([]);
                    }
                  }}
                  title="Selesaikan retur ini"
                >
                  Selesaikan
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>
                Hapus
              </Button>
            </div>
          );
        }}
      />

      {/* Create return form */}
      <PurchaseReturnFormModal
        open={openFormModal}
        onClose={() => setOpenFormModal(false)}
        onSubmit={handleSubmit}
        goodsReceipts={goodsReceipts}
        onLoadReturnItems={handleLoadReturnItems}
        nextNumber={nextReturnNumber}
        purchaseOrders={purchaseOrders}
      />

      {/* Settlement modal */}
      <PurchaseReturnSettlementModal
        open={settlementTarget !== null}
        onClose={() => { setSettlementTarget(null); setSettlementReturnItems([]); }}
        onSettle={handleSettle}
        purchaseReturn={
          settlementTarget
            ? { ...settlementTarget, return_items: undefined }
            : null
        }
        purchaseOrders={purchaseOrders}
        goodsReceipts={goodsReceipts.map(
          (gr): SettlementGROption => ({
            goods_receipt_id: gr.goods_receipt_id,
            receipt_number:   gr.receipt_number,
            supplier_id:      gr.supplier_id,
            supplier_name:    gr.supplier_name,
          })
        )}
        purchaseInvoices={settlementInvoices}
        returnItems={settlementReturnItems}
      />
      {/* Detail modal — for settled returns */}
      <PurchaseReturnDetailModal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        data={detailTarget}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Hapus Purchase Return"
        message={`Yakin ingin menghapus Purchase Return ${confirmDelete.row?.purchase_return_number}?`}
        detail="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        loading={deleteLoading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ open: false, row: null })}
      />
    </AppShell>
  );
}
