/**
 * activity-log.service.ts
 *
 * Centralised activity log for the ERP dashboard timeline.
 *
 * Strategy:
 *  1. Try GET /activity-log?limit=20 — the dedicated backend endpoint that
 *     records every important transaction (PO, GR, Invoice, Payment, etc.).
 *  2. If the endpoint is not available (404 / network error), fall back to
 *     polling the individual purchasing transaction endpoints and shaping them
 *     into ActivityLogEntry objects.
 *
 * All failures are swallowed gracefully — the timeline shows an empty state
 * rather than crashing the dashboard.
 */

import { api } from "@/lib/api";

import {
    mapProducts,
    mapCategories,
    mapSubcategories,
    mapWarehouses,
} from "./master-data.mapper";

import {
    mapPurchaseOrders,
    mapGoodsReceipts,
    mapPurchaseInvoices,
    mapPurchasePayments,
    mapPurchaseReturns,
    mapPurchaseDownPayments,
} from "./purchasing.mapper";

import {
  mapPurchaseRequisitions,
  mapStockTransfers,
  mapStockTransactions,
  mapOrderFulfillments,
} from "./inventory.mapper";

import {
    mapForecasts,
} from "./ai-inventory.mapper";

import {
    toIso,
    activityTypeLabel,
    statusFromActivityType,
} from "./helpers";

import { ActivityEntry } from "./types";

const REF_TABLE_HREF: Record<string, string> = {
  purchase_order:        "/pembelian/po",
  purchase_invoice:      "/pembelian/invoice",
  goods_receipt:         "/pembelian/gr",
  purchase_payment:      "/pembelian/payment",
  purchase_down_payment: "/pembelian/pdp",
  purchase_return:       "/pembelian/retur",
  purchase_requisition:  "/pembelian/pdp",
};

// ─── Backend endpoint mapper ──────────────────────────────────────────────────

/** Maps a raw row from GET /activity-log into a normalised ActivityLogEntry */
function mapBackendEntry(raw: any, index: number): ActivityEntry {
  const id = String(
    raw.id ??
    raw.activity_log_id ??
    `log-${index}-${Date.now()}`
  );
  const ownerModule =
    raw.module ??
    raw.Module ??
    "Purchasing";

  const actType: string =
    (raw.activityType ?? raw.activity_type ?? "").toLowerCase();
  const docType: string =
    raw.documentType ?? raw.document_type ?? raw.refTable ?? raw.ref_table ?? "";
  const docNumber: string =
    raw.documentNumber ?? raw.document_number ?? raw.refNumber ?? raw.ref_number ?? "";
  const title: string =
    raw.title ?? activityTypeLabel(actType);
  const description: string =
    raw.description ?? raw.Description ?? "";
  const createdAt: string =
    toIso(raw.createdAt ?? raw.created_at);
  const userName: string =
    raw.userName ?? raw.user_name ?? raw.UserName ?? "";
  const refTable: string =
    (raw.refTable ?? raw.ref_table ?? docType ?? "").toLowerCase().replace(/ /g, "_");
  const refId: number | null =
    raw.refId ?? raw.ref_id ?? null;

  return {

      id,

      ownerModule,

      visibleModules: [
          ownerModule,
      ],

      activityType: actType,

      documentType: docType,

      documentNumber: docNumber,

      title,

      description,

      createdAt,

      createdBy:
          userName || undefined,

      status:
          statusFromActivityType(actType),

      href:
          refTable && refId
              ? REF_TABLE_HREF[
                    refTable
                ]
              : undefined,
  };
}

const safeGet = async (url: string): Promise<any[]> => {
      try {
          const res = await api.get(url);
          const data = res.data;

          if (Array.isArray(data)) {
              return data;
          }

          if (Array.isArray(data?.data)) {
              return data.data;
          }

          // endpoint mengembalikan single object
          if (data && typeof data === "object") {
              return [data];
          }

          return [];
      } catch {
          return [];
      }
  };


// ─── Fallback: build from transaction endpoints ───────────────────────────────

