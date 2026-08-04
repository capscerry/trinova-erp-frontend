import {
    ActivityModules,
    ActivityStatuses,
    ActivityTypes,
} from "./activity-constants";

import type { ActivityEntry } from "./types";

import {
    rupiah,
    toIso,
} from "./helpers";

export function mapPurchaseRequisitions(
    entries: ActivityEntry[],
    requisitions: any[]
) {

    requisitions.forEach((r: any) => {

        const num =
            r.pr_number ??
            r.requisition_number ??
            `PR-${r.purchase_requisition_id ?? r.id}`;

        const status =
            (r.status ?? "").toUpperCase();

        entries.push({

            id:
                `pr-${r.purchase_requisition_id ?? r.id}`,

            ownerModule:
                ActivityModules.INVENTORY,

            visibleModules: [
                ActivityModules.INVENTORY,
                ActivityModules.PURCHASING,
            ],

            activityType:
                status === "APPROVED"
                    ? ActivityTypes.PURCHASE_REQUISITION_APPROVED
                    : status === "REJECTED"
                    ? ActivityTypes.PURCHASE_REQUISITION_REJECTED
                    : ActivityTypes.PURCHASE_REQUISITION_CREATED,

            documentType:
                "Purchase Requisition",

            documentNumber:
                num,

            title:
                `Purchase Requisition ${num}`,

            description:
                `${r.notes ?? r.description ?? "-"}`,

            createdAt:
                toIso(
                    r.request_date ??
                    r.created_at
                ),

            createdBy:
                r.created_by,

            status:
                status === "APPROVED"
                    ? ActivityStatuses.SUCCESS
                    : status === "REJECTED"
                    ? ActivityStatuses.ERROR
                    : ActivityStatuses.INFO,

            href:
                "/persediaan/purchase-requisition",

        });

    });

}

export function mapStockTransfers(
    entries: ActivityEntry[],
    stockTransfers: any[]
    ) {
    stockTransfers.forEach((r: any) => {
        const num =
        r.transfer_number ??
        r.reference_number ??
        `TRF-${r.stock_transfer_id ?? r.id}`;

        entries.push({
        id: `trf-${r.stock_transfer_id ?? r.id}`,

        ownerModule: ActivityModules.INVENTORY,

        visibleModules: [
            ActivityModules.INVENTORY,
        ],

        activityType:
            r.status === "COMPLETED"
            ? ActivityTypes.STOCK_TRANSFER_COMPLETED
            : r.status === "CANCELLED"
            ? ActivityTypes.STOCK_TRANSFER_CANCELLED
            : ActivityTypes.STOCK_TRANSFER_CREATED,

        documentType: "Stock Transfer",

        documentNumber: num,

        title: `Stock Transfer ${num}`,

        description:
            `Qty ${r.quantity}`,

        createdAt: toIso(
            r.created_at
        ),

        createdBy: r.created_by,

        status:
            r.status === "COMPLETED"
            ? ActivityStatuses.SUCCESS
            : r.status === "CANCELLED"
            ? ActivityStatuses.ERROR
            : ActivityStatuses.INFO,

        href: "/persediaan/stock-transfer",
        });
    });
}

export function mapStockTransactions(
    entries: ActivityEntry[],
    transactions: any[]
    ) {

    transactions.forEach((r: any) => {

        entries.push({

        id:
            `txn-${r.transaction_id}`,

        ownerModule:
            ActivityModules.INVENTORY,

        visibleModules: [
            ActivityModules.INVENTORY,
        ],

        activityType:
            r.transaction_type === "IN"
            ? ActivityTypes.INVENTORY_IN
            : r.transaction_type === "OUT"
            ? ActivityTypes.INVENTORY_OUT
            : r.transaction_type === "TRANSFER_IN"
            ? ActivityTypes.TRANSFER_IN
            : ActivityTypes.TRANSFER_OUT,

        documentType:
            "Inventory Transaction",

        documentNumber:
            r.reference_no,

        title:
            `${r.transaction_type} • ${r.product?.product_name ?? "-"}`,

        description:
            `${r.warehouse?.warehouse_name ?? "-"} • Qty ${r.quantity}`,

        createdAt:
            toIso(r.created_at),

        status:
            ActivityStatuses.INFO,

        href:
            "/persediaan/stock-transaction",
        });

    });

}

export function mapOrderFulfillments(
    entries: ActivityEntry[],
    fulfillments: any[]
    ) {

    fulfillments.forEach((r: any) => {

        entries.push({

        id:
            `ful-${r.movement_id ?? r.id}`,

        ownerModule:
            ActivityModules.SALES,

        visibleModules: [
            ActivityModules.SALES,
            ActivityModules.INVENTORY,
        ],

        activityType:
            ActivityTypes.ORDER_FULFILLMENT_COMPLETED,

        documentType:
            "Order Fulfillment",

        documentNumber:
            r.reference_number ?? "",

        title:
            `Order Fulfillment ${r.reference_number ?? ""}`,

        description:
            `${r.product_name ?? "-"} • Qty ${r.quantity}`,

        createdAt:
            toIso(
            r.movement_date ??
            r.created_at
            ),

        createdBy:
            r.created_by,

        status:
            ActivityStatuses.SUCCESS,

        href:
            "/persediaan/order-fulfillment",
        });

    });

}