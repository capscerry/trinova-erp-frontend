export const ActivityModules = {
    PURCHASING: "Purchasing",
    INVENTORY: "Inventory",
    SALES: "Sales",
    AI: "AI",
    MASTER_DATA: "MasterData",
    AUTH: "Auth",
} as const;

export const ActivityStatuses = {
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error",
    INFO: "info",
} as const;

export const ActivityTypes = {
  // Master Data
    PRODUCT_CREATED: "product_created",
    PRODUCT_UPDATED: "product_updated",
    PRODUCT_DELETED: "product_deleted",

    CATEGORY_CREATED: "category_created",
    CATEGORY_UPDATED: "category_updated",
    CATEGORY_DELETED: "category_deleted",

    SUBCATEGORY_CREATED: "subcategory_created",
    SUBCATEGORY_UPDATED: "subcategory_updated",
    SUBCATEGORY_DELETED: "subcategory_deleted",

    WAREHOUSE_CREATED: "warehouse_created",
    WAREHOUSE_UPDATED: "warehouse_updated",
    WAREHOUSE_DELETED: "warehouse_deleted",

    // Purchasing
    PURCHASE_REQUISITION_CREATED: "purchase_requisition_created",
    PURCHASE_REQUISITION_APPROVED: "purchase_requisition_approved",
    PURCHASE_REQUISITION_REJECTED: "purchase_requisition_rejected",
    
    PURCHASE_ORDER_CREATED: "purchase_order_created",
    PURCHASE_ORDER_APPROVED: "purchase_order_approved", 
    GOODS_RECEIPT_COMPLETED: "goods_receipt_completed",
    PURCHASE_INVOICE_CREATED: "purchase_invoice_created",
    PURCHASE_PAYMENT_CREATED: "purchase_payment_created",
    PURCHASE_RETURN_CREATED: "purchase_return_created",
    PURCHASE_DOWN_PAYMENT_CREATED: "purchase_down_payment_created",

    // Inventory
    STOCK_TRANSFER_CREATED: "stock_transfer_created",
    STOCK_TRANSFER_COMPLETED: "stock_transfer_completed",
    STOCK_TRANSFER_CANCELLED: "stock_transfer_cancelled",

    INVENTORY_IN: "inventory_in",
    INVENTORY_OUT: "inventory_out",

    TRANSFER_IN: "transfer_in",
    TRANSFER_OUT: "transfer_out",

    // Sales
    SALES_QUOTATION_CREATED: "sales_quotation_created",
    SALES_ORDER_CREATED: "sales_order_created",
    SALES_INVOICE_CREATED: "sales_invoice_created",
    SALES_RECEIPT_CREATED: "sales_receipt_created",
    SALES_ORDER_RESERVED: "sales_order_reserved",
    ORDER_FULFILLMENT_COMPLETED: "order_fulfillment_completed",

    // AI
    FORECAST_GENERATED: "forecast_generated",
} as const;