async function buildInventoryActivities(): Promise<ActivityEntry[]> {

    const [
        products,
        categories,
        subcategories,
        warehouses,

        prs,

        stockTransfers,
        stockTransactions,
        orderFulfillments,

        forecasts,

    ] = await Promise.all([

        safeGet("/master-product"),
        safeGet("/master-product-category"),
        safeGet("/product-subcategories"),
        safeGet("/master-warehouse"),

        safeGet("/PurchaseRequisition"),

        safeGet("/StockTransfer"),
        safeGet("/StockTransaction"),
        safeGet("/OrderFulfillment"),

        safeGet("/DemandForecast/latest"),

    ]);

    const forecastList = Array.isArray(forecasts)
    ? forecasts
    : forecasts
        ? [forecasts]
        : [];

    const entries: ActivityEntry[] = [];

    mapProducts(entries, products);
    mapCategories(entries, categories);
    mapSubcategories(entries, subcategories);
    mapWarehouses(entries, warehouses);

    mapPurchaseRequisitions(entries, prs);

    mapStockTransfers(entries, stockTransfers);
    mapStockTransactions(entries, stockTransactions);
    mapOrderFulfillments(entries, orderFulfillments);

    mapForecasts(entries, forecastList);

    entries.sort(
        (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
    );

    return entries;
}

async function buildPurchasingActivities(): Promise<ActivityEntry[]> {

    const [
        pos,
        grs,
        invs,
        pays,
        rtns,
        dps,

    ] = await Promise.all([

        safeGet("/purchase-order"),
        safeGet("/goods-receipt"),
        safeGet("/purchase-invoice"),
        safeGet("/purchase-payment"),
        safeGet("/purchase-return"),
        safeGet("/purchase-down-payment"),

    ]);

    const entries: ActivityEntry[] = [];

    mapPurchaseOrders(entries, pos);
    mapGoodsReceipts(entries, grs);
    mapPurchaseInvoices(entries, invs);
    mapPurchasePayments(entries, pays);
    mapPurchaseReturns(entries, rtns);
    mapPurchaseDownPayments(entries, dps);

    entries.sort(
        (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
    );

    return entries;
}

async function buildAllActivities(): Promise<ActivityEntry[]> {

    const inventory =
        await buildInventoryActivities();

    const purchasing =
        await buildPurchasingActivities();

    return [

        ...inventory,

        ...purchasing,

    ].sort(

        (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()

    );

}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches the latest 20 activity log entries for the dashboard timeline.
 *
 * Tries the dedicated /activity-log endpoint first.  Falls back to polling
 * individual transaction endpoints if the dedicated endpoint is unavailable.
 * Never throws — returns an empty array on complete failure.
 */
export async function getRecentActivities(
    limit = 20,
    module?: string
): Promise<ActivityEntry[]> {

  try {
    // Attempt 1: dedicated activity log endpoint
    const res = await api.get(`/activity-log?limit=${limit}`);
    const data = Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data?.items ?? []);

    if (Array.isArray(data) && data.length > 0) {
      let mapped = data
          .map((item: any, i: number) => mapBackendEntry(item, i))
          .sort(
              (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
          );

      if (module) {
          mapped = mapped.filter((x) =>
              x.visibleModules.some(
                  (m) => m.toLowerCase() === module.toLowerCase()
              )
          );
      }

      // Backend log currently only records sales/purchasing events -- if a
      // module filter (e.g. "inventory") zeroes out every row, fall through
      // to the transaction-polling fallback below instead of reporting an
      // empty timeline.
      if (mapped.length > 0) {
          return mapped.slice(0, limit);
      }
    }
  } catch (err: any) {
    // 404 = endpoint not implemented yet — use fallback silently
    const status = err?.response?.status ?? err?.status;
    if (status !== 404) {
      console.warn("[ActivityLog] /activity-log request failed:", err?.message ?? err);
    }
  }

  // Attempt 2: build from individual transaction endpoints
  console.log("[ActivityLog] Falling back to transaction endpoint polling");
  try {
    let entries: ActivityEntry[] = [];

      switch (module?.toLowerCase()) {

          case "inventory":

              entries =
                  await buildInventoryActivities();

              break;

          case "purchasing":

              entries =
                  await buildPurchasingActivities();

              break;

          default:

              entries =
                  await buildAllActivities();

              break;
      }

      return entries.slice(0, limit);

  } catch (err) {
    console.error("[ActivityLog] Fallback also failed:", err);
    return [];
  }
}
