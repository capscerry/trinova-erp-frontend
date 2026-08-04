import {
    ActivityModules,
    ActivityStatuses,
    ActivityTypes,
} from "./activity-constants";

import type { ActivityEntry } from "./types";

import { toIso } from "./helpers";

export function mapProducts(
    entries: ActivityEntry[],
    products: any[]
) {

    products.forEach((r: any) => {

        const action =
            (r.activity_type ??
            r.action ??
            "created")
            .toLowerCase();

        entries.push({

            id:
                `product-${r.product_id}`,

            ownerModule:
                ActivityModules.INVENTORY,

            visibleModules:[
                ActivityModules.INVENTORY,
            ],

            activityType:
                action === "updated"
                    ? ActivityTypes.PRODUCT_UPDATED
                    : action === "deleted"
                    ? ActivityTypes.PRODUCT_DELETED
                    : ActivityTypes.PRODUCT_CREATED,

            documentType:
                "Master Product",

            documentNumber:
                r.product_code,

            title:
                `${r.product_name}`,

            description:
                r.product_code,

            createdAt:
                toIso(
                    r.updated_at ??
                    r.created_at
                ),

            createdBy:
                r.updated_by ??
                r.created_by,

            status:
                ActivityStatuses.SUCCESS,

            href:
                "/persediaan/product",
        });

    });

}

export function mapCategories(
    entries: ActivityEntry[],
    categories: any[]
) {

    categories.forEach((r: any) => {

        const action =
            (r.activity_type ??
            "created")
            .toLowerCase();

        entries.push({

            id:
                `category-${r.category_id}`,

            ownerModule:
                ActivityModules.INVENTORY,

            visibleModules:[
                ActivityModules.INVENTORY,
            ],

            activityType:
                action === "updated"
                    ? ActivityTypes.CATEGORY_UPDATED
                    : action === "deleted"
                    ? ActivityTypes.CATEGORY_DELETED
                    : ActivityTypes.CATEGORY_CREATED,

            documentType:
                "Product Category",

            documentNumber:
                `${r.category_id}`,

            title:
                r.category_name,

            description:
                r.category_name,

            createdAt:
                toIso(
                    r.updated_at ??
                    r.created_at
                ),

            createdBy:
                r.updated_by ??
                r.created_by,

            status:
                ActivityStatuses.SUCCESS,

            href:
                "/persediaan/category",
        });

    });

}

export function mapSubcategories(
    entries: ActivityEntry[],
    subcategories: any[]
) {

    subcategories.forEach((r: any) => {

        const action =
            (r.activity_type ??
            "created")
            .toLowerCase();

        entries.push({

            id:
                `subcategory-${r.subcategory_id}`,

            ownerModule:
                ActivityModules.INVENTORY,

            visibleModules:[
                ActivityModules.INVENTORY,
            ],

            activityType:
                action === "updated"
                    ? ActivityTypes.SUBCATEGORY_UPDATED
                    : action === "deleted"
                    ? ActivityTypes.SUBCATEGORY_DELETED
                    : ActivityTypes.SUBCATEGORY_CREATED,

            documentType:
                "Product Subcategory",

            documentNumber:
                r.code,

            title:
                r.name,

            description:
                r.category?.category_name ??
                "",

            createdAt:
                toIso(
                    r.updated_at ??
                    r.created_at
                ),

            createdBy:
                r.updated_by ??
                r.created_by,

            status:
                ActivityStatuses.SUCCESS,

            href:
                "/persediaan/subcategory",
        });

    });

}

export function mapWarehouses(
    entries: ActivityEntry[],
    warehouses: any[]
) {

    warehouses.forEach((r: any) => {

        const action =
            (r.activity_type ??
            "created")
            .toLowerCase();

        entries.push({

            id:
                `warehouse-${r.warehouse_id}`,

            ownerModule:
                ActivityModules.INVENTORY,

            visibleModules:[
                ActivityModules.INVENTORY,
            ],

            activityType:
                action === "updated"
                    ? ActivityTypes.WAREHOUSE_UPDATED
                    : action === "deleted"
                    ? ActivityTypes.WAREHOUSE_DELETED
                    : ActivityTypes.WAREHOUSE_CREATED,

            documentType:
                "Warehouse",

            documentNumber:
                `${r.warehouse_id}`,

            title:
                r.warehouse_name,

            description:
                r.warehouse_type,

            createdAt:
                toIso(
                    r.updated_at ??
                    r.created_at
                ),

            createdBy:
                r.updated_by ??
                r.created_by,

            status:
                ActivityStatuses.SUCCESS,

            href:
                "/persediaan/warehouse",
        });

    });

}