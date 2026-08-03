import {
    ActivityModules,
    ActivityStatuses,
    ActivityTypes,
} from "./activity-constants";

import type { ActivityEntry } from "./types";

import {
    rupiah,
    statusFromActivityType,
    toIso,
} from "./helpers";

export function mapPurchaseOrders(
    entries: ActivityEntry[],
    purchaseOrders: any[]
) {
    purchaseOrders.forEach((r: any) => {
    const num = r.po_number ?? `PO-${r.purchase_order_id ?? r.id}`;
    const status: string = (r.status ?? "").toLowerCase();
    entries.push({
        id: `po-${r.purchase_order_id ?? r.id}`,
        ownerModule:
            ActivityModules.PURCHASING,

        visibleModules:[
            ActivityModules.PURCHASING,
            ActivityModules.INVENTORY
        ],
        activityType: status === "approved" ? "purchase_order_approved" : ActivityTypes.PURCHASE_ORDER_CREATED,
        documentType: "Purchase Order",
        documentNumber: num,
        title: `Purchase Order ${num}`,
        description: `Status: ${r.status ?? "–"} · Supplier: ${r.supplier?.supplier_name ?? r.supplier_name ?? "–"}`,
        createdAt: toIso(r.order_date ?? r.created_at),
        createdBy: r.created_by ?? undefined,
        status: status === "cancelled" ? ActivityStatuses.ERROR : status === "approved" || status === "completed" ? ActivityStatuses.SUCCESS : ActivityStatuses.INFO,
        href: "/pembelian/po",
    });
  });
}

export function mapGoodsReceipts(
    entries: ActivityEntry[],
    goodsReceipts: any[]
) {
    goodsReceipts.forEach((r: any) => {
    const num = r.receipt_number ?? `GR-${r.goods_receipt_id ?? r.id}`;
    entries.push({
        id: `gr-${r.goods_receipt_id ?? r.id}`,
        ownerModule:
            ActivityModules.PURCHASING,

        visibleModules:[
            ActivityModules.PURCHASING,
            ActivityModules.INVENTORY
        ],
        activityType: ActivityTypes.GOODS_RECEIPT_COMPLETED,
        documentType: "Goods Receipt",
        documentNumber: num,
        title: `Goods Receipt ${num}`,
        description: `Status: ${r.status ?? "–"} · PO: ${r.purchase_order?.po_number ?? r.po_number ?? "–"}`,
        createdAt: toIso(r.receipt_date ?? r.created_at),
        createdBy: r.received_by ?? undefined,
        status: r.status === "Cancelled" ? ActivityStatuses.ERROR : r.status === "Received" ? ActivityStatuses.SUCCESS : ActivityStatuses.INFO,
        href: "/pembelian/gr",
        });
    });
}

export function mapPurchaseInvoices(
    entries: ActivityEntry[],
    invoices: any[]
) {
    invoices.forEach((r: any) => {
    const num = r.invoice_number ?? `INV-${r.purchase_invoice_id ?? r.id}`;
    const outstanding = Number(r.outstanding_amount ?? 0);
    entries.push({
        id: `inv-${r.purchase_invoice_id ?? r.id}`,
        ownerModule:
            ActivityModules.PURCHASING,

        visibleModules:[
            ActivityModules.PURCHASING,
        ],
        activityType: ActivityTypes.PURCHASE_INVOICE_CREATED,
        documentType: "Purchase Invoice",
        documentNumber: num,
        title: `Purchase Invoice ${num}`,
        description: `Rp ${rupiah(Number(r.total_amount ?? 0))} · Outstanding: Rp ${rupiah(outstanding)} · ${r.supplier_name ?? "–"}`,
        createdAt: toIso(r.invoice_date ?? r.created_at),
        status: r.status === "Paid" ? ActivityStatuses.SUCCESS : r.status === "Cancelled" ? ActivityStatuses.ERROR : outstanding > 0 ? ActivityStatuses.WARNING : ActivityStatuses.INFO,
        href: "/pembelian/invoice",
        });
    });
}

export function mapPurchasePayments(
    entries: ActivityEntry[],
    payments: any[]
) {
    payments.forEach((r: any) => {
    const num = r.payment_number ?? `PAY-${r.purchase_payment_id ?? r.id}`;
    entries.push({
        id: `pay-${r.purchase_payment_id ?? r.id}`,
        ownerModule:
            ActivityModules.PURCHASING,

        visibleModules:[
            ActivityModules.PURCHASING,
        ],
        activityType: ActivityTypes.PURCHASE_PAYMENT_CREATED,
        documentType: "Purchase Payment",
        documentNumber: num,
        title: `Purchase Payment ${num}`,
        description: `Rp ${rupiah(Number(r.amount ?? 0))} · ${r.payment_method ?? "–"} · ${r.supplier_name ?? "–"}`,
        createdAt: toIso(r.payment_date ?? r.created_at),
        status: ActivityStatuses.SUCCESS,
        href: "/pembelian/payment",
        });
    });
}

export function mapPurchaseReturns(
    entries: ActivityEntry[],
    returns: any[]
) {
    returns.forEach((r: any) => {
    const num = r.purchase_return_number ?? `RTN-${r.purchase_return_id ?? r.id}`;
    entries.push({
        id: `rtn-${r.purchase_return_id ?? r.id}`,
        ownerModule:
            ActivityModules.PURCHASING,

        visibleModules:[
            ActivityModules.PURCHASING,
        ],
        activityType: ActivityTypes.PURCHASE_RETURN_CREATED,
        documentType: "Purchase Return",
        documentNumber: num,
        title: `Purchase Return ${num}`,
        description: `Rp ${rupiah(Number(r.total_amount ?? 0))} · Status: ${r.status ?? "–"} · ${r.supplier_name ?? "–"}`,
        createdAt: toIso(r.return_date ?? r.created_at),
        status: r.status === "Closed" ? ActivityStatuses.SUCCESS : r.status === "Cancelled" ? ActivityStatuses.ERROR : ActivityStatuses.WARNING,
        href: "/pembelian/retur",
        });
    });
}

export function mapPurchaseDownPayments(
    entries: ActivityEntry[],
    downPayments: any[]
) {
    downPayments.forEach((r: any) => {
    const num = r.dp_number ?? `DP-${r.purchase_down_payment_id ?? r.id}`;
    entries.push({
        id: `dp-${r.purchase_down_payment_id ?? r.id}`,
        ownerModule:
            ActivityModules.PURCHASING,

        visibleModules:[
            ActivityModules.PURCHASING,
        ],
        activityType: ActivityTypes.PURCHASE_DOWN_PAYMENT_CREATED,
        documentType: "Down Payment",
        documentNumber: num,
        title: `Down Payment ${num}`,
        description: `Rp ${rupiah(Number(r.amount ?? r.dp_amount ?? 0))} · Status: ${r.status ?? "–"} · ${r.supplier_name ?? "–"}`,
        createdAt: toIso(r.payment_date ?? r.dp_date ?? r.created_at),
        status: r.status === "Paid" ? ActivityStatuses.SUCCESS : r.status === "Cancelled" ? ActivityStatuses.ERROR : ActivityStatuses.WARNING,
        href: "/pembelian/pdp",
        });
    });
}