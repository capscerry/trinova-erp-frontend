"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import PurchaseReturnFormModal, {
  type PurchaseReturnFormData,
} from "@/components/modules/pembelian/PurchaseReturnFormModal";
import PurchaseReturnSettlementModal, {
  type PurchaseReturnRow,
  type PurchaseOrderOption,
  type GoodsReceiptOption as SettlementGROption,
  type PurchaseInvoiceOption,
  type SettlementPayload,
} from "@/components/modules/pembelian/PurchaseReturnSettlementModal";
import { getGoodsReceipts } from "@/lib/services/gr.service";
import { getPurchaseOrders } from "@/lib/services/po.service";
import { getPurchaseInvoices } from "@/lib/services/purchase-invoice.service";
import {
  getPurchaseReturns,
  getNextReturnNumber,
  createPurchaseReturn,
  deletePurchaseReturn,
  resolveReplacement,
  resolveNextPODeduction,
  confirmCashRefund,
  applyOpenCredit,
} from "@/lib/services/purchase-return.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoodsReceiptOption {
  goods_receipt_id: number;
  receipt_number: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_number: string;
  total_amount: number;
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
  "Credit Applied",
]);

function statusStyle(status: string): string {
  if (status === "Closed")
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "Deduction Locked")
    return "bg-violet-50 text-violet-700 border border-violet-200";
  if (status === "Credit Applied")
    return "bg-teal-50 text-teal-700 border border-teal-200";
  if (status === "Awaiting Replacement")
    return "bg-sky-50 text-sky-700 border border-sky-200";
  if (status === "Pending Deduction")
    return "bg-violet-50 text-violet-600 border border-violet-200";
  if (status === "Refund Pending")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  if (status === "Open Credit")
    return "bg-teal-50 text-teal-600 border border-teal-200";
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
  const [nextReturnNumber, setNextReturnNumber] = useState<string>("");

  // Modal state
  const [openFormModal, setOpenFormModal] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<PurchaseReturn | null>(null);

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
        // supplier_id lives on the related PO; fall back to a direct field if backend exposes it
        supplier_id:
          item.purchase_order?.supplier_id ??
          item.supplier_id ??
          0,
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
      // Non-fatal — PO list is only needed for Next PO Deduction panel
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
      }));
      setPurchaseInvoices(mapped);
    } catch {
      // Non-fatal — invoices are only needed for Cash Refund panel
    }
  };

  useEffect(() => {
    loadReturns();
    loadGoodsReceipts();
    loadNextNumber();
    loadPurchaseOrders();
    loadPurchaseInvoices();
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
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (row: PurchaseReturn) => {
    if (
      !confirm(`Hapus Purchase Return ${row.purchase_return_number}?`)
    )
      return;
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
        case "Replacement":
          await resolveReplacement(
            returnId,
            payload.data.replacementGRNumber
          );
          toast.success("Retur ditutup — barang pengganti dikonfirmasi.");
          break;

        case "Next PO Deduction":
          await resolveNextPODeduction(
            returnId,
            payload.data.targetPOId,
            payload.data.targetPONumber,
            payload.data.deductionAmount
          );
          toast.success(
            `Potongan Rp ${formatNumber(payload.data.deductionAmount)} dikunci pada PO ${payload.data.targetPONumber}.`
          );
          break;

        case "Cash Refund":
          await confirmCashRefund(
            returnId,
            payload.data.transferRef,
            payload.data.transferDate
          );
          toast.success("Refund dikonfirmasi — retur ditutup.");
          break;

        case "Open Credit":
          await applyOpenCredit(
            returnId,
            payload.data.supplierId,
            payload.data.creditAmount
          );
          toast.success(
            `Kredit Rp ${formatNumber(payload.data.creditAmount)} diposting ke profil vendor.`
          );
          break;
      }
      await loadReturns();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Gagal menyelesaikan retur.");
      // Re-throw so the modal's submitting spinner resets correctly
      throw err;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

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
              {/* Selesaikan — shown for all rows; shows checkmark badge if already settled */}
              <Button
                variant={settled ? "secondary" : "primary"}
                size="sm"
                onClick={() => setSettlementTarget(row)}
                title={
                  settled
                    ? "Retur sudah selesai"
                    : "Selesaikan retur ini"
                }
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

      {/* Create form */}
      <PurchaseReturnFormModal
        open={openFormModal}
        onClose={() => setOpenFormModal(false)}
        onSubmit={handleSubmit}
        goodsReceipts={goodsReceipts}
        nextNumber={nextReturnNumber}
      />

      {/* Settlement action modal */}
      <PurchaseReturnSettlementModal
        open={settlementTarget !== null}
        onClose={() => setSettlementTarget(null)}
        onSettle={handleSettle}
        purchaseReturn={settlementTarget as PurchaseReturnRow | null}
        purchaseOrders={purchaseOrders}
        goodsReceipts={goodsReceipts.map((gr) => ({
          goods_receipt_id: gr.goods_receipt_id,
          receipt_number: gr.receipt_number,
          supplier_id: gr.supplier_id,
          supplier_name: gr.supplier_name,
        } satisfies SettlementGROption))}
        purchaseInvoices={purchaseInvoices}
      />
    </AppShell>
  );
}
