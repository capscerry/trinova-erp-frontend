"use client";

import { AppShell } from "@/components/layout";

import {
  DataTable,
  type Column,
} from "@/components/ui/DataTable";

import { Button } from "@/components/ui/Button";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { toast } from "sonner";

import {
  getGoodsReceipts,
  createGoodsReceipt,
  createGoodsReceiptDetail,
  getPurchaseOrders,
  getPurchaseOrderDetails,
} from "@/lib/services";

import GoodsReceiptFormModal, {
  GoodsReceiptFormData,
} from "@/components/modules/pembelian/GoodsReceiptFormModal";

import GoodsReceiptDetailModal from "@/components/modules/pembelian/GoodsReceiptDetailModal";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type GRStatus =
  | "Received"
  | "Partial"
  | "Cancelled";

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
}

interface PurchaseOrderDetail {
  purchase_order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product?: {
    product_name: string;
  };
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

// ─────────────────────────────────────────────────────────────
// STATUS
// ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Received:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  Partial:
    "bg-amber-50 text-amber-700 border border-amber-200",

  Cancelled:
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function GRStatusBadge({
  status,
}: {
  status: GRStatus;
}) {

  return (
    <span
      className={`
        inline-flex
        px-2.5
        py-1
        rounded-full
        text-xs
        font-semibold
        whitespace-nowrap
        ${STATUS_STYLE[status]}
      `}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// TABLE COLUMN
// ─────────────────────────────────────────────────────────────

const COLUMNS: Column<GoodsReceipt>[] = [

  {
    key: "receipt_number",
    label: "Receipt Number",

    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "receipt_date",
    label: "Date",

    render: (val) => (
      <span className="text-slate-600 whitespace-nowrap">
        {formatDate(String(val))}
      </span>
    ),
  },

  {
    key: "status",
    label: "Status",

    render: (val) => (
      <GRStatusBadge
        status={val as GRStatus}
      />
    ),
  },
];

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function GoodsReceiptPage() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const [goodsReceipts, setGoodsReceipts] =
    useState<GoodsReceipt[]>([]);

  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrder[]>([]);

  // Full PO list (all statuses) used for detail lookups
  const [allPurchaseOrders, setAllPurchaseOrders] =
    useState<PurchaseOrder[]>([]);

  const [purchaseOrderDetails, setPurchaseOrderDetails] =
    useState<PurchaseOrderDetail[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [openDetail, setOpenDetail] =
    useState(false);

  const [selectedGR, setSelectedGR] =
    useState<any>(null);

  // Pre-selected PO id when navigated from PO page
  const [preSelectedPOId, setPreSelectedPOId] =
    useState<number | undefined>(undefined);

  // ─────────────────────────────────────────────────────────
  // FETCH GR
  // ─────────────────────────────────────────────────────────

  const fetchGoodsReceipts = async () => {

    try {

      const res =
        await getGoodsReceipts();

      const list = Array.isArray(res)
        ? res
        : res.data;

      const mapped = list.map(
        (item: any) => ({
          id:
            item.goods_receipt_id.toString(),

          purchase_order_id:
            item.purchase_order_id,

          receipt_number:
            item.receipt_number,

          receipt_date:
            item.receipt_date,

          created_at:
            item.created_at ?? item.receipt_date,

          po_number:
            item.purchase_order?.po_number ||
            "-",

          received_by:
            item.received_by,

          status:
            item.status as GRStatus,

          transaction_name:
            item.transaction_name ?? "",

          transaction_detail:
            item.transaction_detail ?? "",
        })
      );

      setGoodsReceipts(mapped);

    } catch (error) {

      console.error(error);

      toast.error(
        "Gagal mengambil Goods Receipt"
      );
    }
  };
  // ─────────────────────────────────────────────────────────
  // FETCH PO
  // ─────────────────────────────────────────────────────────

  const fetchPurchaseOrders = async () => {

    try {

      const res =
        await getPurchaseOrders();

      const list = Array.isArray(res)
        ? res
        : res.data;

      const mappedPOs = list.map((po: any) => ({
        purchase_order_id: Number(po.purchase_order_id),
        po_number:         po.po_number ?? "",
        expected_date:     po.expected_date ?? null,
        transaction_name:  po.transaction_name ?? "",
        transaction_detail: po.transaction_detail ?? "",
        status:            po.status ?? "",
      }));

      // Approved POs for the create form dropdown
      const approvedPOs = mappedPOs.filter((po: any) => po.status === "Approved");

      setPurchaseOrders(approvedPOs);
      // Keep the full list for detail lookups regardless of status
      setAllPurchaseOrders(mappedPOs);

    } catch (error) {

      console.error(error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH PO DETAIL
  // ─────────────────────────────────────────────────────────

  const fetchPurchaseOrderDetails =
    async () => {

      try {

        const res =
          await getPurchaseOrderDetails();

        const list = Array.isArray(res)
          ? res
          : res.data;

        setPurchaseOrderDetails(list);

      } catch (error) {

        console.error(error);
      }
    };

  // ─────────────────────────────────────────────────────────
  // CREATE GR
  // ─────────────────────────────────────────────────────────

  const handleSubmit = async (
    form: GoodsReceiptFormData
  ) => {

    try {

      const grResponse =
        await createGoodsReceipt({
          purchase_order_id:
            Number(form.purchase_order_id),

          receipt_number:
            form.receipt_number,

          receipt_date:
            form.receipt_date,

          received_by:
            form.received_by,

          status:
            form.status,

          transaction_name:
            form.transaction_name ?? "",

          transaction_detail:
            form.transaction_detail ?? "",
        });

      console.log(
        "GR RESPONSE",
        grResponse
      );

      const goodsReceiptId =
        grResponse.goods_receipt_id;

      const detailItems =
        purchaseOrderDetails.filter(
          (item) =>
            Number(item.purchase_order_id) ===
            Number(form.purchase_order_id)
        );

      console.log(
        "DETAIL ITEMS",
        detailItems
      );

      for (const item of detailItems) {

        await createGoodsReceiptDetail({

          goods_receipt_id:
            goodsReceiptId,

          product_id:
            item.product_id,

          quantity:
            item.quantity,
        });
      }

      await fetchGoodsReceipts();

      toast.success(
        "Goods Receipt berhasil dibuat"
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "Gagal membuat Goods Receipt"
      );
    }
  };

  // ─────────────────────────────────────────────────────────
  // USE EFFECT
  // ─────────────────────────────────────────────────────────

  useEffect(() => {

    fetchGoodsReceipts();
    fetchPurchaseOrders();
    fetchPurchaseOrderDetails();

  }, []);

  // Auto-open create modal when navigated from PO page with ?po_id=
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

  // ─────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────

  return (
    <AppShell
      title="Goods Receipt"
      subtitle="Kelola penerimaan barang"
    >

      <DataTable<GoodsReceipt>
        title="Daftar Goods Receipt"
        columns={COLUMNS}
        data={goodsReceipts}
        keyField="id"
        dateField="receipt_date"
        createdAtField="created_at"
        statusOptions={["Received", "Partial", "Cancelled"]}

        addLabel="Tambah GR"

        onAdd={() => {
          setOpenModal(true);
        }}

        renderActions={(row) => (

          <div className="flex gap-1.5 justify-center">

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {

                const detailItems =
                  purchaseOrderDetails.filter(
                    (item) =>
                      Number(item.purchase_order_id) ===
                      Number(
                        row.purchase_order_id
                      )
                  );

                // Look up the PO to get authoritative po_number and transaction_name
                const matchedPO = allPurchaseOrders.find(
                  (po) => po.purchase_order_id === Number(row.purchase_order_id)
                );

                const resolvedPoNumber =
                  matchedPO?.po_number || row.po_number || "-";

                const resolvedTransactionName =
                  matchedPO?.transaction_name || row.transaction_name || "";

                const resolvedTransactionDetail =
                  matchedPO?.transaction_detail || row.transaction_detail || "";

                const mappedItems = detailItems.map(
                  (item) => ({
                    product_name:
                      item.product?.product_name ||
                      `Product ${item.product_id}`,

                    quantity:
                      item.quantity,

                    price:
                      item.price,

                    subtotal:
                      item.subtotal,
                  })
                );

                const totalAmount = mappedItems.reduce(
                  (sum, item) => sum + item.subtotal,
                  0
                );

                setSelectedGR({

                  receipt_number:
                    row.receipt_number,

                  receipt_date:
                    row.receipt_date,

                  po_number:
                    resolvedPoNumber,

                  received_by:
                    row.received_by,

                  status:
                    row.status,

                  purchase_order_id:
                    row.purchase_order_id,

                  transaction_name:
                    resolvedTransactionName,

                  transaction_detail:
                    resolvedTransactionDetail,

                  total_amount:
                    totalAmount,

                  items:
                    mappedItems,
                });

                setOpenDetail(true);
              }}
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
        purchaseOrderDetails={
          purchaseOrderDetails
        }
        initialPOId={preSelectedPOId}
        onNavigateToPayment={() => router.push("/pembelian/payment")}
      />

      <GoodsReceiptDetailModal
        open={openDetail}
        onClose={() =>
          setOpenDetail(false)
        }
        data={selectedGR}
        onNavigateToPayment={() => router.push("/pembelian/payment")}
      />

    </AppShell>
  );
}