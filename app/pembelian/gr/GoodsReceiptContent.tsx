"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { notify } from "@/lib/notify";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { Suspense } from "react";

import {
  getGoodsReceipts,
  createGoodsReceipt,
  createGoodsReceiptDetail,
  getPurchaseOrders,
  getPurchaseOrderDetails,
  getProducts,
} from "@/lib/services";

import GoodsReceiptFormModal, {
  GoodsReceiptFormData,
} from "@/components/modules/pembelian/GoodsReceiptFormModal";

import GoodsReceiptDetailModal from "@/components/modules/pembelian/GoodsReceiptDetailModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type GRStatus = "Received" | "Partial" | "Cancelled" | "Returned";

interface GoodsReceipt {
  id: string;
  purchase_order_id: number;
  receipt_number: string;
  receipt_date: string;
  created_at: string;
  po_number: string;
  received_by: string;
  status: GRStatus;
  transaction_name?: string;
  transaction_detail?: string;
}

interface PurchaseOrder {
  purchase_order_id: number;
  po_number: string;
  expected_date?: string | null;
  transaction_name?: string;
  transaction_detail?: string;
  status?: string;
  nomor_faktur_pajak?: string;
}

interface PurchaseOrderDetail {
  purchase_order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product?: { product_name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeArray = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) return d.data;
  }
  return [];
};

const formatDate = (d: string) => {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(d));
  } catch {
    return d ?? "-";
  }
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Received:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Partial:   "bg-amber-50 text-amber-700 border border-amber-200",
  Cancelled: "bg-rose-50 text-rose-600 border border-rose-200",
  Returned:  "bg-purple-50 text-purple-700 border border-purple-200",
};

function GRStatusBadge({ status }: { status: GRStatus }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
      {status ?? "-"}
    </span>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

const COLUMNS: Column<GoodsReceipt>[] = [
  {
    key: "receipt_number",
    label: "Receipt Number",
    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">{String(val ?? "-")}</span>
    ),
  },
  {
    key: "receipt_date",
    label: "Date",
    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap">{formatDate(String(val ?? ""))}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (val) => <GRStatusBadge status={(val as GRStatus) ?? "Received"} />,
  },
];

// ─── Page-level error banner ──────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-700">Gagal memuat data</p>
        <p className="text-xs text-red-600 mt-0.5">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
      >
        <RefreshCw size={12} /> Coba Lagi
      </button>
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────

function GoodsReceiptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [goodsReceipts, setGoodsReceipts]           = useState<GoodsReceipt[]>([]);
  const [purchaseOrders, setPurchaseOrders]          = useState<PurchaseOrder[]>([]);
  const [allPurchaseOrders, setAllPurchaseOrders]    = useState<PurchaseOrder[]>([]);
  const [purchaseOrderDetails, setPurchaseOrderDetails] = useState<PurchaseOrderDetail[]>([]);
  const [productMap, setProductMap]                  = useState<Record<number, string>>({});
  const [openModal, setOpenModal]                    = useState(false);
  const [openDetail, setOpenDetail]                  = useState(false);
  const [selectedGR, setSelectedGR]                  = useState<any>(null);
  const [preSelectedPOId, setPreSelectedPOId]        = useState<number | undefined>(undefined);
  // Page-level loading / error
  const [pageLoading, setPageLoading]                = useState(true);
  const [pageError, setPageError]                    = useState<string | null>(null);

  // ── Fetch GRs ──────────────────────────────────────────────────────────────
  const fetchGoodsReceipts = useCallback(async () => {
    try {
      console.log("[GR Page] Loading Goods Receipts...");
      const res = await getGoodsReceipts();
      const list = safeArray(res);
      const mapped: GoodsReceipt[] = list
        .filter((item: any) => item?.goods_receipt_id != null)
        .map((item: any) => ({
          id:               String(item.goods_receipt_id),
          purchase_order_id: Number(item.purchase_order_id ?? 0),
          receipt_number:   item.receipt_number ?? "-",
          receipt_date:     item.receipt_date ?? "",
          created_at:       item.created_at ?? item.receipt_date ?? "",
          po_number:        item.purchase_order?.po_number ?? "-",
          received_by:      item.received_by ?? "",
          status:           (item.status as GRStatus) ?? "Received",
          transaction_name: item.transaction_name ?? "",
          transaction_detail: item.transaction_detail ?? "",
        }));
      console.log(`[GR Page] Loaded ${mapped.length} Goods Receipt(s)`);
      setGoodsReceipts(mapped);
    } catch (err: any) {
      const msg = err?.message ?? "Gagal mengambil Goods Receipt";
      console.error("[GR Page] Goods Receipt retrieval failed:", msg);
      notify.error(msg);
      // Don't overwrite any existing list — keep stale data visible
    }
  }, []);

  // ── Fetch POs ──────────────────────────────────────────────────────────────
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      console.log("[GR Page] Loading Purchase Orders...");
      const res = await getPurchaseOrders();
      const list = safeArray(res);
      const mappedPOs: PurchaseOrder[] = list
        .filter((po: any) => po?.purchase_order_id != null)
        .map((po: any) => ({
          purchase_order_id: Number(po.purchase_order_id),
          po_number:         po.po_number ?? "",
          expected_date:     po.expected_date ?? null,
          transaction_name:  po.transaction_name ?? "",
          transaction_detail: po.transaction_detail ?? "",
          status:            po.status ?? "",
          nomor_faktur_pajak: po.nomor_faktur_pajak ?? "",
        }));
      const approvedPOs = mappedPOs.filter(po => po.status === "Approved");
      console.log(`[GR Page] Loaded ${mappedPOs.length} PO(s), ${approvedPOs.length} Approved`);
      setPurchaseOrders(approvedPOs);
      setAllPurchaseOrders(mappedPOs);
      return mappedPOs;
    } catch (err: any) {
      console.error("[GR Page] Purchase Order retrieval failed:", err?.message ?? err);
      return [];
    }
  }, []);

  // ── Fetch PO details ───────────────────────────────────────────────────────
  const fetchPurchaseOrderDetails = useCallback(
    async (pMap: Record<number, string> = productMap) => {
      try {
        console.log("[GR Page] Loading Purchase Order Details...");
        const res = await getPurchaseOrderDetails();
        const list: any[] = safeArray(res);
        const enriched: PurchaseOrderDetail[] = list
          .filter((item: any) => item?.product_id != null)
          .map((item: any) => ({
            purchase_order_id: Number(item.purchase_order_id ?? 0),
            product_id:        Number(item.product_id),
            quantity:          Number(item.quantity ?? 0),
            price:             Number(item.price ?? 0),
            subtotal:          Number(item.subtotal ?? 0),
            product: {
              product_name:
                pMap[Number(item.product_id)] ??
                item.product?.product_name ??
                `Product ${item.product_id}`,
            },
          }));
        console.log(`[GR Page] Loaded ${enriched.length} PO detail line(s)`);
        setPurchaseOrderDetails(enriched);
      } catch (err: any) {
        console.error("[GR Page] PO Details retrieval failed:", err?.message ?? err);
        // Non-fatal: GR list can still render without detail lines
      }
    },
    [productMap]
  );

  // ── Fetch products ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (): Promise<Record<number, string>> => {
    try {
      const raw = await getProducts();
      const list: any[] = safeArray(raw);
      const map: Record<number, string> = {};
      list.forEach((p: any) => {
        const id = Number(p.product_id ?? p.id);
        if (id) map[id] = p.product_name ?? p.name ?? "";
      });
      setProductMap(map);
      return map;
    } catch (err: any) {
      console.error("[GR Page] Products retrieval failed:", err?.message ?? err);
      return {};
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);
    try {
      await fetchGoodsReceipts();
      await fetchPurchaseOrders();
      const pMap = await fetchProducts();
      await fetchPurchaseOrderDetails(pMap);
    } catch (err: any) {
      const msg = err?.message ?? "Gagal memuat halaman Goods Receipt";
      console.error("[GR Page] Initial load failed:", msg);
      setPageError(msg);
    } finally {
      setPageLoading(false);
    }
  }, [fetchGoodsReceipts, fetchPurchaseOrders, fetchProducts, fetchPurchaseOrderDetails]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Auto-open modal when navigated from PO page with ?po_id= ──────────────
  useEffect(() => {
    const poId = searchParams.get("po_id");
    if (!poId || purchaseOrders.length === 0) return;
    const numericId = Number(poId);
    const po = purchaseOrders.find(p => p.purchase_order_id === numericId);
    if (!po) return;
    setPreSelectedPOId(numericId);
    setOpenModal(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrders]);

  // ── Submit GR ─────────────────────────────────────────────────────────────
  const handleSubmit = async (form: GoodsReceiptFormData) => {
    try {
      console.log("[GR Page] Creating Goods Receipt for PO:", form.purchase_order_id);
      const grResponse = await createGoodsReceipt({
        purchase_order_id: Number(form.purchase_order_id),
        receipt_number:    form.receipt_number,
        receipt_date:      form.receipt_date,
        received_by:       form.received_by ?? "",
        transaction_name:  form.transaction_name ?? "",
        transaction_detail: form.transaction_detail ?? "",
      });
      const goodsReceiptId: number = grResponse?.goods_receipt_id ?? 0;
      if (!goodsReceiptId) throw new Error("Server tidak mengembalikan ID Goods Receipt yang valid.");

      const detailItems = purchaseOrderDetails.filter(
        item => Number(item.purchase_order_id) === Number(form.purchase_order_id)
      );
      console.log(`[GR Page] Creating ${detailItems.length} GR detail line(s)...`);
      const failedItems: string[] = [];
      for (const item of detailItems) {
        try {
          await createGoodsReceiptDetail({
            goods_receipt_id: goodsReceiptId,
            product_id:       item.product_id,
            quantity:         Number(item.quantity ?? 0),
          });
        } catch (detailErr: any) {
          // Continue creating remaining lines, but track the failure -- a
          // silently-dropped line here means its stock never gets recorded
          // in stock_transaction / inventory_stock, so the user must know.
          const productName = item.product?.product_name ?? `Product ${item.product_id}`;
          failedItems.push(productName);
          console.error(
            `[GR Page] GR detail line failed — product_id ${item.product_id}:`,
            detailErr?.message ?? detailErr
          );
        }
      }

      // Refresh list to get backend-calculated status
      await fetchGoodsReceipts();

      if (failedItems.length > 0) {
        notify.warning(
          "Goods Receipt dibuat sebagian",
          `Gagal mencatat stok untuk: ${failedItems.join(", ")}. Item ini TIDAK akan muncul di Stock Transaction — coba edit ulang GR ini untuk mengulang item yang gagal.`
        );
      } else {
        notify.success("Goods Receipt berhasil dibuat");
      }
    } catch (err: any) {
      const msg = err?.message ?? "Gagal membuat Goods Receipt";
      console.error("[GR Page] handleSubmit failed:", msg, "| PurchaseOrderId:", form.purchase_order_id);
      notify.error(msg);
      throw err; // re-throw so the modal's own error handling can also respond
    }
  };

  // ── Excel export (unchanged logic, moved inline) ──────────────────────────
  const exportExcel = () => {
    const today = new Date().toISOString().slice(0, 10);
    const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
    const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
    const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
    const MED   = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
    const THIN  = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const sTitle  = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, fill: NAVY, border: MED };
    const sSub    = { font: { sz: 10, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "center", vertical: "center" }, fill: LGRAY, border: MED };
    const sColHdr = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: NAVY, border: MED };
    const sCell   = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center" }, fill: WHITE, border: THIN };
    const sTotLbl = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
    const sTotVal = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: "#,##0" };
    const ws: XLSX.WorkSheet = {};
    const COLS = 5;
    const C = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
    ws[C(0, 0)] = { v: "GOODS RECEIPT LIST", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(0, c)] = { v: "", t: "s", s: sTitle };
    ws[C(1, 0)] = { v: `Export Date: ${today}`, t: "s", s: sSub };
    for (let c = 1; c < COLS; c++) ws[C(1, c)] = { v: "", t: "s", s: sSub };
    for (let c = 0; c < COLS; c++) ws[C(2, c)] = { v: "", t: "s" };
    ["NO.", "RECEIPT NUMBER", "PO NUMBER", "DATE", "STATUS"].forEach((h, c) => {
      ws[C(3, c)] = { v: h, t: "s", s: sColHdr };
    });
    goodsReceipts.forEach((gr, i) => {
      const r = 4 + i;
      const matchedPO = allPurchaseOrders.find(po => po.purchase_order_id === Number(gr.purchase_order_id));
      const poNumber = matchedPO?.po_number ?? gr.po_number ?? "-";
      ws[C(r, 0)] = { v: i + 1, t: "n", s: sCell };
      ws[C(r, 1)] = { v: gr.receipt_number ?? "-", t: "s", s: sCell };
      ws[C(r, 2)] = { v: poNumber, t: "s", s: sCell };
      ws[C(r, 3)] = { v: formatDate(gr.receipt_date), t: "s", s: sCell };
      ws[C(r, 4)] = { v: gr.status ?? "-", t: "s", s: sCell };
    });
    const footerR = 4 + goodsReceipts.length + 1;
    for (let c = 0; c < 3; c++) ws[C(footerR, c)] = { v: "", t: "s", s: { fill: NAVY, border: MED } };
    ws[C(footerR, 3)] = { v: "TOTAL RECORDS", t: "s", s: sTotLbl };
    ws[C(footerR, 4)] = { v: goodsReceipts.length, t: "n", s: sTotVal };
    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: footerR, c: COLS - 1 } });
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    ];
    ws["!rows"] = [{ hpt: 36 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];
    ws["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Goods Receipt");
    XLSX.writeFile(wb, `Goods_Receipt_${today}.xlsx`);
  };

  return (
    <AppShell title="Goods Receipt" subtitle="Kelola penerimaan barang">
      <div className="flex justify-end mb-3">
        <Button variant="secondary" size="sm" onClick={exportExcel}>
          <Download size={14} className="mr-1.5" />
          Export Excel
        </Button>
      </div>

      {/* Page-level error banner with retry */}
      {pageError && <ErrorBanner message={pageError} onRetry={loadAll} />}

      <DataTable<GoodsReceipt>
        title="Daftar Goods Receipt"
        columns={COLUMNS}
        data={goodsReceipts}
        keyField="id"
        dateField="receipt_date"
        createdAtField="created_at"
        statusOptions={["Received", "Partial", "Cancelled", "Returned"]}
        addLabel="Tambah GR"
        onAdd={() => setOpenModal(true)}
        renderActions={(row) => (
          <div className="flex gap-1.5 justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/pembelian/gr/${row.id}`)}
            >
              Detail
            </Button>
          </div>
        )}
      />

      <GoodsReceiptFormModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setPreSelectedPOId(undefined);
        }}
        onSubmit={handleSubmit}
        purchaseOrders={purchaseOrders}
        purchaseOrderDetails={purchaseOrderDetails}
        initialPOId={preSelectedPOId}
        onNavigateToInvoice={() => router.push("/pembelian/invoice")}
      />

      <GoodsReceiptDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        data={selectedGR}
        onNavigateToPayment={() => router.push("/pembelian/payment")}
      />
    </AppShell>
  );
}

export default function GoodsReceiptContent() {
  return (
    <Suspense fallback={null}>
      <GoodsReceiptInner />
    </Suspense>
  );
}
