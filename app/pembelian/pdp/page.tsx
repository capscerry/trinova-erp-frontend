"use client";

import { AppShell } from "@/components/layout";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  getPurchaseOrders,
} from "@/lib/services/po.service";

import {
  getPurchaseDownPayments,
  createPurchaseDownPayment,
  updatePurchaseDownPayment,
  deletePurchaseDownPayment,
} from "@/lib/services/purchase-down-payment.service";

import PurchaseDownPaymentModal
from "@/components/modules/pembelian/PurchaseDownPaymentModal";

import PurchaseDownPaymentDetailModal
from "@/components/modules/pembelian/PurchaseDownPaymentDetailModal";

import { Button } from "@/components/ui/Button";

import { DataTable } from "@/components/ui/DataTable";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalises any DP number to the canonical DP-0000000000 format.
 * e.g. "DP000003", "DP-3", "3" → "DP-0000000003"
 */
const formatDPNumber = (raw: string | number): string => {
  const str = String(raw ?? "");
  const digits = str.replace(/^DP-?/i, "").replace(/\D/g, "");
  if (!digits) return str;
  return `DP-${digits.padStart(10, "0")}`;
};

// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: "dp_number",
    label: "DP Number",
    render: (val: any) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {formatDPNumber(String(val))}
      </span>
    ),
  },

  {
    key: "supplier_name",
    label: "Supplier",
  },

  {
    key: "amount",
    label: "DP Paid",

    render: (val: any) => (
      <span className="font-semibold text-slate-700">
        Rp {Number(val).toLocaleString("id-ID")}
      </span>
    ),
  },

  {
    key: "status",
    label: "Status",
  },
];

export default function PurchaseDownPaymentPage() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const [downPayments, setDownPayments] =
    useState<any[]>([]);
  
  const [openModal, setOpenModal] =
    useState(false);

  const [editRow, setEditRow] =
    useState<any>(null);

    const [purchaseOrders, setPurchaseOrders] =
    useState<any[]>([]);

    const [detailData, setDetailData] =
    useState<any>(null);

    const [openDetail, setOpenDetail] =
    useState(false);

    const fetchDownPayments =
    async () => {

        try {

        const res =
            await getPurchaseDownPayments();

        const data =
            Array.isArray(res)
            ? res
            : res.data;

        console.log(
            "PDP DATA",
            data
        );

        setDownPayments(data);

        } catch (error) {

        console.error(error);

        }
    };

    const fetchPurchaseOrders =
    async () => {

        try {

        const res =
            await getPurchaseOrders();

        const data =
            Array.isArray(res)
            ? res
            : res.data;

        console.log(
            "PO DATA",
            data
        );

        setPurchaseOrders(data);

        } catch (error) {

        console.error(error);

        }
    };

    useEffect(() => {

    fetchDownPayments();

    fetchPurchaseOrders();

    }, []);

    // Auto-open create modal when navigated from PO page with ?po_id=
    useEffect(() => {
      const poId = searchParams.get("po_id");
      if (!poId) return;
      // Wait for POs to load, then seed the form and open modal
      if (purchaseOrders.length === 0) return;
      const po = purchaseOrders.find(
        (p: any) => String(p.purchase_order_id) === poId
      );
      if (!po) return;
      setEditRow(null);
      setOpenModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [purchaseOrders]);

  return (
    <AppShell
    title="Purchase Down Payment"
    subtitle="Kelola uang muka pembelian"
    >
        <>
        <div className="flex justify-end mb-4">

            <button
            onClick={() => {
                setEditRow(null);
                setOpenModal(true);
            }}
            className="
                px-4
                py-2
                rounded-lg
                bg-navy-900
                text-gold-400
                text-sm
                font-semibold
            "
            >
            + Tambah DP
            </button>

        </div>

        <DataTable
            title="Daftar Purchase Down Payment"
            columns={COLUMNS}
            data={downPayments}
            keyField="purchase_down_payment_id"
            dateField="payment_date"
            createdAtField="created_at"
            nameField="supplier_name"

            renderActions={(row: any) => (

            <div className="flex gap-1.5 justify-center">

                <Button
                variant="secondary"
                size="sm"
                onClick={() => {

                    setDetailData({
                    ...row,
                    dp_number: formatDPNumber(row.dp_number),
                    });

                    setOpenDetail(true);

                }}
                >
                Detail
                </Button>

                <Button
                variant="ghost"
                size="sm"
                onClick={() => {

                    setEditRow(row);
                    setOpenModal(true);

                }}
                >
                Edit
                </Button>

                <Button
                variant="danger"
                size="sm"
                onClick={async () => {

                    const confirmed = confirm(
                    `Hapus Down Payment ${formatDPNumber(row.dp_number)}?`
                    );

                    if (!confirmed) return;

                    try {

                    await deletePurchaseDownPayment(
                        Number(row.purchase_down_payment_id)
                    );

                    await fetchDownPayments();

                    } catch (error) {

                    console.error(
                        "Gagal menghapus Down Payment",
                        error
                    );

                    }

                }}
                >
                Hapus
                </Button>

            </div>

            )}
        />
        </>
        <PurchaseDownPaymentModal
        open={openModal}
        onClose={() => {
            setOpenModal(false);
            setEditRow(null);
        }}
        purchaseOrders={purchaseOrders}
        editId={editRow?.purchase_down_payment_id ?? null}
        initialData={
            editRow
            ? {
                purchase_order_id: editRow.purchase_order_id,
                supplier_id:       editRow.supplier_id,
                payment_date:      editRow.payment_date?.slice(0, 10) ?? "",
                amount:            editRow.amount,
                payment_type:      editRow.payment_type ?? "Partial",
                notes:             editRow.notes ?? "",
                status:            editRow.status ?? "Paid",
                transaction_name:  editRow.transaction_name ?? "",
                transaction_detail: editRow.transaction_detail ?? "",
              }
            : (() => {
                const poId = searchParams.get("po_id");
                if (!poId) return null;
                const po = purchaseOrders.find(
                  (p: any) => String(p.purchase_order_id) === poId
                );
                if (!po) return null;
                const supplierId = Number(
                  po.supplier_id ?? po.supplier?.supplier_id ?? 0
                );
                return {
                  purchase_order_id:  po.purchase_order_id,
                  supplier_id:        supplierId,
                  payment_date:       new Date().toISOString().split("T")[0],
                  amount:             0,
                  payment_type:       "Partial",
                  notes:              "",
                  status:             "Paid",
                  transaction_name:   po.transaction_name ?? "",
                  transaction_detail: po.transaction_detail ?? "",
                };
              })()
        }
        onSubmit={async (data) => {

        try {

            if (editRow) {

            await updatePurchaseDownPayment(
                Number(editRow.purchase_down_payment_id),
                data
            );

            } else {

            await createPurchaseDownPayment(
                data
            );

            }

            await fetchDownPayments();

            setOpenModal(false);
            setEditRow(null);

        } catch (error) {

            console.error(error);

        }

        }}
        />

        <PurchaseDownPaymentDetailModal
        open={openDetail}
        onClose={() =>
            setOpenDetail(false)
        }
        data={detailData}
        onNavigateToGR={(poId, poNumber) => {
          router.push(
            `/pembelian/gr?po_id=${poId}&po_number=${encodeURIComponent(poNumber)}`
          );
        }}
        />
    </AppShell>
  );
}