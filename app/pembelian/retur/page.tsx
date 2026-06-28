"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

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

import GoodsReceiptFormModal, {
  type GoodsReceiptFormData,
} from "@/components/modules/pembelian/GoodsReceiptFormModal";

import { getGoodsReceipts, createGoodsReceipt, createGoodsReceiptDetail, getNextGRNumber } from "@/lib/services/gr.service";
import { getPurchaseOrders, getPurchaseOrderDetails } from "@/lib/services/po.service";
import { getPurchaseInvoices } from "@/lib/services/purchase-invoice.service";
import {
  getSupplierProducts,
  updateSupplierProduct,
} from "@/lib/services/supplier-product.service";
import {
  getPurchaseReturns,
  getNextReturnNumber,
  createPurchaseReturn,
  deletePurchaseReturn,
  resolveReplacement,
  resolveNextPODeduction,
  confirmCashRefund,
} from "@/lib/services/purchase-return.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoodsReceiptOption extends FormGROption {
  // FormGROption already has purchase_order_id
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

const formatNumber = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const SETTLED_STATUSES = new Set([
  "Closed",
  "Deduction Locked",
]);

function statusStyle(status: string): string {
  if (status === "Closed")
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "Deduction Locked")
    return "bg-violet-50 text-violet-700 border border-violet-200";
  if (status === "Awaiting Replacement")
    return "bg-sky-50 text-sky-700 border border-sky-200";
  if (status === "Pending Deduction")
    return "bg-violet-50 text-violet-600 border border-violet-200";
  if (status === "Refund Pending")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

// ─── Table columns ────────────────────────────────────────────────────────────

