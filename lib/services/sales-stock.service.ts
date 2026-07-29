import { api } from "@/lib/api";

interface InventoryStockApi {
  stock_id: number;
  product_id: number;
  warehouse_id: number;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  product?: {
    product_id?: number;
    product_name?: string;
    product_code?: string;
  };
  warehouse?: {
    warehouse_id?: number;
    warehouse_name?: string;
  };
}

export interface ProductWarehouseStock {
  stockId: number;
  productId: number;
  warehouseId: number;
  warehouseName: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface ProductStockSummary {
  productId: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  warehouses: ProductWarehouseStock[];
}

function mapStock(item: InventoryStockApi): ProductWarehouseStock {
  return {
    stockId: item.stock_id,
    productId: item.product_id,
    warehouseId: item.warehouse_id,
    warehouseName: item.warehouse?.warehouse_name ?? `Warehouse ${item.warehouse_id}`,
    qtyOnHand: Number(item.qty_on_hand ?? 0),
    qtyReserved: Number(item.qty_reserved ?? 0),
    qtyAvailable: Number(item.qty_available ?? 0),
  };
}

export const salesStockService = {
  async getByProduct(productId: number): Promise<ProductStockSummary> {
    const response = await api.get<InventoryStockApi[]>("/api/InventoryStock");
    const warehouses = (response.data ?? [])
      .filter((item) => Number(item.product_id) === Number(productId))
      .map(mapStock);

    return {
      productId,
      totalOnHand: warehouses.reduce((sum, item) => sum + item.qtyOnHand, 0),
      totalReserved: warehouses.reduce((sum, item) => sum + item.qtyReserved, 0),
      totalAvailable: warehouses.reduce((sum, item) => sum + item.qtyAvailable, 0),
      warehouses,
    };
  },
};
