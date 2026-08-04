// import {
//     ActivityModules,
//     ActivityStatuses,
//     ActivityTypes,
// } from "./activity-constants";

// import type { ActivityEntry } from "./types";

// import { toIso } from "./helpers";

// export function mapSalesOrders(
//     entries: ActivityEntry[],
//     salesOrders: any[]
// ) {

//     salesOrders.forEach((r: any) => {

//         entries.push({

//             id:
//                 `so-${r.sales_order_id ?? r.id}`,

//             ownerModule:
//                 ActivityModules.SALES,

//             visibleModules: [

//                 ActivityModules.SALES,

//                 ActivityModules.INVENTORY,

//             ],

//             activityType:
//                 ActivityTypes.SALES_ORDER_CREATED,

//             documentType:
//                 "Sales Order",

//             documentNumber:
//                 r.sales_order_number,

//             title:
//                 `Sales Order ${r.sales_order_number}`,

//             description:
//                 `${r.customer_name ?? "-"}`,

//             createdAt:
//                 toIso(
//                     r.order_date ??
//                     r.created_at
//                 ),

//             createdBy:
//                 r.created_by,

//             status:
//                 ActivityStatuses.SUCCESS,

//             href:
//                 "/penjualan/sales-order",

//         });

//     });

// }

