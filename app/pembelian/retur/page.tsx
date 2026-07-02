"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";

import PurchaseReturnFormModal, {
  type PurchaseReturnFormData,
  type GoodsReceiptOption as FormGROption,
  type PODetailItem,
} from "@/components/modules/pembelian/PurchaseReturnFormModal";

import PurchaseReturnSettlementModal, {
  type PurchaseReturnRow,
  type PurchaseOrderOption,
  type GoodsReceiptOption as SettlementGROption,
  type PurchaseInvoiceOption,
  type SettlementPayload,
} from "@/components/modules/pembelian/PurchaseReturnSettlementModal";

import PurchaseReturnDetailModal from "@/components/modules/pembelian/PurchaseReturnDetailModal";

import { getGoodsReceipts } from "@/lib/services/gr.service";
import { getPurchaseOrders, getPurchaseOrderDetails } from "@/lib/services/po.service";
import { getPurchaseInvoices, getUnpaidInvoicesForReturn } from "@/lib/services/purchase-invoice.service";
import { restoreStock } from "@/lib/services/supplier-product.service";
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
  const [detailTarget, setDetailTarget] = useState<PurchaseReturn | null>(null);

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
      const res = await getGoodsReceipts();
      const list = Array.isArray(res) ? res : res.data;
      setGoodsReceipts(list.map((item: any) => ({
        goods_receipt_id:      item.goods_receipt_id,
        receipt_number:        item.receipt_number,
        purchase_order_id:     item.purchase_order_id ?? item.purchase_order?.purchase_order_id ?? 0,
        supplier_id:           item.purchase_order?.supplier_id ?? item.supplier_id ?? 0,
        supplier_name:         item.purchase_order?.supplier?.supplier_name ?? item.supplier_name ?? "",
        purchase_order_number: item.purchase_order?.po_number ?? item.po_number ?? item.purchase_order_number ?? "",
        total_amount:          item.total_amount ?? item.total ?? 0,
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
      const res = await getPurchaseOrderDetails();
      const list = Array.isArray(res) ? res : (res.data ?? []);
      setPODetails(list.map((item: any) => ({
        purchase_order_id: Number(item.purchase_order_id),
        product_id:        Number(item.product_id),
        product_name:      item.product?.product_name ?? item.product_name ?? undefined,
        quantity:          Number(item.quantity ?? 0),
        price:             Number(item.price ?? 0),
        subtotal:          Number(item.subtotal ?? 0),
      })));
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

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (data: PurchaseReturnFormData) => {
    try {
      await createPurchaseReturn(data);
      setOpenFormModal(false);
      notify.success("Purchase Return berhasil dibuat.");
      await loadReturns();
      await loadNextNumber();
    } catch {
      notify.error("Gagal membuat Purchase Return.");
      return;
    }

    // Restore stock for the specifically returned items
    try {
      const returnedItems = data.return_items ?? [];
      if (returnedItems.length === 0) return;

      const supplierId = Number(data.supplier_id ?? 0);

      const errors: string[] = [];
      for (const item of returnedItems) {
        if (!item.product_id) {
          errors.push(`Skipped item with missing product ID`);
          continue;
        }
        try {
          await restoreStock(item.product_id, supplierId, item.qty_return);
        } catch (e: any) {
          errors.push(`Product ID ${item.product_id}: ${e?.response?.data?.message ?? e?.message ?? "gagal"}`);
        }
      }

      if (errors.length > 0) {
        notify.warning(`Return dicatat, tetapi ${errors.length} item stok gagal dipulihkan.`);
        console.warn("[retur] stock restore errors:", errors);
      }
    } catch (err) {
      console.error("[retur] stock restore failed:", err);
      notify.warning("Purchase Return dicatat, tetapi pemulihan stok gagal.");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (row: PurchaseReturn) => {
    if (!confirm(`Hapus Purchase Return ${row.purchase_return_number}?`)) return;
    try {
      await deletePurchaseReturn(row.purchase_return_id);
      notify.success("Purchase Return berhasil dihapus.");
      await loadReturns();
    } catch {
      notify.error("Gagal menghapus Purchase Return.");
    }
  };

  // ── Settlement ─────────────────────────────────────────────────────────────

  const handleSettle = async (returnId: number, payload: SettlementPayload) => {
    try {
      switch (payload.type) {

        case "Accept Loss": {
          const { returnItems, returnAmount } = payload.data;
          const pr = returns.find((r) => r.purchase_return_id === returnId);
          const supplierId = pr?.supplier_id ?? 0;
          await resolveAcceptLoss(returnId, returnItems, supplierId, returnAmount);
          notify.success(
            `Retur ditutup — barang pengganti diterima, stok dipulihkan (Rp ${formatNumber(returnAmount)}).`
          );
          await loadReturns();
          break;
        }

        case "Next PO Deduction": {
          const { targetPOId, targetPONumber, deductionAmount, newPOTotal } = payload.data;
          await resolveNextPODeduction(returnId, targetPOId, targetPONumber, deductionAmount, newPOTotal);
          notify.success(
            `Potongan Rp ${formatNumber(deductionAmount)} dikunci pada PO ${targetPONumber}.`
          );
          await loadReturns();
          await loadPurchaseOrders(); // refresh PO totals
          break;
        }

        case "Cash Refund": {
          const { targetInvoiceId, targetInvoiceNumber, deductionAmount, returnDate } = payload.data;
          await confirmCashRefund(returnId, targetInvoiceId, targetInvoiceNumber, deductionAmount, returnDate);
          notify.success(
            `Refund dikonfirmasi — Rp ${formatNumber(deductionAmount)} dikreditkan ke invoice ${targetInvoiceNumber}.`
          );
          await loadReturns();
          await loadPurchaseInvoices(); // refresh invoice totals
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
                  onClick={() => setDetailTarget(row)}
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
        poDetails={poDetails}
        nextNumber={nextReturnNumber}
      />

      {/* Settlement modal */}
      <PurchaseReturnSettlementModal
        open={settlementTarget !== null}
        onClose={() => setSettlementTarget(null)}
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
        returnItems={(() => {
          // Derive return line items from the PO details matching the selected return's GR
          if (!settlementTarget) return [];
          const gr = goodsReceipts.find(
            (g) => g.goods_receipt_id === settlementTarget.goods_receipt_id
          );
          if (!gr) return [];
          return poDetails
            .filter((d) => Number(d.purchase_order_id) === Number(gr.purchase_order_id))
            .map((d) => ({
              product_id:    d.product_id,
              product_name:  d.product_name ?? `Produk #${d.product_id}`,
              qty_available: d.quantity,
              qty_return:    d.quantity, // all items returned
              unit_price:    d.price,
              subtotal:      d.quantity * d.price,
            }));
        })()}
      />
      {/* Detail modal — for settled returns */}
      <PurchaseReturnDetailModal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        data={detailTarget}
      />
    </AppShell>
  );
}
