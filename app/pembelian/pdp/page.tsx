"use client";

import { AppShell } from "@/components/layout";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

type DPStatus = "Paid" | "Unpaid" | "Cancelled";

const DP_STATUS_STYLE: Record<DPStatus, string> = {
  Unpaid:    "bg-amber-50 text-amber-700 border border-amber-200",
  Paid:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Cancelled: "bg-rose-50 text-rose-600 border border-rose-200",
};

function DPStatusBadge({ status }: { status: string }) {
  const style =
    DP_STATUS_STYLE[status as DPStatus] ??
    "bg-slate-100 text-slate-600 border border-slate-200";
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
        ${style}
      `}
    >
      {status}
    </span>
  );
}

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
    render: (val: any) => <DPStatusBadge status={String(val)} />,
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

    // Full unfiltered PO list — used for nomor_faktur_pajak lookups
    // (the DP's PO may have advanced to Completed by the time Detail is opened)
    const [allPurchaseOrders, setAllPurchaseOrders] =
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

        // Only Approved POs are eligible for a Down Payment.
        const approvedOnly = (data as any[]).filter(
          (po: any) => po.status === "Approved"
        );

        setAllPurchaseOrders(data as any[]);
        setPurchaseOrders(approvedOnly);

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
      // Guard: if this PO already has a (non-cancelled) DP, don't auto-open
      const alreadyHasDP = downPayments.some(
        (dp: any) =>
          Number(dp.purchase_order_id) === Number(poId) &&
          dp.status !== "Cancelled"
      );
      if (alreadyHasDP) return;
      setEditRow(null);
      setOpenModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [purchaseOrders]);

  // ── Derived: POs eligible to receive a new DP ─────────────────────────────
  // Each PO may only be associated with ONE down payment. When creating a new
  // DP, exclude any approved PO that already has an existing (non-cancelled) DP.
  // When editing an existing DP, also include the PO it is currently linked to
  // so the select still shows the saved value.
  const eligiblePurchaseOrders = (() => {
    const takenPoIds = new Set(
      downPayments
        .filter((dp: any) => dp.status !== "Cancelled")
        .map((dp: any) => Number(dp.purchase_order_id))
    );
    const editPoId = editRow ? Number(editRow.purchase_order_id) : null;
    return purchaseOrders.filter(
      (po: any) =>
        !takenPoIds.has(Number(po.purchase_order_id)) ||
        Number(po.purchase_order_id) === editPoId
    );
  })();

  return (
    <AppShell
    title="Purchase Down Payment"
    subtitle="Kelola uang muka pembelian"
    >
        <>
        <div className="flex justify-end mb-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);

                const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
                const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
                const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
                const MED   = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
                const THIN  = { top: { style: "thin"   }, bottom: { style: "thin"   }, left: { style: "thin"   }, right: { style: "thin"   } };

                const sTitle    = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, fill: NAVY, border: MED };
                const sSub      = { font: { sz: 10, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "center", vertical: "center" }, fill: LGRAY, border: MED };
                const sColHdr   = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: NAVY, border: MED };
                const sCell     = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center" }, fill: WHITE, border: THIN };
                const sCellLeft = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "left",   vertical: "center" }, fill: WHITE, border: THIN };
                const sNum      = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right",  vertical: "center" }, fill: WHITE, border: THIN, numFmt: '#,##0' };
                const sTotLbl   = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
                const sTotVal   = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: '#,##0' };

                const formatDateCell = (d: string) =>
                  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));

                const ws: XLSX.WorkSheet = {};
                const COLS = 5;
                const C = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

                ws[C(0, 0)] = { v: "PURCHASE DOWN PAYMENT LIST", t: "s", s: sTitle };
                for (let c = 1; c < COLS; c++) ws[C(0, c)] = { v: "", t: "s", s: sTitle };

                ws[C(1, 0)] = { v: `Export Date: ${today}`, t: "s", s: sSub };
                for (let c = 1; c < COLS; c++) ws[C(1, c)] = { v: "", t: "s", s: sSub };

                for (let c = 0; c < COLS; c++) ws[C(2, c)] = { v: "", t: "s" };

                ["NO.", "DP NUMBER", "SUPPLIER", "PAYMENT DATE", "AMOUNT (Rp)"].forEach((h, c) => {
                  ws[C(3, c)] = { v: h, t: "s", s: sColHdr };
                });

                let grandTotal = 0;
                downPayments.forEach((dp: any, i: number) => {
                  const r = 4 + i;
                  ws[C(r, 0)] = { v: i + 1,                              t: "n", s: sCell };
                  ws[C(r, 1)] = { v: formatDPNumber(dp.dp_number),       t: "s", s: sCell };
                  ws[C(r, 2)] = { v: dp.supplier_name ?? "—",            t: "s", s: sCellLeft };
                  ws[C(r, 3)] = { v: dp.payment_date ? formatDateCell(dp.payment_date) : "—", t: "s", s: sCell };
                  ws[C(r, 4)] = { v: Number(dp.amount ?? 0),             t: "n", s: sNum };
                  grandTotal += Number(dp.amount ?? 0);
                });

                const footerR = 4 + downPayments.length + 1;
                for (let c = 0; c < 3; c++) ws[C(footerR, c)] = { v: "", t: "s", s: { fill: NAVY, border: MED } };
                ws[C(footerR, 3)] = { v: "TOTAL",    t: "s", s: sTotLbl };
                ws[C(footerR, 4)] = { v: grandTotal, t: "n", s: sTotVal };

                ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: footerR, c: COLS - 1 } });
                ws["!merges"] = [
                  { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
                  { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
                ];
                ws["!rows"]   = [{ hpt: 36 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];
                ws["!cols"]   = [{ wch: 5 }, { wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 20 }];

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Down Payment");
                XLSX.writeFile(wb, `Purchase_Down_Payment_${today}.xlsx`);
              }}
            >
              <Download size={14} className="mr-1.5" />
              Export Excel
            </Button>
        </div>


        <DataTable
            title="Daftar Purchase Down Payment"
            columns={COLUMNS}
            data={downPayments}
            keyField="purchase_down_payment_id"
            dateField="payment_date"
            createdAtField="created_at"
            nameField="supplier_name"

            addLabel="Tambah DP"

            onAdd={() => {
                setEditRow(null);
                setOpenModal(true);
            }}

            renderActions={(row: any) => (

            <div className="flex gap-1.5 justify-center">

                <Button
                variant="secondary"
                size="sm"
                onClick={() => {

                    setDetailData({
                    ...row,
                    dp_number: formatDPNumber(row.dp_number),
                    nomor_faktur_pajak:
                      allPurchaseOrders.find(
                        (po: any) => Number(po.purchase_order_id) === Number(row.purchase_order_id)
                      )?.nomor_faktur_pajak ?? "",
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
        purchaseOrders={eligiblePurchaseOrders}
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