const COLUMNS: Column<PurchaseReturn>[] = [
  {
    key: "purchase_return_number",
    label: "Return #",
    width: "160px",
    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },
  {
    key: "return_date",
    label: "Tanggal",
    width: "110px",
    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap text-xs">
        {formatDate(String(val))}
      </span>
    ),
  },
  {
    key: "supplier_name",
    label: "Supplier",
    width: "200px",
    render: (val) => (
      <span className="font-medium text-slate-700">{String(val)}</span>
    ),
  },
  {
    key: "purchase_order_number",
    label: "PO #",
    width: "140px",
    render: (val) => (
      <span className="font-mono text-xs text-slate-600">{String(val)}</span>
    ),
  },
  {
    key: "settlement_option",
    label: "Settlement",
    width: "160px",
    render: (val) => (
      <span className="text-xs text-slate-600">{String(val)}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "160px",
    render: (val) => (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusStyle(
          String(val)
        )}`}
      >
        {String(val)}
      </span>
    ),
  },
  {
    key: "total_amount",
    label: "Total",
    width: "140px",
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
  const [poDetails, setPODetails] = useState<PODetailItem[]>([]);
  const [nextReturnNumber, setNextReturnNumber] = useState<string>("");

  // Modal state
  const [openFormModal, setOpenFormModal] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<PurchaseReturn | null>(null);

  // GR form modal — opened from Option A settlement
  const [openGRModal, setOpenGRModal] = useState(false);
  const [grPrefillPOId, setGRPrefillPOId] = useState<number | null>(null);
  const [grModalPOs, setGRModalPOs] = useState<any[]>([]);
  const [nextGRNumber, setNextGRNumber] = useState<string>("");

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadReturns = async () => {
    try {
      const res = await getPurchaseReturns();
      const list = res.data ?? [];
      const mapped: PurchaseReturn[] = list.map((item: any) => ({
        purchase_return_id: item.purchase_return_id,
        purchase_return_number: item.purchase_return_number,
        return_date: item.return_date,
        supplier_id:
          item.supplier_id ??
          item.goods_receipt?.purchase_order?.supplier_id ??
          0,
        supplier_name: item.supplier_name ?? "",
        goods_receipt_id: item.goods_receipt_id ?? 0,
        purchase_order_number: item.purchase_order_number ?? "",
        settlement_option: item.settlement_option ?? "",
        status: item.status ?? "",
        total_amount: item.total_amount ?? 0,
        closing_condition: item.closing_condition ?? "",
        notes: item.notes ?? "",
        transaction_name: item.transaction_name ?? "",
        transaction_detail: item.transaction_detail ?? "",
      }));
      setReturns(mapped);
    } catch {
      toast.error("Gagal memuat daftar Purchase Returns.");
    }
  };

  const loadNextNumber = async () => {
    try {
      const num = await getNextReturnNumber();
      setNextReturnNumber(num);
    } catch {
      setNextReturnNumber("");
    }
  };

  const loadGoodsReceipts = async () => {
    try {
      const res = await getGoodsReceipts();
      const list = Array.isArray(res) ? res : res.data;
      const mapped: GoodsReceiptOption[] = list.map((item: any) => ({
        goods_receipt_id: item.goods_receipt_id,
        receipt_number: item.receipt_number,
        purchase_order_id:
          item.purchase_order_id ??
          item.purchase_order?.purchase_order_id ??
          0,
        supplier_id:
          item.purchase_order?.supplier_id ?? item.supplier_id ?? 0,
        supplier_name:
          item.purchase_order?.supplier?.supplier_name ??
          item.supplier_name ??
          "",
        purchase_order_number:
          item.purchase_order?.po_number ??
          item.po_number ??
          item.purchase_order_number ??
          "",
        total_amount: item.total_amount ?? item.total ?? 0,
      }));
      setGoodsReceipts(mapped);
    } catch {
      toast.error("Gagal memuat data Goods Receipt.");
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      const res = await getPurchaseOrders();
      const list = Array.isArray(res) ? res : res.data;
      const mapped: PurchaseOrderOption[] = list.map((item: any) => ({
        purchase_order_id: item.purchase_order_id,
        po_number: item.po_number,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier?.supplier_name ?? item.supplier_name ?? "",
        total_amount: item.total_amount ?? 0,
        status: item.status ?? "",
      }));
      setPurchaseOrders(mapped);
    } catch {
      // Non-fatal
    }
  };

  const loadPurchaseInvoices = async () => {
    try {
      const res = await getPurchaseInvoices();
      const list = Array.isArray(res) ? res : (res.data ?? []);
      const mapped: PurchaseInvoiceOption[] = list.map((item: any) => ({
        invoice_id: item.purchase_invoice_id ?? item.id,
        invoice_number: item.invoice_number,
        goods_receipt_id: item.goods_receipt_id,
        invoice_date: (item.invoice_date ?? "").split("T")[0],
        supplier_name: item.supplier_name ?? "",
        total_amount: item.total_amount ?? 0,
      }));
      setPurchaseInvoices(mapped);
    } catch {
      // Non-fatal
    }
  };

  const loadPODetails = async () => {
    try {
      const res = await getPurchaseOrderDetails();
      const list = Array.isArray(res) ? res : (res.data ?? []);
      const mapped: PODetailItem[] = list.map((item: any) => ({
        purchase_order_id: Number(item.purchase_order_id),
        product_id: Number(item.product_id),
        product_name:
          item.product?.product_name ??
          item.product_name ??
          undefined,
        quantity: Number(item.quantity ?? 0),
        price: Number(item.price ?? 0),
        subtotal: Number(item.subtotal ?? 0),
      }));
      setPODetails(mapped);
    } catch {
      // Non-fatal — product picker falls back to product IDs
    }
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
      toast.success("Purchase Return berhasil dibuat.");
      await loadReturns();
      await loadNextNumber();
    } catch {
      toast.error("Gagal membuat Purchase Return.");
      return;
    }

    // ── Stock restoration (hard-reserve undo) ─────────────────────────────────
    // Only restore stock for the items actually returned (from return_items)
    try {
      const returnedItems = data.return_items ?? [];
      if (returnedItems.length === 0) return;

      const spRes = await getSupplierProducts();
      const spList: any[] = Array.isArray(spRes) ? spRes : spRes.data ?? [];

      const supplierId = Number(data.supplier_id ?? 0);
      const spMap = new Map<number, { spId: number; stock: number }>();
      for (const sp of spList) {
        const pid = Number(sp.product_id);
        const sid = Number(sp.supplier_id);
        const existing = spMap.get(pid);
        if (!existing || sid === supplierId) {
          spMap.set(pid, {
            spId: Number(sp.supplier_product_id),
            stock: Number(sp.available_stock ?? 0),
          });
        }
      }

      const restorationErrors: string[] = [];
      for (const item of returnedItems) {
        const pid = item.product_id;
        const qty = item.qty_return;
        const sp = spMap.get(pid);
        if (!sp || sp.spId === 0) {
          restorationErrors.push(`Product ID ${pid}: supplier-product not found`);
          continue;
        }
        try {
          await updateSupplierProduct(sp.spId, {
            available_stock: sp.stock + qty,
          });
        } catch (err: any) {
          restorationErrors.push(`Product ID ${pid}: ${err?.message ?? "gagal"}`);
        }
      }

      if (restorationErrors.length > 0) {
        toast.warning(
          `Return dicatat, tetapi ${restorationErrors.length} item stok gagal dipulihkan.`
        );
        console.warn("[retur] stock restoration errors:", restorationErrors);
      }
    } catch (err) {
      console.error("[retur] stock restoration failed:", err);
      toast.warning("Purchase Return dicatat, tetapi pemulihan stok gagal.");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (row: PurchaseReturn) => {
    if (!confirm(`Hapus Purchase Return ${row.purchase_return_number}?`)) return;
    try {
      await deletePurchaseReturn(row.purchase_return_id);
      toast.success("Purchase Return berhasil dihapus.");
      await loadReturns();
    } catch {
      toast.error("Gagal menghapus Purchase Return.");
    }
  };

  // ── Settlement ─────────────────────────────────────────────────────────────

  const handleSettle = async (
    returnId: number,
    payload: SettlementPayload
  ) => {
    try {
      switch (payload.type) {
        case "Replacement": {
          // 1. Close the return record
          await resolveReplacement(returnId);

          // 2. Close settlement modal first, then open GR form
          setSettlementTarget(null);

          // Find the PO id for this return's GR so we can pre-select it in the GR form
          const ret = returns.find((r) => r.purchase_return_id === returnId);
          let prefillPOId: number | null = null;
          if (ret) {
            const gr = goodsReceipts.find(
              (g) => g.goods_receipt_id === ret.goods_receipt_id
            );
            prefillPOId = gr?.purchase_order_id ?? null;
          }

          // Fetch approved POs for the GR modal
          const approvedPOs = purchaseOrders
            .filter((po) => po.status === "Approved")
            .map((po) => ({
              purchase_order_id: po.purchase_order_id,
              po_number: po.po_number,
              expected_date: null as string | null,
              transaction_name: "",
              transaction_detail: "",
            }));

          try {
            const grNumRes = await getNextGRNumber();
            setNextGRNumber(
              grNumRes?.receipt_number ?? grNumRes?.next_number ?? ""
            );
          } catch {
            setNextGRNumber("");
          }

          setGRModalPOs(approvedPOs);
          setGRPrefillPOId(prefillPOId);
          setOpenGRModal(true);

          toast.success(
            "Retur ditutup. Silakan isi Goods Receipt pengganti."
          );
          await loadReturns();
          break;
        }

        case "Next PO Deduction": {
          const inv = purchaseInvoices.find(
            (i) => i.invoice_id === payload.data.targetInvoiceId
          );
          await resolveNextPODeduction(
            returnId,
            payload.data.targetInvoiceId,
            payload.data.targetInvoiceNumber,
            payload.data.deductionAmount,
            inv?.total_amount ?? 0
          );
          toast.success(
            `Potongan Rp ${formatNumber(payload.data.deductionAmount)} diterapkan ke invoice ${payload.data.targetInvoiceNumber}.`
          );
          await loadReturns();
          await loadPurchaseInvoices();
          break;
        }

        case "Cash Refund": {
          const inv = purchaseInvoices.find(
            (i) => i.invoice_id === payload.data.targetInvoiceId
          );
          await confirmCashRefund(
            returnId,
            payload.data.targetInvoiceId,
            payload.data.targetInvoiceNumber,
            payload.data.deductionAmount,
            inv?.total_amount ?? 0
          );
          toast.success("Refund dikonfirmasi — invoice telah disesuaikan.");
          await loadReturns();
          await loadPurchaseInvoices();
          break;
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Gagal menyelesaikan retur.");
      throw err; // let modal's spinner reset
    }
  };

  // ── GR form submit (from Option A) ─────────────────────────────────────────

  const handleGRSubmit = async (form: GoodsReceiptFormData) => {
    try {
      const grRes = await createGoodsReceipt({
        purchase_order_id: Number(form.purchase_order_id),
        receipt_number: form.receipt_number,
        receipt_date: form.receipt_date,
        received_by: form.received_by,
        status: form.status,
        transaction_name: form.transaction_name,
        transaction_detail: form.transaction_detail,
      });

      const grId: number =
        grRes?.goods_receipt_id ?? grRes?.data?.goods_receipt_id;

      // Create GR detail lines for all PO items of the chosen PO
      if (grId) {
        const items = poDetails.filter(
          (d) => Number(d.purchase_order_id) === Number(form.purchase_order_id)
        );
        for (const item of items) {
          await createGoodsReceiptDetail({
            goods_receipt_id: grId,
            product_id: item.product_id,
            quantity_received: item.quantity,
            unit_price: item.price,
          });
        }
      }

      toast.success("Goods Receipt pengganti berhasil dibuat.");
      setOpenGRModal(false);
      await loadGoodsReceipts();
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat Goods Receipt pengganti.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Purchase Returns" subtitle="Kelola pengembalian pembelian">
      <DataTable<PurchaseReturn>
        title="Daftar Purchase Returns"
        columns={COLUMNS}
        data={returns}
        addLabel="Tambah Purchase Return"
        onAdd={async () => {
          await loadNextNumber();
          setOpenFormModal(true);
        }}
        keyField="purchase_return_id"
        nameField="supplier_name"
        renderActions={(row) => {
          const settled = SETTLED_STATUSES.has(row.status);
          return (
            <div className="flex gap-1.5 justify-center">
              <Button
                variant={settled ? "secondary" : "primary"}
                size="sm"
                onClick={() => setSettlementTarget(row)}
                title={settled ? "Retur sudah selesai" : "Selesaikan retur ini"}
              >
                {settled ? "Lihat" : "Selesaikan"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(row)}
              >
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
            ? {
                ...settlementTarget,
                // Pass serialised return_items if they were stored in notes
                return_items: undefined,
              }
            : null
        }
        purchaseOrders={purchaseOrders}
        goodsReceipts={goodsReceipts.map(
          (gr): SettlementGROption => ({
            goods_receipt_id: gr.goods_receipt_id,
            receipt_number: gr.receipt_number,
            supplier_id: gr.supplier_id,
            supplier_name: gr.supplier_name,
          })
        )}
        purchaseInvoices={purchaseInvoices}
      />

      {/* GR form — opened from Option A (Replacement) */}
      <GoodsReceiptFormModal
        open={openGRModal}
        onClose={() => setOpenGRModal(false)}
        onSubmit={handleGRSubmit}
        purchaseOrders={grModalPOs}
        purchaseOrderDetails={poDetails}
        initialPOId={grPrefillPOId ?? undefined}
        nextGRNumber={nextGRNumber}
      />
    </AppShell>
  );
}
