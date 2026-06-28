"use client";

import { AppShell } from "@/components/layout";
import { useEffect, useState } from "react";

import {
  getPurchaseOrders,
} from "@/lib/services/po.service";

import {
  getPurchaseDownPayments,
  createPurchaseDownPayment,
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

  const [downPayments, setDownPayments] =
    useState<any[]>([]);
  
  const [openModal, setOpenModal] =
    useState(false);

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

  return (
    <AppShell
    title="Purchase Down Payment"
    subtitle="Kelola uang muka pembelian"
    >
        <>
        <div className="flex justify-end mb-4">

            <button
            onClick={() =>
                setOpenModal(true)
            }
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

                    console.log(
                    "EDIT PDP",
                    row
                    );

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
        onClose={() =>
            setOpenModal(false)
        }
        purchaseOrders={purchaseOrders}
        onSubmit={async (data) => {

        try {

            await createPurchaseDownPayment(
            data
            );

            await fetchDownPayments();

            setOpenModal(false);

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
        />
    </AppShell>
  );
}